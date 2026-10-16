import type { Spec } from "@json-render/core";
import { describe, expect, it } from "vitest";
import type { Env } from "../env";
import { buildCandidates } from "./candidates";
import { catalog } from "./catalog";
import { composePage, MAX_ELEMENTS, type ComposeEvent } from "./compose";
import {
  CONTINUE_FLOOR,
  createMockAsk,
  MAX_RANK_ROUNDS,
  MORE_FLOOR,
  takeFromRound,
  withSitePolicy,
  type Ask,
  type JevAnswer,
  type JevQuestion,
} from "./evaluator";
import { handleCompose } from "./index";
import { routeWithMock } from "./router";

async function composeFor(message: string, persona: string | null = null) {
  const route = routeWithMock({ message, persona });
  let last: ComposeEvent | undefined;
  for await (const event of composePage({
    prompt: message || `Build the page for a ${route.visitor}.`,
    route,
    evaluate: withSitePolicy(createMockAsk()),
    signal: new AbortController().signal,
  }))
    last = event;
  if (!last || last.type !== "complete") throw new Error("no completion");
  return { route, ...last };
}

describe("candidates", () => {
  it("every candidate validates against the catalog", () => {
    const candidates = buildCandidates();
    expect(candidates.length).toBeGreaterThan(20);
    for (const c of candidates) {
      const def = catalog.data.components[c.element.type as keyof typeof catalog.data.components];
      expect(def, c.id).toBeDefined();
      expect(def!.props.safeParse(c.element.props).success, c.id).toBe(true);
    }
    expect(candidates.filter((c) => c.root).map((c) => c.id)).toEqual(["page"]);
  });

  it("every card carries the canonical static URL it links to", () => {
    const needsUrl = new Set([
      "RoleCard",
      "ProjectCard",
      "PostCard",
      "EducationList",
      "SkillTags",
      "ContactCTA",
      "GameTeaser",
    ]);
    for (const c of buildCandidates()) {
      if (!needsUrl.has(c.element.type)) continue;
      const url = c.element.props.url;
      expect(typeof url, c.id).toBe("string");
      expect(String(url).length, c.id).toBeGreaterThan(0);
      // The press action goes to the same place the prop advertises.
      const press = c.element.on?.press as { params?: { url?: string } } | undefined;
      if (press) expect(press.params?.url, c.id).toBe(url);
    }
  });
});

describe("composePage with the mock evaluator", () => {
  it("builds a recruiter page with resume content inside sections", async () => {
    const { spec, stopReason } = await composeFor(
      "I'm a recruiter evaluating Kevin for a role. Show me his experience and skills.",
    );
    expect(stopReason).toBe("finish");
    expect(spec).not.toBeNull();
    const types = Object.values(spec!.elements).map((e) => e.type);
    expect(types).toContain("Hero");
    expect(types).toContain("RoleCard");
    expect(types).toContain("FitAnalysis");
    expect(types).not.toContain("PostCard");
    expect(Object.keys(spec!.elements).length).toBeLessThanOrEqual(MAX_ELEMENTS);
    // Role cards live under the Experience section, not the root.
    const root = spec!.elements[spec!.root]!;
    const experience = Object.entries(spec!.elements).find(
      ([, e]) => e.type === "Section" && e.props.title === "Experience",
    );
    expect(experience).toBeDefined();
    const roleIds = Object.entries(spec!.elements)
      .filter(([, e]) => e.type === "RoleCard")
      .map(([id]) => id);
    for (const id of roleIds) {
      expect(experience![1].children).toContain(id);
      expect(root.children).not.toContain(id);
    }
    expect(catalog.validate(spec).success).toBe(true);
  });

  it("builds a reader page with posts and no resume content", async () => {
    const { spec } = await composeFor("I just want to read your essays");
    const types = Object.values(spec!.elements).map((e) => e.type);
    expect(types).toContain("PostCard");
    expect(types).not.toContain("RoleCard");
    expect(types).not.toContain("FitAnalysis");
  });

  it("never leaves a section empty and never orphans a card", async () => {
    const prompts = [
      "I'm a recruiter evaluating Kevin for a role.",
      "I'm a founder. What has Kevin built and shipped?",
      "I'm an AI engineer. Show me the tools and the throughput numbers.",
      "I'm here to read Kevin's essays.",
      "Just browsing. Give me a short overview.",
    ];
    for (const prompt of prompts) {
      const { spec } = await composeFor(prompt);
      for (const [id, el] of Object.entries(spec!.elements)) {
        if (el.type === "Section")
          expect(el.children?.length ?? 0, `${prompt}: ${id} empty`).toBeGreaterThan(0);
        if (["RoleCard", "ProjectCard", "PostCard", "EducationList", "SkillTags", "ContactCTA", "FitAnalysis"].includes(el.type))
          expect(spec!.elements[spec!.root]!.children, `${prompt}: ${id} at root`).not.toContain(id);
      }
    }
  });

  it("routes a game request to the teaser", async () => {
    const route = routeWithMock({ message: "bored, got a game?" });
    expect(route.wants.game).toBeGreaterThan(0.5);
    const { spec } = await composeFor("bored, got a game?");
    expect(Object.values(spec!.elements).map((e) => e.type)).toContain("GameTeaser");
  });
});

