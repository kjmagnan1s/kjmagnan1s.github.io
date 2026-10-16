import type { Experimental_CompositionEvaluator } from "@json-render/core";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import type { Env } from "../env";
import { JEV_HEADERS, JEV_MODEL } from "../jev";
import { ALWAYS_INCLUDED, candidateTopics, sectionOf } from "./candidates";
import { routeWithJev, routeWithWorkersAi, type Route, type RouteInput } from "./router";

export type Evaluate = Experimental_CompositionEvaluator;

/** Raw Jev question shapes. The SDK helpers and the Workers AI binding take the same JSON. */
export type JevQuestion =
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } };

/** A raw Jev answer: `choice`, `confidence`, and `probabilities` for a Choice, `noul` for a Noul. */
export interface JevAnswer {
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  noul?: number;
}

/**
 * One Jev request on either transport. The composer only asks Choice
 * questions, but the site's ranking also needs Nouls and the full Choice
 * distribution, so the transports speak this wider shape and `toEvaluate`
 * narrows it for the composer.
 */
export type Ask = (request: {
  state: Record<string, unknown>;
  questions: Record<string, JevQuestion>;
  signal?: AbortSignal;
}) => Promise<{ answers: Record<string, JevAnswer>; inputTokens: number }>;

/** Jev over the TypeSafe SDK. */
export function createTypeSafeAsk(client: TypeSafeClient): Ask {
  return async ({ state, questions, signal }) => {
    const res = await client.systemOne(
      {
        model: JEV_MODEL,
        // The composer already deep-clones state; round-trip once more to
        // satisfy the SDK's JSON value type.
        state: JSON.parse(JSON.stringify(state)),
        questions: Object.fromEntries(
          Object.entries(questions).map(([name, q]) => [
            name,
            q.type === "noul" ? noul(q.instructions, q.criteria) : choice(q.instructions, q.criteria),
          ]),
        ),
      },
      { signal, headers: JEV_HEADERS },
    );
    return {
      answers: res.answers as unknown as Record<string, JevAnswer>,
      inputTokens: res.usage.input_tokens,
    };
  };
}

/**
 * Jev over the Workers AI binding. `typesafe/jev` takes the same question
 * JSON the SDK sends and answers with the same field names.
 *
 * Verified against the docs page for typesafe/jev: the response is
 * `{ model, answers: { [name]: { type, choice, confidence, probabilities } },
 * usage: { input_tokens, output_tokens } }`.
 */
export function createWorkersAiAsk(env: Env): Ask {
  return async ({ state, questions }) => {
    const res = (await (env.AI as unknown as {
      run(model: string, body: unknown): Promise<unknown>;
    }).run("typesafe/jev", { state: JSON.parse(JSON.stringify(state)), questions })) as {
      answers: Record<string, JevAnswer>;
      usage?: { input_tokens?: number };
    };
    return { answers: res.answers, inputTokens: res.usage?.input_tokens ?? 0 };
  };
}

/** The composer's view of an Ask: Choice questions in, `{ choice, confidence }` out. */
export function toEvaluate(ask: Ask): Evaluate {
  return async ({ state, questions, signal }) => {
    const { answers, inputTokens } = await ask({ state, questions, signal });
    return {
      answers: Object.fromEntries(
        Object.entries(answers).map(([name, a]) => [
          name,
          { choice: a.choice ?? "", confidence: a.confidence },
        ]),
      ),
      usage: { inputTokens },
    };
  };
}

/** Composer evaluator on the TypeSafe SDK, without site policy. */
export function createTypeSafeEvaluator(client: TypeSafeClient): Evaluate {
  return toEvaluate(createTypeSafeAsk(client));
}

/** Composer evaluator on the Workers AI binding, without site policy. */
export function createWorkersAiEvaluator(env: Env): Evaluate {
  return toEvaluate(createWorkersAiAsk(env));
}

/**
 * Offline Ask for development and tests. Composer questions go to
 * `createMockEvaluator`. The ranking questions are answered from
 * `state.context.wanted_topics`: `rank` spreads its probability evenly over
 * the relevant cards, `any_fit` and `more` say whether a relevant card is
 * left, and `contact` says whether the route wants contact.
 */
