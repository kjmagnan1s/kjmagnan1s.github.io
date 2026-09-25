import type { TypeSafeClient } from "@typesafe-ai/sdk";

export const VISITOR_TYPES = [
  "recruiter",
  "founder",
  "engineer",
  "reader",
  "press",
  "curious",
] as const;
export type VisitorType = (typeof VISITOR_TYPES)[number];

export interface Route {
  visitor: VisitorType;
  visitorConfidence: number;
  wants: Record<"resume" | "projects" | "writing" | "stats" | "game" | "contact", number>;
  depth: "skim" | "detail";
  /** Probability that the message edits the page in `current_page` instead of asking for a new one. */
  followUp: number;
  elapsedMs: number;
  inputTokens: number | null;
  source: "jev" | "workers-ai" | "mock";
}

export interface RouteInput {
  message: string;
  persona?: string | null;
  referrer?: string | null;
  /** Section titles of the page the visitor is looking at, or "none" on a first load. */
  currentPage?: string[] | null;
}

const WANT_THRESHOLD = 0.5;
/** Above this, a message with a page attached is treated as an edit of that page. */
export const FOLLOW_UP_THRESHOLD = 0.5;

/** Raw Jev question shapes. The SDK helpers and the Workers AI binding take the same JSON. */
type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> };

/** One Jev request: the visitor's state plus every routing question. */
export function routerRequest(input: RouteInput): {
  state: Record<string, unknown>;
  questions: Record<string, JevQuestion>;
} {
  const pages = input.currentPage ?? [];
  return {
    state: {
      visitor_message: input.message || "(no message; the visitor clicked a persona chip)",
      persona_chip: input.persona ?? "none",
      referrer: input.referrer ?? "direct",
      current_page: pages.length ? pages : "none",
    },
    questions: {
      visitor: {
        type: "choice",
        instructions:
          "Who is this visitor, based on `visitor_message` and `persona_chip`? If the chip is set, it is the visitor's own label and outweighs the message.",
        criteria: {
          recruiter: "Recruiter or hiring manager evaluating Kevin for a role.",
          founder:
            "Startup founder or business owner looking for what Kevin has built or can build.",
          engineer:
            "Software or AI engineer curious about tooling, throughput, and open source.",
          reader: "Someone here for the essays and writing.",
          press: "Journalist, podcaster, or event organizer.",
          curious: "Casual visitor with no stated goal, or someone who wants to play.",
        },
      },
      wants_resume: {
        type: "noul",
        instructions:
          "Does the visitor want resume-style content: roles, achievements, skills, education?",
      },
      wants_projects: {
        type: "noul",
        instructions:
          "Does the visitor want to see projects, products, or open-source tools Kevin has built?",
      },
      wants_writing: { type: "noul", instructions: "Does the visitor want essays or blog posts?" },
      wants_stats: {
        type: "noul",
        instructions:
          "Would the visitor value throughput numbers about Kevin's agent operations (tokens, commits, agents)?",
      },
      wants_game: {
        type: "noul",
        instructions:
          "Did the visitor ask to play a game or express that they are just browsing for fun?",
      },
      wants_contact: {
        type: "noul",
        instructions: "Is the visitor likely to want a way to contact Kevin?",
      },
      is_follow_up: {
        type: "noul",
        instructions:
          "Is `visitor_message` a follow-up edit to the page described in `current_page` (for example remove, move, shorten, show more of) rather than a new request?",
      },
      depth: {
        type: "choice",
        instructions: "How much should the page show?",
        criteria: {
          skim: "A short page: a few highlights only.",
          detail: "A full page with every relevant section.",
        },
      },
    },
  };
}

/** Jev's answers in either transport, narrowed to what the route needs. */
interface RouterAnswers {
  visitor: { choice: string; confidence: number };
  wants_resume: { noul: number };
  wants_projects: { noul: number };
  wants_writing: { noul: number };
  wants_stats: { noul: number };
  wants_game: { noul: number };
  wants_contact: { noul: number };
  is_follow_up: { noul: number };
  depth: { choice: string };
}