/**
 * A Jev stand-in for the select phase. Each select round gets the next
 * scripted rank distribution and continuation Noul; the layout phase goes to
 * the offline mock. Records every select round it answers.
 */
function scriptedAsk(
  rounds: Array<{ rank: Record<string, number>; go: number }>,
  contact = 0,
) {
  const mock = createMockAsk();
  const calls: Array<{ state: Record<string, unknown>; questions: Record<string, JevQuestion> }> = [];
  const ask: Ask = async (request) => {
    const { state, questions } = request;
    if (!("rank" in questions) && !("root" in questions)) return mock(request);
    const script = rounds[calls.length] ?? { rank: {}, go: 0 };
    calls.push({ state, questions });
    const answers: Record<string, JevAnswer> = {};
    for (const [name, q] of Object.entries(questions)) {
      if (name === "root") answers[name] = { choice: "page", confidence: 1 };
      else if (name === "rank" && q.type === "choice") {
        const probabilities = Object.fromEntries(
          Object.keys(q.criteria).map((id) => [id, script.rank[id] ?? 0]),
        );
        const top = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]![0];
        answers[name] = { choice: top, confidence: 0.5, probabilities };
      } else if (name === "any_fit" || name === "more") answers[name] = { noul: script.go };
      else if (name === "contact") answers[name] = { noul: contact };
      else answers[name] = { choice: Object.keys((q as { criteria: Record<string, string> }).criteria)[0] };
    }
    return { answers, inputTokens: 100 };
  };
  return { ask, calls };
}

/** Compose with a scripted Jev; return the selected candidate ids and the select step. */
async function selectWith(ask: Ask, message = "show me your blog posts about agents") {
  let last: ComposeEvent | undefined;
  for await (const event of composePage({
    prompt: message,
    route: routeWithMock({ message }),
    evaluate: withSitePolicy(ask),
    signal: new AbortController().signal,
  }))
    last = event;
  if (!last || last.type !== "complete") throw new Error("no completion");
  const select = last.steps[0]!;
  const picked = Object.values(select.answers ?? {})
    .filter((a) => a.choice.startsWith("use:"))
    .map((a) => a.choice.slice(4))
    .sort();
  return { picked, select, complete: last };
}

