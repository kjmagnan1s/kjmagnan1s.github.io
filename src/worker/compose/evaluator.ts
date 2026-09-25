import type { Experimental_CompositionEvaluator } from "@json-render/core";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import type { Env } from "../env";
import { ALWAYS_INCLUDED, candidateTopics, sectionOf } from "./candidates";
import { routeWithJev, routeWithWorkersAi, type Route, type RouteInput } from "./router";

export type Evaluate = Experimental_CompositionEvaluator;

/** The composer always asks Choice questions, so both adapters only handle that type. */
interface JevChoiceAnswer {
  choice: string;
  confidence: number;
}

/** Composer evaluator on the TypeSafe SDK. Every composer question is a Choice. */
export function createTypeSafeEvaluator(client: TypeSafeClient): Evaluate {
  return async ({ state, questions, signal }) => {
    const res = await client.systemOne(
      {
        // The composer already deep-clones state; round-trip once more to
        // satisfy the SDK's JSON value type.
        state: JSON.parse(JSON.stringify(state)),
        questions: Object.fromEntries(
          Object.entries(questions).map(([name, q]) => [
            name,
            choice(q.instructions, q.criteria),
          ]),
        ),
      },
      { signal },
    );
    return {
      answers: Object.fromEntries(
        Object.entries(res.answers).map(([name, a]) => [
          name,
          { choice: (a as JevChoiceAnswer).choice, confidence: (a as JevChoiceAnswer).confidence },
        ]),
      ),
      usage: { inputTokens: res.usage.input_tokens },
    };
  };
}

/**
 * Composer evaluator on the Workers AI binding. `typesafe/jev` takes the same
 * question JSON the SDK sends and answers with the same field names, so the
 * only real work is unwrapping `usage.input_tokens`.
 *
 * Verified against the docs page for typesafe/jev: the response is
 * `{ model, answers: { [name]: { type, choice, confidence, probabilities } },
 * usage: { input_tokens, output_tokens } }`.
 */
export function createWorkersAiEvaluator(env: Env): Evaluate {
  return async ({ state, questions }) => {
    const res = (await (env.AI as unknown as {
      run(model: string, body: unknown): Promise<unknown>;
    }).run("typesafe/jev", {
      state: JSON.parse(JSON.stringify(state)),
      questions: Object.fromEntries(
        Object.entries(questions).map(([name, q]) => [
          name,
          { type: "choice", instructions: q.instructions, criteria: q.criteria },
        ]),
      ),
    })) as {
      answers: Record<string, JevChoiceAnswer>;
      usage?: { input_tokens?: number };
    };
    return {
      answers: Object.fromEntries(
        Object.entries(res.answers).map(([name, a]) => [
          name,
          { choice: a.choice, confidence: a.confidence },
        ]),
      ),
      usage: { inputTokens: res.usage?.input_tokens ?? 0 },
    };
  };
}

/**
 * Deterministic evaluator for offline development. It reads the route's
 * wanted topics from `state.context.wanted_topics` and answers the composer's
 * question shapes (root, select_N, parent_*, order_*) without a model.
 */
