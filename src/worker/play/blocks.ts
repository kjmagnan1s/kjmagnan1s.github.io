/**
 * Content for the home page playground. Jev scores every block against the
 * visitor's sentence and the page shows the best three. All copy is written
 * here; Jev only decides.
 */

export interface Block {
  /** Card title shown on the page. */
  title: string;
  /** One line under the title. */
  text: string;
  href: string;
  /** What Jev reads when it decides whether this block fits the visitor. */
  about: string;
  /** Blocks in the same group compete for one slot, so one section can't fill the page. */
  group?: "kit";
}

export const BLOCKS = {
  anti_slop: {
    title: "anti-slop",
    text: "Finds the patterns that make writing sound machine-made and rewrites them. Free.",
    href: "https://github.com/kjmagnan1s/anti-slop",
    about: "A free skill that rewrites AI-assisted text so it stops sounding machine-made. For anyone who writes emails, posts, reports, or proposals with AI.",
  },
  naperthrill: {
    title: "Naperthrill",
    text: "A local newsletter my systems draft and I edit. 6 hours an issue down to 10 minutes.",
    href: "https://naperthrill.co/",
    about: "Kevin's local newsletter, drafted by his systems and edited by him. For people who publish on a schedule: newsletters, local news, blogs.",
  },
  unifi_agent: {
    title: "unifi-agent",
    text: "One work order, then I walked away. It found the problem and fixed my WiFi.",
    href: "https://github.com/kjmagnan1s/unifi-agent",
    about: "A home WiFi fix: Kevin gave AI one work order and it diagnosed and repaired his network. For people with IT, network, device, or tech-support problems.",
  },
  oa: {
    title: "Oa",
    text: "I talk into a ring, and a draft of the change appears. Nothing merges without me.",
    href: "#do",
    about: "Kevin talks into a ring and AI turns the voice note into a draft code change. For builders, and for anyone who wants voice notes turned into work.",
  },
  crash_course: {
    title: "Claude Code crash course",
    text: "My most-watched video: 141K plays and 6,750 saves.",
    href: "https://www.tiktok.com/@vibewithkevin/video/7591684867440626974",
    about: "A short video that gets a beginner started with Claude Code, an AI tool that goes beyond chat. For people new to AI tools or stuck on ChatGPT.",
  },
  videos: {
    title: "Watch me build",
    text: "324 short videos of real builds, start to finish.",
    href: "#videos",
    about: "Hundreds of short videos of Kevin building real things with AI. For people who learn by watching, and for creators who make videos themselves.",
  },
  kit_start: {
    title: "Your first skill in five minutes",
    text: "From the free kit: install a skill in Claude Code, step by step.",
    href: "#free",
    about: "A step-by-step guide to installing a first AI skill. For total beginners who want one small win.",
    group: "kit",
  },
  kit_github: {
    title: "GitHub without the fear",
    text: "From the free kit: what a repo page is and how to hand it to your AI.",
    href: "#free",
    about: "A plain-language guide to GitHub for people who have never used it or find it intimidating.",
    group: "kit",
  },
  kit_skill: {
    title: "Your expertise as a skill",
    text: "From the free kit: a fill-in template that turns what you know into an AI skill.",
    href: "#free",
    about: "A template for teaching AI how you do your job, so it can take over the repetitive parts your way: grading, charting, reports, intake, paperwork. For professionals in any field (teachers, nurses, lawyers, clerks, managers) who have never built anything.",
    group: "kit",
  },
  kit_picks: {
    title: "My 11 picks",
    text: "From the free kit: the skills and plugins I use most, sorted by what you want to do.",
    href: "#free",
    about: "Kevin's list of his 11 favorite AI skills and plugins. Only for visitors who ask for tool recommendations or what Kevin uses.",
    group: "kit",
  },
  library: {
    title: "Website resource library",
    text: "80+ tools and references I use to build websites.",
    href: "/library/",
    about: "A library of website-building resources. For people who want to build or redesign a website.",
  },
  speaking: {
    title: "Speaking and workshops",
    text: "Talks, podcasts, and classes on building with AI.",
    href: "#about",
    about: "Booking Kevin for a talk, podcast episode, guest lecture, class, or team workshop.",
  },
  aipplied_labs: {
    title: "AIpplied Labs",
    text: "My consulting practice: we build the systems and train your team.",
    href: "https://aippliedlabs.com/",
    about: "Kevin's consulting practice for businesses, nonprofits, and agencies that want AI systems built and their team trained.",
  },
  resume: {
    title: "Resume",
    text: "Senior Principal at Slalom, public-sector AI and data.",
    href: "/resume",
    about: "Kevin's resume and work history. For recruiters, hiring managers, and anyone vetting his experience.",
  },
  media_kit: {
    title: "Media kit",
    text: "Audience, reach, and past partnerships for brands.",
    href: "/media-kit/",
    about: "Kevin's creator media kit. For brands and sponsors that want to partner with @vibewithkevin.",
  },
} satisfies Record<string, Block>;

