import { describe, it, expect, vi, afterEach } from "vitest";
import type { Env } from "./env";
import { handleSubscribe, WELCOME_SUBJECT } from "./subscribe";

const limiter = (success = true) => ({ limit: vi.fn().mockResolvedValue({ success }) });

const env = (over: Partial<Env> = {}) =>
  ({
    SUBSCRIBE_LIMITER: limiter(),
    PLUNK_SECRET_KEY: "sk_test",
    PLUNK_FROM: "kevin@kevinjmagnan.com",
    PLUNK_FROM_NAME: "Kevin Magnan",
    PLUNK_REPLY_TO: "reply@example.com",
    ...over,
  }) as Env;

const post = (body: unknown, raw?: string, headers: Record<string, string> = {}) =>
  new Request("https://kevinjmagnan.com/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw ?? JSON.stringify(body),
  });

const none = () => new Response(JSON.stringify({ data: [], total: 0, hasMore: false }), { status: 200 });
const found = (email: string, subscribed: boolean) =>
  new Response(JSON.stringify({ data: [{ id: "c9", email, subscribed }], total: 1, hasMore: false }), { status: 200 });

const contactRes = (isNew: boolean) =>
  new Response(JSON.stringify({ id: "c1", _meta: { isNew, isUpdate: !isNew } }), { status: isNew ? 201 : 200 });

afterEach(() => vi.unstubAllGlobals());

describe("handleSubscribe", () => {
  it("rejects methods other than POST", async () => {
    const res = await handleSubscribe(new Request("https://kevinjmagnan.com/api/subscribe"), env());
    expect(res.status).toBe(405);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await handleSubscribe(post(null, "not json"), env());
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await handleSubscribe(post({ email: "nope" }), env());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid_email" });
  });

  it("quietly accepts honeypot submissions without calling Plunk", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "a@b.co", company: "bot" }), env());
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the Plunk secret is missing", async () => {
    const res = await handleSubscribe(post({ email: "a@b.co" }), env({ PLUNK_SECRET_KEY: undefined }));
    expect(res.status).toBe(503);
  });

  it("adds a normalized email to Plunk and welcomes a new contact once", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(none()).mockResolvedValueOnce(contactRes(true)).mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "  Kevin@Example.COM " }), env());
    expect(res.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toBe("https://next-api.useplunk.com/contacts?search=kevin%40example.com&limit=100");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://next-api.useplunk.com/contacts");
    expect(init.headers.authorization).toBe("Bearer sk_test");
    expect(JSON.parse(init.body)).toMatchObject({
      email: "kevin@example.com",
      subscribed: true,
      data: { list: "kevinjmagnan.com", utm_campaign: "dont-start-from-zero" },
    });
    const [sendUrl, sendInit] = fetchMock.mock.calls[2];
    expect(sendUrl).toBe("https://next-api.useplunk.com/v1/send");
    expect(JSON.parse(sendInit.body)).toMatchObject({
      to: "kevin@example.com",
      subject: WELCOME_SUBJECT,
      from: { email: "kevin@kevinjmagnan.com", name: "Kevin Magnan" },
      reply: "reply@example.com",
    });
  });

  it("leaves an existing subscriber untouched and sends nothing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(found("a@b.co", true));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "A@b.co" }), env());
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never re-subscribes someone who unsubscribed", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(found("a@b.co", false));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a substring match as a different person", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(found("aa@b.co", true)).mockResolvedValueOnce(contactRes(true)).mockResolvedValueOnce(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("finds the exact address on a later page of substring matches", async () => {
    const page = (emails: string[], more: boolean, cursor: string | null) =>
      new Response(JSON.stringify({ data: emails.map((email) => ({ email })), hasMore: more, cursor }), { status: 200 });
    const fetchMock = vi.fn().mockResolvedValueOnce(page(["aa@b.co"], true, "c2")).mockResolvedValueOnce(page(["a@b.co"], false, null));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain("cursor=c2");
  });

  it("fails closed when the matches run past the page cap", async () => {
    const more = () => new Response(JSON.stringify({ data: [{ email: "aa@b.co" }], hasMore: true, cursor: "next" }), { status: 200 });
    const fetchMock = vi.fn().mockImplementation(async () => more());
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls.every(([u]) => String(u).includes("search="))).toBe(true);
  });

  it("still reports success when only the welcome email fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(none()).mockResolvedValueOnce(contactRes(true)).mockResolvedValueOnce(new Response("err", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(res.status).toBe(200);
  });

  it("records a leave-behind page slug as the campaign", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(none()).mockResolvedValueOnce(contactRes(true)).mockResolvedValueOnce(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await handleSubscribe(post({ email: "a@b.co", source: "agents" }), env());
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).data).toMatchObject({ utm_medium: "leave-behind", utm_campaign: "agents" });
  });

  it("drops a source that is not a plain slug and keeps the kit campaign", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(none()).mockResolvedValueOnce(contactRes(true)).mockResolvedValueOnce(new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await handleSubscribe(post({ email: "a@b.co", source: "<script>alert(1)</script>" }), env());
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).data).toMatchObject({ utm_medium: "website", utm_campaign: "dont-start-from-zero" });
  });

  it("rejects a cross-site origin without calling Plunk", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "a@b.co" }, undefined, { Origin: "https://evil.example" }), env());
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a same-origin request", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(none()).mockResolvedValueOnce(contactRes(true)).mockResolvedValueOnce(new Response("{}")));
    const res = await handleSubscribe(post({ email: "a@b.co" }, undefined, { Origin: "https://kevinjmagnan.com" }), env());
    expect(res.status).toBe(200);
  });

  it("returns 429 when the caller's IP is over the limit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const SUBSCRIBE_LIMITER = limiter(false);
    const res = await handleSubscribe(
      post({ email: "a@b.co" }, undefined, { "CF-Connecting-IP": "203.0.113.7" }),
      env({ SUBSCRIBE_LIMITER } as Partial<Env>)
    );
    expect(res.status).toBe(429);
    expect(SUBSCRIBE_LIMITER.limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 when Plunk fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("err", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(res.status).toBe(502);
  });
});
