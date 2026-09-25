import {
  experimental_composeSpec,
  type Experimental_CompositionEvent,
  type Spec,
} from "@json-render/core";
import { catalog } from "./catalog";
import { buildCandidates } from "./candidates";
import type { Evaluate } from "./evaluator";
import { describeRoute, wantedTopics, type Route } from "./router";

/**
 * Element budget. The Workers AI context window for typesafe/jev is 32K
 * tokens and the prototype's largest real request was about 23K, so 24 leaves
 * room without changing the measured behavior.
 */
export const MAX_ELEMENTS = 24;
const JEV_USD_PER_INPUT_TOKEN = 0.042 / 1e6;

export type ComposeEvent =
  | Extract<Experimental_CompositionEvent, { type: "step" }>
  | (Extract<Experimental_CompositionEvent, { type: "complete" }> & {
      estimatedCostUsd: number | null;
    });

/** Compose a new page for the route, or edit `initialSpec` with a follow-up prompt. */
export async function* composePage(options: {
  prompt: string;
  route: Route;
  evaluate: Evaluate;
  signal: AbortSignal;
  initialSpec?: Spec;
}): AsyncGenerator<ComposeEvent> {
  const { route } = options;
  const candidates = buildCandidates();
  for await (const event of experimental_composeSpec({
    // The catalog satisfies the composer's structural type at runtime; the
    // generic wrapper types do not line up, so cast once here.
    catalog: catalog as never,
    candidates,
    prompt: options.prompt,
    initialSpec: options.initialSpec,
    elementDescriptions:
      options.initialSpec &&
      Object.fromEntries(
        Object.entries(options.initialSpec.elements).flatMap(([id, el]) => {
          const label = ["title", "name", "text"].find(
            (k) => typeof el.props[k] === "string",
          );
          return label ? [[id, `${el.type}; ${label}: ${JSON.stringify(el.props[label])}`]] : [];
        }),
      ),
    evaluate: options.evaluate,
    signal: options.signal,
    maxSteps: MAX_ELEMENTS,
    maxElements: MAX_ELEMENTS,
    maxDepth: 4,
    context: {
      visitor: describeRoute(route),
      wanted_topics: wantedTopics(route),
      platform:
        "Available: Kevin Magnan's hero and links, professional overview and background, agent-operations stats, skills, job roles, client projects, products, open-source tools, essays, education, a contact call to action, a recruiter fit-analysis box, and a game teaser. All text is prepared; nothing new can be written.",
    },
    instructions: {
      root: "Always choose Page as the root.",
      next:
        `${describeRoute(route)} Include the hero and links on every page. Include a Section for each content group you include, and only those. ` +
        (route.depth === "skim"
          ? "Keep it short: at most one section beyond the hero, with two or three cards."
          : "Include every section the visitor wants, with all matching cards."),
      parent:
        "Sections, Hero, Text, StatStrip, LinkRow, and GameTeaser go directly under Page. " +
        "RoleCards go in the Experience section. Client project cards (Statewide POST Modernization, Configurable Platforms) go in Selected work. " +
        "Product cards (AIpplied Labs, AI Recess, LeaderShift) and open-source tool cards (trim-hero, unifi-agent, anti-slop, slides, stardust) go in What I am building. " +
        "PostCards go in Writing. SkillTags and EducationList go in Skills and education. ContactCTA and FitAnalysis go in Get in touch.",
    },
  })) {
    if (event.type === "complete")
      yield {
        ...event,
        estimatedCostUsd:
          event.inputTokens === null ? null : event.inputTokens * JEV_USD_PER_INPUT_TOKEN,
      };
    else yield event;
  }
}
