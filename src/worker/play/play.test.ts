import { describe, it, expect, vi } from "vitest";
import type { Env } from "../env";
import { handlePlay, type AskJev } from "./index";
import { BLOCKS, OFF_TOPIC, pickBlocks, type BlockId, type PlayAnswers, type PlayResult } from "./blocks";

const limiter = (success = true) => ({ limit: vi.fn().mockResolvedValue({ success }) });

const env = (over: Partial<Env> = {}) =>
  ({ PLAY_LIMITER: limiter(), TYPESAFE_API_KEY: "test-key", ...over }) as Env;

const post = (body: unknown, raw?: string) =>
  new Request("https://kevinjmagnan.com/api/play", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });

/** Answers where every block scores low except the ones given. */
function answers(
  fits: Partial<Record<BlockId, number>>,
  intent = "write",
  onTopic = 0.9,
): PlayAnswers {
  const a: Record<string, unknown> = { intent: { choice: intent }, on_topic: { noul: onTopic } };
  for (const id of Object.keys(BLOCKS)) a[`fit_${id}`] = { noul: fits[id as BlockId] ?? 0.05 };
  return a as unknown as PlayAnswers;
}

const ask = (a: PlayAnswers): AskJev => vi.fn().mockResolvedValue(a);

describe("handlePlay", () => {
  it("rejects methods other than POST", async () => {
    const res = await handlePlay(new Request("https://kevinjmagnan.com/api/play"), env());
    expect(res.status).toBe(405);
  });

  it("returns 429 when the visitor is over the rate limit", async () => {
    const res = await handlePlay(post({ message: "hi" }), env({ PLAY_LIMITER: limiter(false) } as never));
    expect(res.status).toBe(429);
  });

  it("rejects a body that is not JSON", async () => {
    const res = await handlePlay(post(null, "nope"), env());
    expect(res.status).toBe(400);
  });

  it("rejects an empty or blank message", async () => {
    expect((await handlePlay(post({ message: "   " }), env())).status).toBe(400);
    expect((await handlePlay(post({}), env())).status).toBe(400);
  });

  it("returns 503 when no Jev key is configured", async () => {
    const res = await handlePlay(post({ message: "hi" }), env({ TYPESAFE_API_KEY: undefined }));
    expect(res.status).toBe(503);
  });

  it("returns 502 when Jev fails", async () => {
    const failing: AskJev = vi.fn().mockRejectedValue(new Error("boom"));
    const res = await handlePlay(post({ message: "hi" }), env(), failing);
    expect(res.status).toBe(502);
  });

  it("sends the trimmed, capped message to Jev with one question per block", async () => {
    const spy = ask(answers({ anti_slop: 0.9 }));
    await handlePlay(post({ message: `  ${"x".repeat(400)}  ` }), env(), spy);
    const [key, request] = (spy as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(key).toBe("test-key");
    expect(request.state.visitor_message).toBe("x".repeat(300));
    for (const id of Object.keys(BLOCKS)) expect(request.questions).toHaveProperty(`fit_${id}`);
  });

  it("returns the intent heading and the three best-fitting blocks", async () => {
    const res = await handlePlay(
      post({ message: "I want my emails to sound like me" }),
      env(),
      ask(answers({ anti_slop: 0.95, naperthrill: 0.7, kit_skill: 0.6, resume: 0.2 })),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as PlayResult;
    expect(body.intent).toBe("write");
    expect(body.title).toBe("Make AI sound like you.");
    expect(body.blocks.map((b) => b.id)).toEqual(["anti_slop", "naperthrill", "kit_skill"]);
    expect(body.blocks[0]).toMatchObject({ title: "anti-slop", href: BLOCKS.anti_slop.href });
  });

  it("shows the default page for off-topic messages, whatever the block scores", async () => {
    const res = await handlePlay(
      post({ message: "who won the game last night" }),
      env(),
      ask(answers({ naperthrill: 0.9 }, "explore", 0.1)),
    );
    const body = (await res.json()) as PlayResult;
    expect(body.intent).toBe("off_topic");
    expect(body.blocks.map((b) => b.id)).toEqual(OFF_TOPIC.blocks);
  });

  it("falls back to the explore heading when Jev returns an unknown intent", async () => {
    const res = await handlePlay(post({ message: "hm" }), env(), ask(answers({}, "nonsense")));
    expect(((await res.json()) as PlayResult).intent).toBe("explore");
  });
});

describe("pickBlocks", () => {
  const scores = (fits: Partial<Record<BlockId, number>>) =>
    Object.fromEntries(Object.keys(BLOCKS).map((id) => [id, fits[id as BlockId] ?? 0])) as Record<
      BlockId,
      number
    >;

  it("keeps at most one free-kit block, even when kit blocks score highest", () => {
    const picked = pickBlocks(
      scores({ kit_picks: 0.99, kit_skill: 0.98, kit_github: 0.97, kit_start: 0.96, videos: 0.5, oa: 0.4 }),
    );
    expect(picked).toEqual(["kit_picks", "videos", "oa"]);
  });

  it("always returns three blocks", () => {
    expect(pickBlocks(scores({}))).toHaveLength(3);
  });
});