describe("listwise card ranking", () => {
  it("takes the top card, then more while under the round mass and above the round minimum", () => {
    expect(takeFromRound({ a: 0.89, b: 0.05, c: 0.03 })).toEqual(["a"]);
    expect(takeFromRound({ a: 0.39, b: 0.17, c: 0.12, d: 0.05 })).toEqual(["a", "b", "c"]);
    expect(takeFromRound({ a: 0.5, b: 0.27, c: 0.19 })).toEqual(["a", "b"]);
    // The top card is taken even when the spread is flat.
    expect(takeFromRound({ a: 0.05, b: 0.04 })).toEqual(["a"]);
  });

  // Shaped on jev-1.14.0 (2026-10-14): the per-card floor kept no post for this prompt.
  const blogRounds: Array<{ rank: Record<string, number>; go: number }> = [
    { rank: { post_0: 0.5, post_1: 0.27, build_unifi_agent: 0.19, stats_strip: 0.04 }, go: 0.68 },
    { rank: { post_2: 0.56, build_unifi_agent: 0.19, stats_strip: 0.1, post_3: 0.15 }, go: 0.79 },
    { rank: { post_3: 0.86, stats_strip: 0.14 }, go: 0.83 },
    { rank: { stats_strip: 0.54, bio_background: 0.26 }, go: 0.18 },
  ];

  it("keeps every post for a blog request and stops when the visitor wants nothing more", async () => {
    const { ask, calls } = scriptedAsk(blogRounds);
    const { picked, select } = await selectWith(ask);
    expect(calls).toHaveLength(4);
    expect(picked).toEqual(
      ["build_unifi_agent", "hero", "links", "post_0", "post_1", "post_2", "post_3", "section_building", "section_writing"].sort(),
    );
    expect(picked).not.toContain("stats_strip");
    // Every round's tokens are counted on the select step.
    expect(select.inputTokens).toBe(400);
  });

  it("ranks without replacement: a later round never offers a card already taken", async () => {
    const { ask, calls } = scriptedAsk(blogRounds);
    await selectWith(ask);
    const options = (i: number) => Object.keys((calls[i]!.questions.rank as { criteria: Record<string, string> }).criteria);
    expect(options(0)).toContain("post_0");
    expect(options(1)).not.toContain("post_0");
    expect(options(1)).not.toContain("post_1");
    expect((calls[1]!.state.already_chosen as Array<{ id: string }>).map((c) => c.id)).toEqual(["post_0", "post_1"]);
    // Round 1 carries the composer's root question; later rounds do not.
    expect(calls[0]!.questions.root).toBeDefined();
    expect(calls[1]!.questions.root).toBeUndefined();
    // Layout, section, and always-included cards are never ranked.
    for (const id of ["page", "hero", "links", "section_writing"]) expect(options(0)).not.toContain(id);
  });

  it("keeps only the hero and links when the absolute check says nothing fits", async () => {
    const { ask, calls } = scriptedAsk([{ rank: { game_teaser: 0.89, bio_overview: 0.06 }, go: 0.25 }]);
    const { picked } = await selectWith(ask, "who won the game last night");
    expect(calls).toHaveLength(1);
    expect(picked).toEqual(["hero", "links"]);
  });

  it("decides contact with its own yes/no, never as a ranking option", async () => {
    const rounds: Array<{ rank: Record<string, number>; go: number }> = [
      { rank: { bio_overview: 0.82, contact_cta: 0.1 }, go: 0.85 },
      { rank: {}, go: 0.3 },
    ];
    const yes = scriptedAsk(rounds, 0.9);
    const { picked } = await selectWith(yes.ask, "I'm organizing an AI meetup and looking for a speaker");
    expect(Object.keys((yes.calls[0]!.questions.rank as { criteria: Record<string, string> }).criteria)).not.toContain("contact_cta");
    expect(yes.calls[0]!.questions.contact?.type).toBe("noul");
    expect(picked).toContain("contact_cta");
    expect(picked).toContain("section_contact");
    const no = scriptedAsk(rounds, 0.2);
    expect((await selectWith(no.ask, "I'm organizing an AI meetup")).picked).not.toContain("contact_cta");
  });

  it("shows contact when the visitor wants it even though no ranked card fits", async () => {
    const { ask, calls } = scriptedAsk([{ rank: { bio_overview: 0.6, post_0: 0.3 }, go: 0.2 }], 0.9);
    const { picked } = await selectWith(ask, "How can I email Kevin?");
    expect(calls).toHaveLength(1);
    expect(picked).toEqual(["contact_cta", "hero", "links", "section_contact"].sort());
  });

  it("asks more of a later round than of round 1 before taking its cards", async () => {
    const between = (CONTINUE_FLOOR + MORE_FLOOR) / 2;
    const { ask, calls } = scriptedAsk([
      { rank: { post_0: 1 }, go: between },
      { rank: { post_1: 1 }, go: between },
    ]);
    const { picked } = await selectWith(ask);
    expect(calls).toHaveLength(2);
    expect(picked).toContain("post_0");
    expect(picked).not.toContain("post_1");
  });

  it(`stops after ${MAX_RANK_ROUNDS} rounds even when the visitor keeps wanting more`, async () => {
    const ids = ["role_0", "role_1", "role_2", "education", "skill_tags", "bio_overview"];
    const rounds = ids.map((id) => ({ rank: { [id]: 1 }, go: MORE_FLOOR + 0.3 }));
    const { ask, calls } = scriptedAsk(rounds);
    const { picked } = await selectWith(ask, "show me everything");
    expect(calls).toHaveLength(MAX_RANK_ROUNDS);
    expect(picked).toContain("role_0");
    expect(picked).not.toContain(ids[MAX_RANK_ROUNDS]!);
  });
});

/**
 * A stand-in for the Workers AI binding. The router questions get canned
 * answers with a settable `is_follow_up`; every composer question goes to the
 * offline mock. Nothing here touches the network.
 */
