/**
 * Prepared copy that does not live in _data/site.json: the tagline, the
 * agent-operations numbers, the products and open-source builds, the social
 * links, and the contact address. This is the prototype's data/extras.json,
 * moved into code so the Worker bundle carries it with no extra fetch.
 *
 * Nothing here is written by a model. Jev only chooses which of these appear.
 */

export const SITE_ORIGIN = "https://kevinjmagnan.com";

/** Canonical static pages the composed cards link to. These are the SEO twins. */
export const CANONICAL = {
  resume: `${SITE_ORIGIN}/resume`,
  building: `${SITE_ORIGIN}/building/`,
  play: `${SITE_ORIGIN}/play/`,
} as const;

export interface Stat {
  label: string;
  value: string;
}

export interface NamedLink {
  name: string;
  description: string;
  url: string;
}

export const tagline = "I build AI systems, and I run the agents that build them.";

export const subline =
  "15 years of public service and research behind the judgment. 7 weeks of logs behind the throughput.";

export const stats: Stat[] = [
  { label: "Tokens processed", value: "15.95B" },
  { label: "Commits", value: "206" },
  { label: "Pull requests merged", value: "51" },
  { label: "Agents spawned", value: "407" },
  { label: "Dynamic workflows", value: "27" },
  { label: "Claude Code skills", value: "14" },
];

export const statsPeriod =
  "August 11 to September 14, 2026, from local Claude Code logs and GitHub";

export const builds: NamedLink[] = [
  {
    name: "trim-hero",
    description:
      "Claude Code skill that profiles your real API payload, ranks what each turn pays for, and trims the bloat behind an approval gate.",
    url: "https://github.com/kjmagnan1s/trim-hero",
  },
  {
    name: "unifi-agent",
    description:
      "Safety-first agentic command and control for UniFi networks: hybrid API client, MCP server, and CLI with blast-radius guards.",
    url: "https://github.com/kjmagnan1s/unifi-agent",
  },
  {
    name: "anti-slop",
    description:
      "Detect, rewrite, and ingest AI slop, with a protect-list seam so it never flattens your voice.",
    url: "https://github.com/kjmagnan1s/anti-slop",
  },
  {
    name: "slides",
    description:
      "Turn an outline into a self-contained, animated HTML slide deck. 16 formats, presenter mode, PDF export.",
    url: "https://github.com/kjmagnan1s/slides",
  },
  {
    name: "stardust",
    description:
      "Local search and markdown export for your GitHub stars. Claude Code skill plus CLI.",
    url: "https://github.com/kjmagnan1s/stardust",
  },
];

export const products: NamedLink[] = [
  {
    name: "AIpplied Labs",
    description: "AI engineering studio, where everything else gets built.",
    url: "https://aippliedlabs.com",
  },
  {
    name: "AI Recess",
    description: "Community for AI builders, co-founded with two fellow creators.",
    url: "https://joinairecess.com",
  },
  {
    name: "LeaderShift",
    description: "AI consulting for the public sector.",
    url: "https://leadershift.app",
  },
];

export const links = [
  { label: "GitHub", href: "https://github.com/kjmagnan1s" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/kjmagnan1s/" },
  { label: "X", href: "https://x.com/KevinMagnan" },
  { label: "TikTok", href: "https://www.tiktok.com/@vibewithkevin" },
];

export const email = "kjmagnan1s@gmail.com";