export function createMockEvaluator(): Evaluate {
  return async ({ state, questions }) => {
    const context = (state.context ?? {}) as { wanted_topics?: string[] };
    const wanted = new Set(context.wanted_topics ?? ["always", "layout"]);
    const relevant = (id: string) =>
      (candidateTopics.get(id) ?? []).some((t) => wanted.has(t));
    const selected = (state.selected_elements ?? []) as Array<{
      id: string;
      type: string;
      content: string;
    }>;
    const answers: Record<string, { choice: string; confidence?: number }> = {};
    for (const [name, q] of Object.entries(questions)) {
      const keys = Object.keys(q.criteria);
      let pick: string;
      if (name === "root") pick = keys.includes("page") ? "page" : keys[0]!;
      else if (name.startsWith("select_")) {
        if (keys.every((k) => /^\d+$/.test(k))) {
          // Repeated layout element: rows are only useful with several cards.
          pick = "0";
        } else {
          const use = keys.find((k) => k.startsWith("use:") && relevant(k.slice(4)));
          pick = use ?? "omit";
        }
      } else if (name.startsWith("parent_")) {
        // Put cards under the section whose title matches their topic; else the root.
        const childId = name.slice("parent_".length);
        const child = selected.find((s) => s.id === childId);
        const childType = child?.type ?? "";
        const sectionFor: Record<string, string> = {
          RoleCard: "Experience",
          EducationList: "Skills and education",
          SkillTags: "Skills and education",
          PostCard: "Writing",
          ContactCTA: "Get in touch",
          FitAnalysis: "Get in touch",
        };
        let title = sectionFor[childType];
        if (childType === "ProjectCard")
          title = /open-source|product|company/i.test(child?.content ?? "")
            ? "What I am building"
            : "Selected work";
        const match = title
          ? keys.find((k) => q.criteria[k]!.includes(`"${title}"`))
          : undefined;
        pick = match ?? keys.find((k) => k.startsWith("node_0:")) ?? keys[0]!;
      } else if (name.startsWith("order_")) {
        // Conventional reading order: hero, intro text, stats, sections, links.
        const rank: Record<string, number> = {
          Hero: 0, Text: 1, StatStrip: 2, SkillTags: 3, Section: 4, LinkRow: 9,
        };
        const siblings = selected
          .slice(1)
          .map((s, i) => ({ id: s.id, pos: i + 1, rank: rank[s.type] ?? 5 }))
          .sort((a, b) => a.rank - b.rank || a.pos - b.pos);
        const childId = name.slice("order_".length);
        const position = siblings.findIndex((s) => s.id === childId) + 1;
        pick = keys.includes(String(position)) ? String(position) : keys[0]!;
      } else if (name === "next") {
        // Sequential edit mode: honor a "remove <thing>" request, else finish.
        const request = String(state.user_request ?? "").toLowerCase();
        const generic = new Set(["remove", "section", "card", "from", "page", "please"]);
        const words = request.split(/\W+/).filter((w) => w.length > 3 && !generic.has(w));
        const removal = keys.find(
          (k) =>
            k.startsWith("remove:") &&
            request.includes("remove") &&
            words.some((w) => q.criteria[k]!.toLowerCase().includes(w)),
        );
        const done = ((state.changes_made as string[] | undefined) ?? []).length > 0;
        pick = !done && removal ? removal : keys.includes("finish") ? "finish" : keys[0]!;
      } else pick = keys.find((k) => k !== "unavailable" && k !== "omit") ?? keys[0]!;
      answers[name] = { choice: pick, confidence: 1 };
    }
    return { answers, usage: { inputTokens: 0 } };
  };
}

/** Below this confidence a `use:` selection is treated as omit. Tune on real traffic. */
export const SELECT_CONFIDENCE_FLOOR = 0.4;

/**
 * Site policy on top of any evaluator, applied to the batch select phase only
 * (the request that carries the `root` question):
 * - Drop low-confidence selections.
 * - Always include the hero and links.
 * - A section is included exactly when at least one of its cards is included.
 * Jev is told these rules in words too, but code owns the invariant.
 */
export function withSitePolicy(evaluate: Evaluate): Evaluate {
  return async (request) => {
    const result = await evaluate(request);
    if (Object.keys(request.questions).some((q) => q.startsWith("order_")))
      return { ...result, answers: pinReadingOrder(request, result.answers) };
    if (!("root" in request.questions)) return result;
    const { questions } = request;
    const answers = { ...result.answers };
    const questionFor = (id: string) =>
      Object.keys(questions).find((q) => Object.hasOwn(questions[q]!.criteria, `use:${id}`));
    const isSelected = (id: string) => {
      const q = questionFor(id);
      return q !== undefined && answers[q]!.choice === `use:${id}`;
    };
    const set = (id: string, on: boolean) => {
      const q = questionFor(id);
      if (q) answers[q] = { choice: on ? `use:${id}` : "omit", confidence: 1 };
    };
    for (const [name, answer] of Object.entries(answers)) {
      if (name === "root" || !answer.choice.startsWith("use:")) continue;
      const id = answer.choice.slice(4);
      if (
        !ALWAYS_INCLUDED.includes(id) &&
        answer.confidence !== undefined &&
        answer.confidence < SELECT_CONFIDENCE_FLOOR
      )
        answers[name] = { choice: "omit", confidence: answer.confidence };
    }
    for (const id of ALWAYS_INCLUDED) set(id, true);
    const needed = new Set<string>();
    for (const [card, section] of sectionOf) if (isSelected(card)) needed.add(section);
    for (const section of new Set(sectionOf.values())) set(section, needed.has(section));
    return { ...result, answers };
  };
}