export function createMockAsk(): Ask {
  const evaluate = createMockEvaluator();
  return async ({ state, questions, signal }) => {
    const context = (state.context ?? {}) as { wanted_topics?: string[] };
    const wanted = new Set(context.wanted_topics ?? ["always", "layout"]);
    const relevant = (id: string) =>
      (candidateTopics.get(id) ?? []).some((t) => wanted.has(t));
    const remaining = ((state.remaining_cards ?? []) as Array<{ id: string }>).map((c) => c.id);
    const answers: Record<string, JevAnswer> = {};
    const composer: Record<string, { type: "choice"; instructions: string; criteria: Record<string, string> }> = {};
    for (const [name, q] of Object.entries(questions)) {
      if (q.type === "noul") {
        const yes =
          name === RANK_QUESTIONS.contact ? wanted.has("contact") : remaining.some(relevant);
        answers[name] = { noul: yes ? 1 : 0 };
      } else if (name === RANK_QUESTIONS.rank) {
        const options = Object.keys(q.criteria);
        const hits = options.filter(relevant);
        const spread = hits.length ? hits : options;
        const probabilities = Object.fromEntries(
          options.map((o) => [o, spread.includes(o) ? 1 / spread.length : 0]),
        );
        answers[name] = { choice: spread[0], confidence: hits.length ? 0.5 : 0, probabilities };
      } else composer[name] = q;
    }
    if (Object.keys(composer).length) {
      const out = await evaluate({ state, questions: composer, signal: signal ?? new AbortController().signal });
      Object.assign(answers, out.answers);
    }
    return { answers, inputTokens: 0 };
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

/** Question names the ranking adds to the select request. */
export const RANK_QUESTIONS = {
  rank: "rank",
  anyFit: "any_fit",
  more: "more",
  contact: "contact",
} as const;

/**
 * Ranking knobs, tuned on a 15-prompt replay against jev-1.14.0 (2026-10-14).
 * - Round 1: `any_fit` at or below CONTINUE_FLOOR means nothing fits, and the
 *   page keeps only the hero and links.
 * - Later rounds: `more` at or below MORE_FLOOR stops the ranking. It is
 *   higher because `more` sat between 0.5 and 0.6 on padding (an extra tool
 *   on a government-work page, a third round of essays for a nonprofit).
 * - Each round takes its top card, then the next cards in probability order
 *   while their running total is under ROUND_MASS and each has at least ROUND_MIN.
 */
export const CONTINUE_FLOOR = 0.5;
export const MORE_FLOOR = 0.6;
export const MAX_RANK_ROUNDS = 4;
export const ROUND_MASS = 0.7;
export const ROUND_MIN = 0.1;
/** Content-card cap, so cards plus page, hero, links, and six sections stay under MAX_ELEMENTS. */
export const MAX_RANKED_CARDS = 14;

/**
 * Cards decided by an absolute yes/no instead of the ranking. Contact is
 * wanted or not regardless of what else is on the page, and as a ranking
 * option it rarely wins a round.
 */
const ABSOLUTE_CARDS: Record<string, { question: keyof typeof RANK_QUESTIONS; instructions: string }> = {
  contact_cta: {
    question: "contact",
    instructions:
      "Would the visitor in `user_request` likely want a way to contact Kevin, for example to hire him, work with him, book him, or interview him?",
  },
};

/** What each ranking question asks. Exported so the replay harness can try alternatives. */
export const RANK_INSTRUCTIONS = {
  rank: "Which one card in `remaining_cards` best gives the visitor what `user_request` asks for? `context.visitor` says who they are. Cards in `already_chosen` are already on the page.",
  anyFit: "Does at least one card in `remaining_cards` give the visitor something `user_request` asks for?",
  more: "Is there a card in `remaining_cards` of the same kind the visitor asked for in `user_request` (for example another essay when they asked for essays, another tool when they asked for tools), or a different thing they explicitly asked for? Extras that are merely about Kevin do not count.",
};

const YES_NO_CARDS = {
  true: "Yes: at least one remaining card is content the visitor asked for or would clearly want.",
  false: "No: the remaining cards do not address the request.",
};

/** The cards one round takes from a rank distribution, best first. */
export function takeFromRound(
  probabilities: Record<string, number>,
  mass = ROUND_MASS,
  min = ROUND_MIN,
): string[] {
  const sorted = Object.entries(probabilities).sort((a, b) => b[1] - a[1]);
  const out: string[] = [];
  let total = 0;
  for (const [id, p] of sorted) {
    if (out.length && (total >= mass || p < min)) break;
    out.push(id);
    total += p;
  }
  return out;
}

/**
 * Select phase, ranked listwise. Instead of one omit-or-use question per card
 * (each judged alone and kept above a confidence floor), Jev ranks every
 * content card against the others with one Choice, repeated without
 * replacement: each round drops the cards already taken and asks again.
 * Absolute questions stay Nouls: whether any card fits at all (round 1),
 * whether the visitor wants more (later rounds), and whether to show contact.
 * Round 1 rides in the same request as the composer's `root` question.
 */
async function selectByRanking(
  ask: Ask,
  request: Parameters<Evaluate>[0],
): Promise<Awaited<ReturnType<Evaluate>>> {
  const { state, questions, signal } = request;
  const rootIds = new Set(Object.keys(questions.root?.criteria ?? {}));
  const sections = new Set(sectionOf.values());
  // One-card select questions are rewritten; anything else goes to Jev as asked.
  const cardQuestion = new Map<string, string>();
  const description = new Map<string, string>();
  const passthrough: Record<string, JevQuestion> = {};
  for (const [name, q] of Object.entries(questions)) {
    const keys = Object.keys(q.criteria);
    const uses = keys.filter((k) => k.startsWith("use:"));
    if (name.startsWith("select_") && uses.length === 1 && keys.length === 2 && keys.includes("omit")) {
      const id = uses[0]!.slice(4);
      cardQuestion.set(id, name);
      description.set(id, q.criteria[uses[0]!]!);
    } else passthrough[name] = q;
  }
  const isRanked = (id: string) =>
    !rootIds.has(id) && !ALWAYS_INCLUDED.includes(id) && !sections.has(id) && !(id in ABSOLUTE_CARDS);
  const cards = [...cardQuestion.keys()].filter(isRanked);
  const absolute = [...cardQuestion.keys()].filter((id) => id in ABSOLUTE_CARDS);
  // The capability list repeats every description already in the rank options.
  const { capabilities: _capabilities, ...base } = state;
  const asCards = (ids: string[]) => ids.map((id) => ({ id, description: description.get(id)! }));

  const chosen: string[] = [];
  const confidence = new Map<string, number>();
  let inputTokens = 0;
  let first: Record<string, JevAnswer> = {};
  let fits = false;
  let absoluteYes = new Set<string>();
  for (let round = 0; round < MAX_RANK_ROUNDS; round++) {
    const remaining = cards.filter((id) => !chosen.includes(id));
    if (round > 0 && (!remaining.length || chosen.length >= MAX_RANKED_CARDS)) break;
    const continueName = round === 0 ? RANK_QUESTIONS.anyFit : RANK_QUESTIONS.more;
    const roundQuestions: Record<string, JevQuestion> = round === 0 ? { ...passthrough } : {};
    if (remaining.length) {
      roundQuestions[RANK_QUESTIONS.rank] = {
        type: "choice",
        instructions: RANK_INSTRUCTIONS.rank,
        criteria: Object.fromEntries(remaining.map((id) => [id, description.get(id)!])),
      };
      roundQuestions[continueName] = {
        type: "noul",
        instructions: round === 0 ? RANK_INSTRUCTIONS.anyFit : RANK_INSTRUCTIONS.more,
        criteria: YES_NO_CARDS,
      };
    }
    if (round === 0)
      for (const id of absolute) {
        const { question, instructions } = ABSOLUTE_CARDS[id]!;
        roundQuestions[RANK_QUESTIONS[question]] = { type: "noul", instructions };
      }
    const res = await ask({
      state: { ...base, already_chosen: asCards(chosen), remaining_cards: asCards(remaining) },
      questions: roundQuestions,
      signal,
    });
    inputTokens += res.inputTokens;
    if (round === 0) {
      first = res.answers;
      absoluteYes = new Set(
        absolute.filter(
          (id) => (res.answers[RANK_QUESTIONS[ABSOLUTE_CARDS[id]!.question]]?.noul ?? 0) > CONTINUE_FLOOR,
        ),
      );
    }
    if (!remaining.length) break;
    const go = (res.answers[continueName]?.noul ?? 0) > (round === 0 ? CONTINUE_FLOOR : MORE_FLOOR);
    if (round === 0) fits = go;
    if (!go) break;
    const rank = res.answers[RANK_QUESTIONS.rank];
    const probabilities =
      rank?.probabilities ?? (rank?.choice ? { [rank.choice]: rank.confidence ?? 1 } : {});
    for (const id of takeFromRound(probabilities)) {
      if (!remaining.includes(id) || chosen.length >= MAX_RANKED_CARDS) continue;
      chosen.push(id);
      confidence.set(id, probabilities[id] ?? 0);
    }
  }
  // Nothing fits: no content card, the absolute ones included.
  const on = new Set<string>(ALWAYS_INCLUDED);
  if (fits || !cards.length) {
    for (const id of chosen) on.add(id);
    for (const id of absoluteYes) on.add(id);
  }
  for (const [card, section] of sectionOf) if (on.has(card)) on.add(section);

  const answers: Awaited<ReturnType<Evaluate>>["answers"] = {};
  for (const name of Object.keys(passthrough))
    answers[name] = { choice: first[name]?.choice ?? "", confidence: first[name]?.confidence };
  for (const [id, name] of cardQuestion)
    answers[name] = on.has(id)
      ? { choice: `use:${id}`, confidence: confidence.get(id) ?? 1 }
      : { choice: "omit", confidence: 1 };
  return { answers, usage: { inputTokens } };
}

/**
 * Site policy on top of any Jev transport:
 * - Select phase (the request that carries `root`): cards are ranked
 *   listwise by `selectByRanking`; the hero and links are always included;
 *   a section is included exactly when at least one of its cards is.
 * - Layout phase: the hero is first and the links last.
 * Jev is told these rules in words too, but code owns the invariant.
 */
export function withSitePolicy(ask: Ask): Evaluate {
  const evaluate = toEvaluate(ask);
  return async (request) => {
    if ("root" in request.questions) return selectByRanking(ask, request);
    const result = await evaluate(request);
    if (Object.keys(request.questions).some((q) => q.startsWith("order_")))
      return { ...result, answers: pinReadingOrder(request, result.answers) };
    return result;
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
  const workersAi = hasAi ? withSitePolicy(createWorkersAiAsk(env)) : null;
  const typeSafe = client ? withSitePolicy(createTypeSafeAsk(client)) : null;

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
