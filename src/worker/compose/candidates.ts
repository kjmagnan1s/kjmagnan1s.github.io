import type { Experimental_CompositionCandidate } from "@json-render/core";
import site from "../../../_data/site.json";
import {
  builds,
  CANONICAL,
  email,
  links,
  products,
  SITE_ORIGIN,
  stats,
  statsPeriod,
  subline,
  tagline,
} from "./content";

export type Candidate = Experimental_CompositionCandidate;

/** Topics each candidate serves. Used by the mock evaluator and for tests; never sent to Jev. */
export const candidateTopics = new Map<string, string[]>();
/** The section each card belongs in. Code enforces this; Jev is told it in plain words. */
export const sectionOf = new Map<string, string>();
export const ALWAYS_INCLUDED = ["hero", "links"];

/** Every card links to its static twin. `navigate` fires only on user interaction. */
function press(url: string) {
  return { press: { action: "navigate", params: { url } } };
}

/**
 * Atomic element recipes built from the site's data files. Descriptions carry
 * the whole signal for Jev: the composer sends descriptions, not props.
 */
export function buildCandidates(): Candidate[] {
  const out: Candidate[] = [];
  candidateTopics.clear();
  sectionOf.clear();
  function add(
    id: string,
    description: string,
    element: Candidate["element"],
    opts: Partial<Pick<Candidate, "root" | "maxUses" | "resource">> & {
      topics?: string[];
    } = {},
  ) {
    const { topics = [], ...rest } = opts;
    out.push({ id, description, element, root: false, ...rest });
    candidateTopics.set(id, topics);
  }

  // Layout
  add(
    "page",
    "Page: the outermost vertical container for the whole personalized page. Always the root.",
    { type: "Page", props: {} },
    { root: true },
  );
  add(
    "hero",
    "Hero: Kevin's name with the tagline about building AI systems and running agents. Conventional at the top of every page.",
    {
      type: "Hero",
      props: {
        name: site.person.name,
        tagline,
        subline,
      },
    },
    { topics: ["always"] },
  );
  const sections: Array<[string, string, string | null, string, string[]]> = [
    ["experience", "Experience", "Where I have worked", "job role cards", ["resume"]],
    ["work", "Selected work", "Client projects", "client project cards for public-sector agencies (Statewide POST Modernization, Configurable Platforms)", ["projects", "resume"]],
    ["building", "What I am building", "Products and open source", "product cards (AIpplied Labs, AI Recess, LeaderShift) and open-source tool cards (trim-hero, unifi-agent, anti-slop, slides, stardust)", ["projects", "builds"]],
    ["writing", "Writing", "Essays and analysis", "essay cards", ["writing"]],
    ["credentials", "Skills and education", null, "the skill tags and the education list", ["resume"]],
    ["contact", "Get in touch", null, "the contact call to action and the fit-analysis box", ["contact"]],
  ];
  for (const [key, title, eyebrow, holds, topics] of sections)
    add(
      `section_${key}`,
      `Section titled "${title}": holds ${holds}. Include only when at least one of those cards is included.`,
      { type: "Section", props: { title, eyebrow } },
      { topics },
    );

  // Identity
  add(
    "bio_overview",
    "Text: one-paragraph professional overview (Senior Principal, Justice and Public Safety at Slalom; public sector data strategy, analytics, and AI). Good for recruiters and anyone wanting a summary.",
    { type: "Text", props: { text: site.about.overview, variant: "lead" } },
    { topics: ["resume", "summary"] },
  );
  add(
    "bio_background",
    "Text: background paragraph about starting as a police officer and moving into data and technology consulting. Good for readers who want the story behind the work.",
    { type: "Text", props: { text: site.about.background, variant: "body" } },
    { topics: ["story", "resume"] },
  );
  add(
    "stats_strip",
    "StatStrip: agent-operations numbers from the last five weeks (tokens processed, commits, pull requests, agents spawned, workflows, skills). Good for engineers and founders judging throughput.",
    {
      type: "StatStrip",
      props: { stats, caption: statsPeriod },
    },
    { topics: ["stats", "engineering", "founder"] },
  );
  add(
    "skill_tags",
    "SkillTags: tag list of core skills (public safety technology, CJIS compliance, AI strategy, cloud architecture, data analytics, government modernization).",
    { type: "SkillTags", props: { skills: site.skills, url: CANONICAL.resume } },
    { topics: ["resume"] },
  );

  // Experience
  let roleIndex = 0;
  for (const employer of site.experience)
    for (const position of employer.positions) {
      const achievements: string[] =
        "achievements" in position && position.achievements ? position.achievements : [];
      add(
        `role_${roleIndex++}`,
        `RoleCard: ${position.title} at ${employer.company}, ${position.period}${achievements.length ? `, with ${achievements.length} listed achievements` : ""}. Resume content for recruiters and hiring managers.`,
        {
          type: "RoleCard",
          props: {
            company: employer.company,
            title: position.title,
            period: position.period,
            location: employer.location,
            achievements,
            url: CANONICAL.resume,
          },
          on: press(CANONICAL.resume),
        },
        { topics: ["resume"] },
      );
      sectionOf.set(`role_${roleIndex - 1}`, "section_experience");
    }

  // Projects and builds
  for (const project of site.projects)
    add(
      `project_${project.id}`,
      `ProjectCard: ${project.name}, ${project.summary}. Client work in ${project.type.toLowerCase()}. Good for recruiters and public-sector readers.`,
      {
        type: "ProjectCard",
        props: {
          name: project.name,
          summary: project.summary,
          tags: project.tags,
          kind: project.type,
          url: `${SITE_ORIGIN}${project.url}`,
        },
        on: press(`${SITE_ORIGIN}${project.url}`),
      },
      { topics: ["projects", "resume", "public_sector"] },
    );
  for (const project of site.projects) sectionOf.set(`project_${project.id}`, "section_work");
  for (const product of products)
    add(
      `product_${product.name.toLowerCase().replace(/\W+/g, "_")}`,
      `ProjectCard: ${product.name}, ${product.description} A product or company Kevin runs. Good for founders and anyone asking what he has built.`,
      {
        type: "ProjectCard",
        props: {
          name: product.name,
          summary: product.description,
          tags: [],
          kind: "Product",
          url: CANONICAL.building,
        },
        on: press(CANONICAL.building),
      },
      { topics: ["projects", "builds", "founder"] },
    );
  for (const product of products)
    sectionOf.set(`product_${product.name.toLowerCase().replace(/\W+/g, "_")}`, "section_building");
  for (const build of builds)
    add(
      `build_${build.name.replace(/\W+/g, "_")}`,
      `ProjectCard: ${build.name}, open-source tool: ${build.description} Good for engineers and founders evaluating what Kevin ships.`,
      {
        type: "ProjectCard",
        props: {
          name: build.name,
          summary: build.description,
          tags: ["open source", "Claude Code"],
          kind: "Open source",
          url: CANONICAL.building,
        },
        on: press(CANONICAL.building),
      },
      { topics: ["builds", "engineering", "projects"] },
    );
  for (const build of builds)
    sectionOf.set(`build_${build.name.replace(/\W+/g, "_")}`, "section_building");

  // Writing
  for (const [i, post] of site.publications.slice(0, 4).entries())
    add(
      `post_${i}`,
      `PostCard: essay "${post.title}" (${post.date}): ${post.summary}. Good for readers interested in AI and public-sector writing.`,
      {
        type: "PostCard",
        props: {
          title: post.title,
          summary: post.summary,
          date: post.date,
          url: `${SITE_ORIGIN}${post.url}`,
        },
        on: press(`${SITE_ORIGIN}${post.url}`),
      },
      { topics: ["writing"] },
    );
  for (const i of site.publications.slice(0, 4).keys()) sectionOf.set(`post_${i}`, "section_writing");

  // Credentials and contact
  add(
    "education",
    "EducationList: graduate degrees. Resume content.",
    {
      type: "EducationList",
      props: {
        items: site.education.map((e) => ({
          institution: e.institution,
          degree: e.degree,
          honors: "honors" in e ? e.honors : null,
        })),
        url: CANONICAL.resume,
      },
    },
    { topics: ["resume"] },
  );
  add(
    "links",
    "LinkRow: GitHub, LinkedIn, X, and TikTok links. Conventional near the top or bottom of any page.",
    { type: "LinkRow", props: { links } },
    { topics: ["always"] },
  );
  add(
    "contact_cta",
    "ContactCTA: invitation to email Kevin with a button. Include when the visitor might want to reach out (recruiters, founders, press).",
    {
      type: "ContactCTA",
      props: {
        heading: "Let's talk",
        text: "Email is the fastest way to reach me.",
        buttonLabel: "Email Kevin",
        url: `mailto:${email}`,
      },
      on: press(`mailto:${email}`),
    },
    { topics: ["contact", "resume", "founder"] },
  );
  add(
    "fit_analysis",
    "FitAnalysis: a box where a recruiter pastes a job description and gets an honest fit assessment. Only for recruiters and hiring managers.",
    {
      type: "FitAnalysis",
      props: {
        heading: "Check the fit",
        placeholder: "Paste a job description...",
      },
    },
    { topics: ["recruiter"] },
  );
  sectionOf.set("skill_tags", "section_credentials");
  sectionOf.set("education", "section_credentials");
  sectionOf.set("contact_cta", "section_contact");
  sectionOf.set("fit_analysis", "section_contact");
  add(
    "game_teaser",
    "GameTeaser: card inviting the visitor to play a side-scroller whose levels Jev builds as you run. Include when the visitor asked to play or is just curious.",
    {
      type: "GameTeaser",
      props: {
        title: "Play the level Jev builds",
        text: "A 2D runner where the next stretch of terrain is decided in real time.",
        url: CANONICAL.play,
      },
      on: press(CANONICAL.play),
    },
    { topics: ["game", "curious"] },
  );
  return out;
}
