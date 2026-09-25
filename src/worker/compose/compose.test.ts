import type { Spec } from "@json-render/core";
import { describe, expect, it } from "vitest";
import type { Env } from "../env";
import { buildCandidates } from "./candidates";
import { catalog } from "./catalog";
import { composePage, MAX_ELEMENTS, type ComposeEvent } from "./compose";
import { createMockEvaluator, withSitePolicy } from "./evaluator";
import { handleCompose } from "./index";
import { routeWithMock } from "./router";

async function composeFor(message: string, persona: string | null = null) {
  const route = routeWithMock({ message, persona });
  let last: ComposeEvent | undefined;
  for await (const event of composePage({
    prompt: message || `Build the page for a ${route.visitor}.`,
    route,
    evaluate: withSitePolicy(createMockEvaluator()),
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
 * A stand-in for the Workers AI binding. The router questions get canned
 * answers with a settable `is_follow_up`; every composer question goes to the
 * offline mock. Nothing here touches the network.
 */
function fakeAi(followUp: number) {
  const mock = createMockEvaluator();
  return {
    async run(model: string, body: { state: Record<string, unknown>; questions: Record<string, { type: string; instructions: string; criteria?: Record<string, string> }> }) {
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
      const { answers } = await mock({
        state: body.state,
        questions: Object.fromEntries(
          Object.entries(body.questions).map(([name, q]) => [
            name,
            { type: "choice" as const, instructions: q.instructions, criteria: q.criteria ?? {} },
          ]),
        ),
        signal: new AbortController().signal,
      });
      return {
        model: "jev-test",
        answers: Object.fromEntries(
          Object.entries(answers).map(([name, a]) => [
            name,
            { type: "choice", choice: a.choice, confidence: a.confidence ?? 1, probabilities: {} },
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