/** Layout phase: the hero is always first and the links always last; Jev orders the rest. */
export function pinReadingOrder(
  request: Parameters<Evaluate>[0],
  answers: Awaited<ReturnType<Evaluate>>["answers"],
) {
  const selected = (request.state.selected_elements ?? []) as Array<{ id: string; type: string }>;
  const siblings = selected.slice(1);
  const hero = siblings.find((s) => s.type === "Hero");
  const links = siblings.find((s) => s.type === "LinkRow");
  const out = { ...answers };
  const n = siblings.length;
  // Ties keep catalog order, so every other sibling is kept strictly between the pins.
  for (const s of siblings) {
    const key = `order_${s.id}`;
    if (!(key in out) || s === hero || s === links) continue;
    const pos = Number(out[key]!.choice);
    const lo = hero ? 2 : 1;
    const hi = links ? Math.max(lo, n - 1) : n;
    out[key] = { ...out[key]!, choice: String(Math.min(Math.max(pos, lo), hi)) };
  }
  if (hero && `order_${hero.id}` in out) out[`order_${hero.id}`] = { choice: "1", confidence: 1 };
  if (links && `order_${links.id}` in out) out[`order_${links.id}`] = { choice: String(n), confidence: 1 };
  return out;
}

/**
 * The compose endpoint's Jev transport. Workers AI is tried first; the router
 * call doubles as the probe, so an unavailable binding (model not enabled, no
 * credits, a 5xx) costs one failed request and then pins the SDK for the rest
 * of the composition. With no binding and no key there is nothing to run on.
 */
export interface Backend {
  /** Which transport answered last. Reported to the client on the `route` event. */
  name(): "workers-ai" | "typesafe";
  route(input: RouteInput): Promise<Route>;
  evaluate: Evaluate;
}

export function createBackend(env: Env): Backend | null {
  const client = env.TYPESAFE_API_KEY
    ? new TypeSafeClient({ apiKey: env.TYPESAFE_API_KEY })
    : null;
  const hasAi = Boolean(env.AI);
  if (!hasAi && !client) return null;

  // Prefer the SDK whenever the key is set: the Workers AI route for
  // typesafe/jev bills through AI Gateway credits, which this account does not
  // carry (verified 2026-09-19), and a failed binding call costs a round trip.
  let path: "workers-ai" | "typesafe" = client ? "typesafe" : "workers-ai";
  const workersAi = hasAi ? withSitePolicy(createWorkersAiEvaluator(env)) : null;
  const typeSafe = client ? withSitePolicy(createTypeSafeEvaluator(client)) : null;

  return {
    name: () => path,
    async route(input) {
      if (path === "workers-ai") {
        try {
          return await routeWithWorkersAi(env.AI, input);
        } catch (error) {
          if (!client) throw error;
          console.warn(
            `[compose] Workers AI jev unavailable, falling back to the TypeSafe SDK: ${(error as Error).message}`,
          );
          path = "typesafe";
        }
      }
      return routeWithJev(client!, input);
    },
    evaluate: async (request) => {
      if (path === "workers-ai" && workersAi) {
        try {
          return await workersAi(request);
        } catch (error) {
          if (!typeSafe) throw error;
          console.warn(
            `[compose] Workers AI jev failed mid-composition, falling back to the TypeSafe SDK: ${(error as Error).message}`,
          );
          path = "typesafe";
        }
      }
      return typeSafe!(request);
    },
  };
}