function toRoute(
  answers: RouterAnswers,
  inputTokens: number | null,
  startedAt: number,
  source: Route["source"],
): Route {
  return {
    visitor: answers.visitor.choice as VisitorType,
    visitorConfidence: answers.visitor.confidence,
    wants: {
      resume: answers.wants_resume.noul,
      projects: answers.wants_projects.noul,
      writing: answers.wants_writing.noul,
      stats: answers.wants_stats.noul,
      game: answers.wants_game.noul,
      contact: answers.wants_contact.noul,
    },
    depth: answers.depth.choice as "skim" | "detail",
    followUp: answers.is_follow_up.noul,
    elapsedMs: Math.round(Date.now() - startedAt),
    inputTokens,
    source,
  };
}

/** One Jev call that classifies the visitor and what they want to see. */
export async function routeWithJev(
  client: TypeSafeClient,
  input: RouteInput,
): Promise<Route> {
  const started = Date.now();
  const { state, questions } = routerRequest(input);
  const res = await client.systemOne({
    state: state as Record<string, never>,
    questions: questions as never,
  });
  return toRoute(
    res.answers as unknown as RouterAnswers,
    res.usage.input_tokens,
    started,
    "jev",
  );
}

/** The same routing call over the Workers AI binding. Same body, same answers. */
export async function routeWithWorkersAi(ai: Ai, input: RouteInput): Promise<Route> {
  const started = Date.now();
  const { state, questions } = routerRequest(input);
  const res = (await (ai as unknown as {
    run(model: string, body: unknown): Promise<unknown>;
  }).run("typesafe/jev", { state, questions })) as {
    answers: RouterAnswers;
    usage?: { input_tokens?: number };
  };
  return toRoute(res.answers, res.usage?.input_tokens ?? null, started, "workers-ai");
}

/** Keyword router for offline development. Same output shape as Jev. */
export function routeWithMock(input: RouteInput): Route {
  const text = `${input.persona ?? ""} ${input.message}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w));
  let visitor: VisitorType = "curious";
  if (has("recruit", "hiring", "resume", "cv", "role", "job")) visitor = "recruiter";
  else if (has("founder", "startup", "built", "build", "product")) visitor = "founder";
  else if (has("engineer", "developer", "code", "agent", "tool")) visitor = "engineer";
  else if (has("read", "blog", "essay", "writing", "post")) visitor = "reader";
  else if (has("press", "podcast", "interview", "journalist")) visitor = "press";
  const wants = {
    resume: visitor === "recruiter" ? 0.95 : has("resume", "experience") ? 0.8 : 0.2,
    projects: visitor === "founder" || visitor === "engineer" ? 0.9 : has("built", "project") ? 0.8 : 0.3,
    writing: visitor === "reader" ? 0.95 : has("blog", "writing", "essay") ? 0.8 : 0.25,
    stats: visitor === "engineer" ? 0.85 : 0.3,
    game: has("game", "play", "fun", "bored") || visitor === "curious" ? 0.8 : 0.1,
    contact: visitor === "recruiter" || visitor === "founder" || visitor === "press" ? 0.8 : 0.3,
  };
  const onAPage = (input.currentPage ?? []).length > 0;
  return {
    visitor,
    visitorConfidence: 0.5,
    wants,
    depth: has("short", "quick", "skim", "tl;dr") ? "skim" : "detail",
    followUp:
      onAPage && has("remove", "move", "shorten", "hide", "show more", "drop", "swap") ? 0.9 : 0.1,
    elapsedMs: 0,
    inputTokens: null,
    source: "mock",
  };
}

export function wantedTopics(route: Route): string[] {
  const topics = ["always", "layout", "summary"];
  if (route.wants.resume > WANT_THRESHOLD) topics.push("resume");
  if (route.wants.projects > WANT_THRESHOLD) topics.push("projects", "builds");
  if (route.wants.writing > WANT_THRESHOLD) topics.push("writing");
  if (route.wants.stats > WANT_THRESHOLD) topics.push("stats");
  if (route.wants.game > WANT_THRESHOLD) topics.push("game");
  if (route.wants.contact > WANT_THRESHOLD) topics.push("contact");
  topics.push(route.visitor);
  if (route.visitor === "engineer") topics.push("engineering");
  if (route.visitor === "reader") topics.push("story");
  return topics;
}

/** Plain-language guidance for the composer, derived from the route. */
export function describeRoute(route: Route): string {
  const wanted = Object.entries(route.wants)
    .filter(([, p]) => p > WANT_THRESHOLD)
    .map(([k]) => k);
  return `The visitor is a ${route.visitor} (confidence ${route.visitorConfidence.toFixed(2)}). They want: ${wanted.join(", ") || "a general overview"}. Depth: ${route.depth}.`;
}
