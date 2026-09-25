import { useCallback, useEffect, useRef, useState } from "react";
import type { Spec } from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react";
import { actionHandlers, registry } from "./registry";
import { compose, type RouteInfo, type ServerEvent, type StepInfo } from "./stream";

export type Phase = "idle" | "composing" | "composed";

export interface ShellApi {
  send: (prompt: string) => void;
}

interface Run {
  route: RouteInfo | null;
  mode: "new" | "edit" | null;
  evaluator: string;
  steps: StepInfo[];
  elapsedMs: number | null;
  inputTokens: number | null;
  estimatedCostUsd: number | null;
  stopReason: string | null;
  error: string | null;
}

const emptyRun: Run = {
  route: null,
  mode: null,
  evaluator: "",
  steps: [],
  elapsedMs: null,
  inputTokens: null,
  estimatedCostUsd: null,
  stopReason: null,
  error: null,
};

const WANT_THRESHOLD = 0.5;

function listWants(route: RouteInfo): string {
  const wanted = Object.entries(route.wants)
    .filter(([, p]) => p > WANT_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
  if (wanted.length === 0) return "wants a look around";
  if (wanted.length === 1) return `wants ${wanted[0]}`;
  return `wants ${wanted.slice(0, -1).join(", ")} and ${wanted[wanted.length - 1]}`;
}

export function App({
  register,
  onPhase,
  onBusy,
}: {
  register: (api: ShellApi) => void;
  onPhase: (phase: Phase) => void;
  onBusy: (busy: boolean) => void;
}) {
  const [spec, setSpec] = useState<Spec | null>(null);
  const [run, setRun] = useState<Run>(emptyRun);
  const [phase, setPhase] = useState<Phase>("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // The imperative entry point reads the current page through refs, so the
  // function handed to the DOM layer never goes stale.
  const specRef = useRef<Spec | null>(null);
  const routeRef = useRef<RouteInfo | null>(null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => onPhase(phase), [onPhase, phase]);
  useEffect(() => onBusy(busy), [onBusy, busy]);

  const send = useCallback((raw: string) => {
    const prompt = raw.trim();
    if (!prompt || busyRef.current) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    busyRef.current = true;
    setBusy(true);
    setNotice(null);
    setRun({ ...emptyRun });
    setPhase(specRef.current ? "composed" : "composing");

    void (async () => {
      try {
        for await (const event of compose(
          { prompt, initialSpec: specRef.current, route: routeRef.current },
          controller.signal,
        ))
          apply(event);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setRun((r) => ({ ...r, error: message }));
        setPhase(specRef.current ? "composed" : "idle");
      } finally {
        if (!controller.signal.aborted) {
          // Drop the finished controller. Aborting one whose stream already
          // ended still shows up as a failed request in devtools.
          if (abortRef.current === controller) abortRef.current = null;
          busyRef.current = false;
          setBusy(false);
        }
      }
    })();

    function apply(event: ServerEvent) {
      if (event.type === "route") {
        routeRef.current = event.route;
        setRun((r) => ({
          ...r,
          route: event.route,
          mode: event.mode,
          evaluator: event.evaluator,
        }));
      } else if (event.type === "step") {
        specRef.current = event.spec;
        setSpec(event.spec);
        setPhase("composed");
        setRun((r) => ({ ...r, steps: [...r.steps, event.step] }));
      } else if (event.type === "complete") {
        if (event.spec) {
          specRef.current = event.spec;
          setSpec(event.spec);
          setPhase("composed");
        }
        if (event.stopReason === "unavailable")
          setNotice(
            specRef.current
              ? "That one could not be applied. The page is unchanged."
              : "That one could not be built. Try asking a different way.",
          );
        setRun((r) => ({
          ...r,
          steps: event.steps.length ? event.steps : r.steps,
          elapsedMs: event.elapsedMs,
          inputTokens: event.inputTokens,
          estimatedCostUsd: event.estimatedCostUsd,
          stopReason: event.stopReason,
        }));
        if (!event.spec && !specRef.current) setPhase("idle");
      } else {
        setRun((r) => ({ ...r, error: event.message }));
      }
    }
  }, []);

  useEffect(() => register({ send }), [register, send]);

  const status = statusText({ run, busy, notice });

  return (
    <>
      {status && (
        <p className="shell-status" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {spec && (
        <JSONUIProvider registry={registry} handlers={actionHandlers} initialState={{}}>
          <Renderer spec={spec} registry={registry} loading={busy} />
        </JSONUIProvider>
      )}

      {spec && run.route && <Trace run={run} />}
    </>
  );
}

function statusText({
  run,
  busy,
  notice,
}: {
  run: Run;
  busy: boolean;
  notice: string | null;
}): string | null {
  if (run.error) return run.error;
  if (notice) return notice;
  if (!run.route) return busy ? "Reading your message..." : null;
  // An edit re-reads the message on its own, so the visitor label from an
  // edit is noise. Say what happened to the page instead.
  if (run.mode === "edit") return busy ? "Editing this page..." : "Edit applied";
  const parts = [`${run.route.visitor}, ${listWants(run.route)}`];
  if (busy) parts.push("building");
  else if (run.stopReason === "limit") parts.push("stopped at the element budget");
  return parts.join(" · ");
}

function Trace({ run }: { run: Run }) {
  const { route } = run;
  if (!route) return null;
  return (
    <details className="shell-trace">
      <summary>How this page was built</summary>
      <div className="shell-trace-body">
        <p className="shell-trace-row">
          <span>Visitor</span>
          <b>
            {route.visitor} ({route.visitorConfidence.toFixed(2)})
          </b>
        </p>
        <p className="shell-trace-row">
          <span>This message</span>
          <b>
            {run.mode === "edit" ? "an edit of the page" : "a new page"} (follow-up{" "}
            {route.followUp.toFixed(2)})
          </b>
        </p>
        <ul className="shell-wants">
          {Object.entries(route.wants).map(([want, p]) => (
            <li key={want} className={p > WANT_THRESHOLD ? "is-wanted" : ""}>
              <span>{want}</span>
              <i style={{ width: `${Math.round(p * 100)}%` }} />
              <b>{p.toFixed(2)}</b>
            </li>
          ))}
        </ul>
        <p className="shell-trace-row">
          <span>Routing</span>
          <b>
            {route.elapsedMs} ms
            {route.inputTokens != null ? `, ${route.inputTokens} tokens` : ""}
          </b>
        </p>
        {run.steps.length > 0 && (
          <ol className="shell-steps">
            {run.steps.map((step) => (
              <li key={step.index}>
                <span>{step.choice}</span>
                <b>
                  {step.elapsedMs} ms
                  {step.inputTokens != null ? `, ${step.inputTokens} tokens` : ""}
                  {step.confidence != null ? `, conf ${step.confidence.toFixed(2)}` : ""}
                </b>
              </li>
            ))}
          </ol>
        )}
        {run.elapsedMs != null && (
          <p className="shell-trace-row">
            <span>Total</span>
            <b>
              {run.stopReason}, {run.elapsedMs} ms
              {run.inputTokens != null ? `, ${run.inputTokens} tokens` : ""}
              {run.estimatedCostUsd != null
                ? `, about $${run.estimatedCostUsd.toFixed(5)}`
                : ""}
            </b>
          </p>
        )}
        {run.evaluator && (
          <p className="shell-trace-row">
            <span>Decision model</span>
            <b>
              typesafe/jev via{" "}
              {run.evaluator === "workers-ai" ? "Workers AI" : "the TypeSafe API"}
            </b>
          </p>
        )}
        <p className="shell-trace-note">
          No text on this page is written by a model. Every element is prepared
          content; the model only picks which ones appear and in what order.
        </p>
      </div>
    </details>
  );
}
