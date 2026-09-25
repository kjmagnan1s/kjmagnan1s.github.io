import { describe, it, expect, vi, afterEach } from "vitest";
import type { Env } from "./env";
import { handleSubscribe } from "./subscribe";

const env = (over: Partial<Env> = {}) =>
  ({
    BEEHIIV_API_KEY: "test-key",
    BEEHIIV_PUBLICATION_ID: "pub_test",
    ...over,
  }) as Env;

const post = (body: unknown, raw?: string) =>
  new Request("https://kevinjmagnan.com/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });

afterEach(() => vi.unstubAllGlobals());

describe("handleSubscribe", () => {
  it("rejects methods other than POST", async () => {
    const res = await handleSubscribe(
      new Request("https://kevinjmagnan.com/api/subscribe"),
      env()
    );
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

  it("quietly accepts honeypot submissions without calling Beehiiv", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "a@b.co", company: "bot" }), env());
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the Beehiiv secret is missing", async () => {
    const res = await handleSubscribe(
      post({ email: "a@b.co" }),
      env({ BEEHIIV_API_KEY: undefined })
    );
    expect(res.status).toBe(503);
  });

  it("sends a normalized email to the configured publication", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handleSubscribe(post({ email: "  Kevin@Example.COM " }), env());
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.beehiiv.com/v2/publications/pub_test/subscriptions");
    expect(init.headers.authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body)).toMatchObject({
      email: "kevin@example.com",
      send_welcome_email: true,
      utm_campaign: "dont-start-from-zero",
    });
  });

  it("returns 502 when Beehiiv fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("err", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleSubscribe(post({ email: "a@b.co" }), env());
    expect(res.status).toBe(502);
  });
});
