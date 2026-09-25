import { TypeSafeClient } from "@typesafe-ai/sdk";
import type { Env } from "../env";
import { playRequest, toPlayResult, type PlayAnswers } from "./blocks";

export { BLOCKS, INTENTS, pickBlocks, playRequest, toPlayResult } from "./blocks";

/** The visitor's sentence is capped before it reaches Jev. */
const MAX_MESSAGE_CHARS = 300;

/** Sends one Jev request and returns its answers. Swapped out in tests. */
export type AskJev = (
  apiKey: string,
  request: ReturnType<typeof playRequest>,
) => Promise<PlayAnswers>;

const askJev: AskJev = async (apiKey, { state, questions }) => {
  const client = new TypeSafeClient({ apiKey });
  const res = await client.systemOne({
    state: state as Record<string, never>,
    questions: questions as never,
  });
  return res.answers as unknown as PlayAnswers;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/**
 * POST /api/play. The home page playground: one Jev call scores every block
 * against the visitor's sentence, and the response is the heading and three
 * blocks to show.
 */
export async function handlePlay(
  request: Request,
  env: Env,
  ask: AskJev = askJev,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const { success } = await env.PLAY_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") ?? "anon",
  });
  if (!success) return json({ error: "Too many tries. Give it a minute." }, 429);

  let body: { message?: unknown };
  try {
    body = ((await request.json()) ?? {}) as { message?: unknown };
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : "";
  if (!message) return json({ error: "message required" }, 400);

  if (!env.TYPESAFE_API_KEY) return json({ error: "Jev is not configured." }, 503);

  try {
    const answers = await ask(env.TYPESAFE_API_KEY, playRequest(message));
    return json(toPlayResult(answers), 200);
  } catch (error) {
    console.error(`[play] Jev request failed: ${(error as Error).message}`);
    return json({ error: "Jev didn't answer. Try again in a moment." }, 502);
  }
}
