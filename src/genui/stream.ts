import type { Spec } from "@json-render/core";

/** The route the Worker returns. Mirrors `Route` in src/worker/compose/router.ts. */
export interface RouteInfo {
  visitor: string;
  visitorConfidence: number;
  wants: Record<string, number>;
  depth: string;
  followUp: number;
  elapsedMs: number;
  inputTokens: number | null;
  source: string;
}

export interface StepInfo {
  index: number;
  choice: string;
  description: string;
  confidence: number | null;
  elapsedMs: number;
  inputTokens: number | null;
  answers?: Record<string, { choice: string; confidence?: number }>;
}

export type ServerEvent =
  | {
      type: "route";
      route: RouteInfo;
      followUp: number;
      mode: "new" | "edit";
      evaluator: string;
    }
  | { type: "step"; spec: Spec; step: StepInfo }
  | {
      type: "complete";
      spec: Spec | null;
      steps: StepInfo[];
      elapsedMs: number;
      inputTokens: number | null;
      stopReason: "finish" | "limit" | "unavailable";
      estimatedCostUsd: number | null;
    }
  | { type: "error"; message: string };

export interface ComposeRequest {
  prompt: string;
  /** The page the visitor is looking at, when there is one. */
  initialSpec?: Spec | null;
  /** The route that produced that page, when there is one. */
  route?: RouteInfo | null;
}

/**
 * The Worker reuses `body.route` verbatim whenever it carries a numeric
 * `followUp`, which would pin every later message to the first message's
 * follow-up probability and make edits impossible. Sending the route without
 * that one field is what its own tests do: the server re-asks the follow-up
 * question for this message and decides edit or new page from the answer.
 */
function routeForRequest(route: RouteInfo | null | undefined) {
  if (!route) return null;
  const { followUp: _followUp, ...rest } = route;
  return rest;
}

/** POST to /api/compose and yield each NDJSON event as it arrives. */
export async function* compose(
  body: ComposeRequest,
  signal: AbortSignal,
): AsyncGenerator<ServerEvent> {
  const res = await fetch("/api/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: body.prompt,
      initialSpec: body.initialSpec ?? null,
      route: routeForRequest(body.route),
      referrer: document.referrer || null,
    }),
    signal,
  });

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `The composer returned ${res.status}.`);
  }
  if (!res.body) throw new Error("The composer returned an empty response.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newline: number;
    while ((newline = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) yield JSON.parse(line) as ServerEvent;
    }
  }
}