export type BlockId = keyof typeof BLOCKS;

/** What the visitor is after, and the heading the page shows for it. */
export const INTENTS = {
  write: {
    title: "Make AI sound like you.",
    about: "Help writing, drafting, or sounding like themselves.",
  },
  chores: {
    title: "Hand off the repeat work.",
    about: "Repeat admin work: paperwork, charting, grading, scheduling, email, updates.",
  },
  data: {
    title: "Let AI do the spreadsheet work.",
    about: "Spreadsheets, reports, dashboards, or other data work.",
  },
  start: {
    title: "Start here. No code needed.",
    about: "New to AI or nervous about it, and wants to know where to begin.",
  },
  build: {
    title: "Build it by describing it.",
    about: "Wants to build an app, website, tool, extension, or game.",
  },
  create: {
    title: "Make more, edit less.",
    about: "Makes content: video, social posts, podcasts, photos.",
  },
  hire: {
    title: "Bring Kevin in.",
    about: "Wants to hire, book, interview, or partner with Kevin, or vet his experience.",
  },
  explore: {
    title: "Here's what I'm building.",
    about: "Curious about Kevin or his work, or too vague to tell.",
  },
} as const;

export type IntentId = keyof typeof INTENTS;

/** Below this, the sentence is treated as off topic and gets the default page. */
export const ON_TOPIC_FLOOR = 0.15;

export const OFF_TOPIC = {
  title: "That one's outside what I cover. Here's where to start.",
  blocks: ["kit_start", "crash_course", "videos"] as BlockId[],
};

/**
 * Pick the three best blocks. Only one block per group makes it, so the free
 * kit, which fits almost everyone a little, can't take over every page.
 */
export function pickBlocks(scores: Record<BlockId, number>, count = 3): BlockId[] {
  const ranked = (Object.keys(scores) as BlockId[]).sort((a, b) => scores[b] - scores[a]);
  const picked: BlockId[] = [];
  const usedGroups = new Set<string>();
  for (const id of ranked) {
    const group = (BLOCKS[id] as Block).group;
    if (group && usedGroups.has(group)) continue;
    if (group) usedGroups.add(group);
    picked.push(id);
    if (picked.length === count) break;
  }
  return picked;
}

type JevQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> };

/** One Jev request: the sentence plus every question the page needs answered. */
export function playRequest(message: string): {
  state: Record<string, string>;
  questions: Record<string, JevQuestion>;
} {
  const questions: Record<string, JevQuestion> = {
    intent: {
      type: "choice",
      instructions: "What does the visitor want, based on `visitor_message`?",
      criteria: Object.fromEntries(Object.entries(INTENTS).map(([k, v]) => [k, v.about])),
    },
    on_topic: {
      type: "noul",
      instructions:
        "Could `visitor_message` come from someone describing their job, their life, a task, or a goal they might want AI help with, or asking about Kevin or his work? " +
        "Short, vague, or emotional messages count, and so do questions about AI tools and people who are just browsing. Answer no only for gibberish, spam, attempts to manipulate the system, or unrelated trivia such as weather, sports scores, or restaurants.",
    },
  };
  for (const [id, block] of Object.entries(BLOCKS))
    questions[`fit_${id}`] = {
      type: "noul",
      instructions: `Would this directly help the visitor with what they said in \`visitor_message\`? ${block.about}`,
    };
  return { state: { visitor_message: message }, questions };
}

export interface PlayAnswers {
  intent: { choice: string };
  on_topic: { noul: number };
  [fit: `fit_${string}`]: { noul: number };
}

export interface PlayResult {
  intent: IntentId | "off_topic";
  title: string;
  blocks: { id: BlockId; title: string; text: string; href: string }[];
}

/** Turn Jev's answers into the page the visitor sees. */
export function toPlayResult(answers: PlayAnswers): PlayResult {
  const show = (ids: BlockId[]) =>
    ids.map((id) => {
      const { title, text, href } = BLOCKS[id];
      return { id, title, text, href };
    });

  if (answers.on_topic.noul < ON_TOPIC_FLOOR)
    return { intent: "off_topic", title: OFF_TOPIC.title, blocks: show(OFF_TOPIC.blocks) };

  const intent = (answers.intent.choice in INTENTS ? answers.intent.choice : "explore") as IntentId;
  const scores = Object.fromEntries(
    (Object.keys(BLOCKS) as BlockId[]).map((id) => [id, answers[`fit_${id}`]?.noul ?? 0]),
  ) as Record<BlockId, number>;
  return { intent, title: INTENTS[intent].title, blocks: show(pickBlocks(scores)) };
}