function fakeAi(followUp: number) {
  const mock = createMockAsk();
  return {
    async run(model: string, body: { state: Record<string, unknown>; questions: Record<string, JevQuestion> }) {
      expect(model).toBe("typesafe/jev");
      if ("visitor" in body.questions)
        return {
          model: "jev-test",
          answers: {
            visitor: { type: "choice", choice: "recruiter", confidence: 0.9, probabilities: {} },
            wants_resume: { type: "noul", noul: 0.95 },
            wants_projects: { type: "noul", noul: 0.2 },
            wants_writing: { type: "noul", noul: 0.1 },
            wants_stats: { type: "noul", noul: 0.2 },
            wants_game: { type: "noul", noul: 0.05 },
            wants_contact: { type: "noul", noul: 0.8 },
            is_follow_up: { type: "noul", noul: followUp },
            depth: { type: "choice", choice: "detail", confidence: 0.8, probabilities: {} },
          },
          usage: { input_tokens: 700, output_tokens: 0 },
        };
      const { answers } = await mock({ state: body.state, questions: body.questions });
      return {
        model: "jev-test",
        answers: Object.fromEntries(
          Object.entries(answers).map(([name, a]) => [
            name,
            body.questions[name]!.type === "noul"
              ? { type: "noul", noul: a.noul }
              : { type: "choice", choice: a.choice, confidence: a.confidence ?? 1, probabilities: a.probabilities ?? {} },
          ]),
        ),
        usage: { input_tokens: 1200, output_tokens: 0 },
      };
    },
  };
}

function testEnv(followUp: number, limited = false): Env {
  return {
    AI: fakeAi(followUp),
    COMPOSE_LIMITER: { limit: async () => ({ success: !limited }) },
    CHAT_LIMITER: { limit: async () => ({ success: true }) },
    ASSETS: { fetch: async () => new Response("") },
    ANTHROPIC_API_KEY: "",
  } as unknown as Env;
}

const testCtx = {
  waitUntil: () => {},
  passThroughOnException: () => {},
  props: {},
} as unknown as ExecutionContext;

async function post(env: Env, body: unknown) {
  const request = new Request("https://kevinjmagnan.com/api/compose", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleCompose(request, env, testCtx);
}

async function readEvents(response: Response) {
  const text = await response.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("handleCompose", () => {
  it("answers 400 when the prompt is empty", async () => {
    for (const body of [{}, { prompt: "" }, { prompt: "   " }, { persona: "recruiter" }]) {
      const response = await post(testEnv(0.1), body);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "prompt required" });
    }
  });

  it("answers 429 when the rate limiter says no", async () => {
    const response = await post(testEnv(0.1, true), { prompt: "show me the resume" });
    expect(response.status).toBe(429);
  });

  it("edits the attached page when is_follow_up is high and starts fresh when it is low", async () => {
    // A page the visitor is already looking at, with ids a fresh compose
    // would never produce.
    const initialSpec = {
      root: "existing_page",
      elements: {
        existing_page: { type: "Page", props: {}, children: ["existing_writing"] },
        existing_writing: {
          type: "Section",
          props: { title: "Writing", eyebrow: null },
          children: ["existing_post"],
        },
        existing_post: {
          type: "PostCard",
          props: {
            title: "The Age of Cheap Intelligence",
            summary: "An essay.",
            date: "2025-10-13",
            url: "https://kevinjmagnan.com/2025/10/13/the-age-of-cheap-intelligence.html",
          },
          children: [],
        },
      },
    } as unknown as Spec;
    const prompt = "shorten the page a bit";

    const edited = await readEvents(await post(testEnv(0.8), { prompt, initialSpec }));
    const editRoute = edited.find((e) => e.type === "route")!;
    expect(editRoute.mode).toBe("edit");
    expect(editRoute.followUp).toBe(0.8);
    const editComplete = edited.find((e) => e.type === "complete") as {
      spec: Spec | null;
    };
    expect(Object.keys(editComplete.spec!.elements)).toContain("existing_post");
    expect(editComplete.spec!.root).toBe("existing_page");

    const fresh = await readEvents(await post(testEnv(0.2), { prompt, initialSpec }));
    const freshRoute = fresh.find((e) => e.type === "route")!;
    expect(freshRoute.mode).toBe("new");
    expect(freshRoute.followUp).toBe(0.2);
    const freshComplete = fresh.find((e) => e.type === "complete") as {
      spec: Spec | null;
    };
    expect(Object.keys(freshComplete.spec!.elements)).not.toContain("existing_post");
    expect(Object.values(freshComplete.spec!.elements).map((e) => e.type)).toContain("Hero");
  });

  it("streams the route event before the composition finishes", async () => {
    const response = await post(testEnv(0.1), {
      prompt: "I'm a recruiter evaluating Kevin for a role.",
    });
    expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    const reader = response.body!.getReader();
    const first = await reader.read();
    const firstLine = new TextDecoder().decode(first.value).split("\n")[0]!;
    const event = JSON.parse(firstLine) as { type: string; evaluator: string };
    expect(event.type).toBe("route");
    expect(event.evaluator).toBe("workers-ai");
    await reader.cancel();
  });
});
