import type { Spec } from "@json-render/core";
import type { Env } from "../env";
import { composePage } from "./compose";
import { createBackend } from "./evaluator";
import { FOLLOW_UP_THRESHOLD, type Route } from "./router";

export { composePage, MAX_ELEMENTS, type ComposeEvent } from "./compose";
export { buildCandidates, type Candidate } from "./candidates";
export { catalog } from "./catalog";
export {
  createMockEvaluator,
  createTypeSafeEvaluator,
  createWorkersAiEvaluator,
  pinReadingOrder,
  SELECT_CONFIDENCE_FLOOR,
  withSitePolicy,
  type Evaluate,
} from "./evaluator";
export {
  describeRoute,
  routeWithJev,
  routeWithMock,
  routeWithWorkersAi,
  wantedTopics,
  FOLLOW_UP_THRESHOLD,
  type Route,
} from "./router";

/** The visitor's sentence is capped before it reaches Jev. */
const MAX_PROMPT_CHARS = 500;

interface ComposeRequestBody {
  prompt?: string;
  persona?: string | null;
  referrer?: string | null;
  initialSpec?: Spec | null;
  route?: Route | null;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Section titles of the page the visitor is looking at. Jev reads these as `current_page`. */
export function sectionTitles(spec: Spec | null | undefined): string[] {
  if (!spec?.elements) return [];
  return Object.values(spec.elements)
    .filter((el) => el.type === "Section" && typeof el.props?.title === "string")
    .map((el) => el.props.title as string);
}

/**
 * POST /api/compose. Streams NDJSON: one `route` event, one `step` per
 * composer decision, then `complete`, or `error` if anything throws. The
 * producer runs behind a TransformStream so the first snapshot reaches the
 * browser while Jev is still deciding the rest.
 */
export async function handleCompose(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405);

  const { success } = await env.COMPOSE_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") ?? "anon",
  });
  if (!success)
    return json({ error: "Too many requests. Give it a minute and try again." }, 429);

  let body: ComposeRequestBody;
  try {
    body = ((await request.json()) ?? {}) as ComposeRequestBody;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  // The front page always sends the visitor's own sentence. There is no chip
  // fallback copy any more, so an empty prompt is a client bug, not a persona.
  const prompt = (body.prompt ?? "").trim().slice(0, MAX_PROMPT_CHARS);
  if (!prompt) return json({ error: "prompt required" }, 400);

  const backend = createBackend(env);
  if (!backend)
    return json(
      {
        error:
          "Composition is unavailable: no Workers AI binding and no TYPESAFE_API_KEY is configured.",
      },
      503,
    );

  const initialSpec = body.initialSpec ?? null;
  const current = sectionTitles(initialSpec);

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  const write = async (event: unknown) => {
    await writer.write(encoder.encode(`${JSON.stringify(event)}\n`));
  };

  const controller = new AbortController();
  request.signal.addEventListener("abort", () => controller.abort());

  const produce = async () => {
    try {
      // Follow-up edits reuse the route from the first request when the client
      // sends it back, but the follow-up probability is always this message's.
      const route =
        body.route && typeof body.route.followUp === "number"
          ? body.route
          : await backend.route({
              message: prompt,
              persona: body.persona,
              referrer: body.referrer,
              currentPage: current,
            });

      // A page is only edited when the visitor is actually editing it. A new
      // request with a page attached starts over.
      const editing = initialSpec !== null && route.followUp > FOLLOW_UP_THRESHOLD;

      await write({
        type: "route",
        route,
        followUp: route.followUp,
        mode: editing ? "edit" : "new",
        evaluator: backend.name(),
      });

      for await (const event of composePage({
        prompt,
        route,
        evaluate: backend.evaluate,
        signal: controller.signal,
        initialSpec: editing ? initialSpec : undefined,
      }))
        await write(event);
    } catch (error) {
      // A client that walks away cancels the stream, and every write after
      // that rejects. Reporting the failure is best effort.
      const message =
        error instanceof Error ? error.message : `composition failed: ${String(error)}`;
      await write({ type: "error", message }).catch(() => {});
    } finally {
      await writer.close().catch(() => {});
    }
  };

  ctx.waitUntil(produce());

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
