---
layout: post
title: "Claude Pilled 💊: How to Build a Dashboard from Your Claude Code Usage Data"
date: 2026-01-21
categories: [AI, Development, Tutorial]
description: "Claude Code tracks everything. Here's how to extract that data, prompt Claude to visualize it, and what patterns you might discover about your own AI collaboration habits."
thumbnail: /assets/images/portfolio/claude_code_dashboard.png
---

Claude Code tracks everything you do with it. Every message, every tool call, every model switch, every session. Most users never look at this data.

So I built a dashboard to visualize 83 days of my Claude Code usage. The process taught me just as much if not more about how I work with AI than any of the actual work did. Here's how to do it yourself.

*Credit: This idea came from [Thariq Shihipar](https://x.com/trq212), who works on Claude Code at Anthropic and [shared the approach on X](https://x.com/trq212/status/2013788736358887858).*

## What Claude Code Actually Collects

All your usage data lives in **~/.claude/**. Here's what's inside:

```
~/.claude/
├── stats-cache.json      # Aggregated usage statistics
├── history.jsonl         # Every command and prompt you've entered
├── todos/                # Task tracking from TodoWrite tool
├── plans/                # Implementation plans from plan mode
└── projects/             # Session transcripts per project
```

**stats-cache.json** is the goldmine. It contains:
- Daily activity (messages, sessions, tool calls per day)
- Model usage breakdown (tokens by model: Opus, Sonnet, Haiku)
- Hourly activity patterns (when you work)
- Longest session data
- Cache hit rates

**history.jsonl** is line-delimited JSON with every command you've typed. Each entry includes timestamp, project path, and the display text. This is where you can extract:
- Which projects you've worked on most
- What slash commands you use
- Language patterns (by parsing file extensions mentioned)
- Commit activity (searching for "commit" or "git push")

**todos/** contains JSON files tracking task completion across sessions.

## The Prompt That Built My Dashboard

Here's the prompt I used to kick off the dashboard build:

> "Analyze the data in ~/.claude/ for usage patterns, usage over time, how I've advanced in my Claude Code usage. Look at MCP tools and skill invocations, feedback loops or error loops. Look at how much activity we've generated from when I first used Claude Code to today. Create a user-centric dashboard that displays all of this in an intuitive way I can share. Include a packed bubble chart for MCP servers and a 3-column layout for skills by category. Have it open in a browser with D3.js animations, statistics, and big KPI numbers."

Claude Code then:
1. Explored each data source to understand the schema
2. Built a Node.js extraction script to aggregate the data
3. Created a single-file HTML dashboard with embedded CSS/JS
4. Used D3.js for charts and GSAP for animations

The key was being specific about the *output format* (browser-based, shareable, animated) while letting Claude figure out the *implementation details*.

## Building the Data Extraction Script

The first step is aggregating your data into a clean JSON file. Here's the core logic:

```javascript
// Key data points to extract
const dashboardData = {
  kpis: {
    totalMessages: stats.totalMessages,
    totalSessions: stats.totalSessions,
    estimatedCost: derived.estimatedCost,
    cacheSavings: derived.cacheSavings,
    hoursSaved: derived.hoursSaved
  },
  timeline: stats.dailyActivity.map(d => ({
    date: d.date,
    messages: d.messageCount,
    toolCalls: d.toolCallCount
  })),
  modelUsage: Object.entries(stats.modelUsage),
  hourlyActivity: Object.entries(stats.hourCounts),
  languages: extractLanguagesFromHistory(),
  commitsByDate: extractCommitsFromHistory(),
  // MCP servers you have configured
  configuredMcps: discoverMcpServers(),
  // Skills organized by category
  skillUsage: {
    all: extractSkillInvocations(),
    uniqueByCategory: { anthropic: 8, community: 1, user: 7 }
  }
};
```

The extraction script parses **history.jsonl** line by line, counting file extensions to determine language usage and searching for commit-related commands.

## Calculating Hours Saved

This metric surprised people. Here's the formula:

```javascript
// Tool calls save ~2 min of manual work each
const toolCallHours = (totalToolCalls * 2) / 60;

// Output tokens = generated code/text
// ~4 tokens per word, developer writes ~30 words/min
const codeGenHours = (totalOutputTokens / 4 / 30) / 60;

// Conservative multiplier (not all output is pure code)
const hoursSaved = Math.round(toolCallHours + codeGenHours * 0.3);
```

For my 83 days: **613 hours saved**. That's based on 10,000+ tool calls and 5.4M output tokens.

## Calculating Cost and Cache Savings

Claude Code's caching is aggressive. Here's how to calculate what you've actually spent vs. what you would have spent:

```javascript
const pricing = {
  'claude-opus-4-5-20251101': {
    input: 15, output: 75,
    cacheRead: 1.5, cacheWrite: 18.75
  },
  'claude-sonnet-4-5-20250929': {
    input: 3, output: 15,
    cacheRead: 0.30, cacheWrite: 3.75
  }
};

// Actual cost with caching
const actualCost = inputCost + outputCost + cacheReadCost + cacheWriteCost;

// What it would cost without cache
const fullPriceCost = ((inputTokens + cacheReadTokens) / 1M) * prices.input;

const cacheSavings = fullPriceCost - actualCost;
```

My numbers: **$4,710 actual cost**, **$17,594 saved from caching**. The cache system paid for itself four times over.

## What My Data Revealed

### Language Distribution Was Unexpected

I assumed my iOS work (Swift) would dominate. Instead:

| Language | Percentage |
|----------|------------|
| Kotlin | 43% |
| Swift | 26% |
| JavaScript | 12% |
| TypeScript | 9% |
| HTML | 6% |
| Java | 3% |

The Kotlin dominance came from porting a new app I'm developing in iOS over to Android, a massive 15-phase project I had frankly forgotten about because I shipped this work off to a handful of agents to rebuild in Android and I haven't had time to touch it since.

### Activity Clusters Around Shipping

The GitHub-style contribution graph showed clear patterns:
- November 21: 5,133 messages (final push before app store submission)
- January 17: 3,415 messages (Android port deadline)
- Long gaps between bursts (life happens)

Intensity correlates with deadlines, not consistent daily usage. Claude scales with urgency.

### Peak Hours: Evening Builder

My hourly heatmap peaked at 7-8 PM. I'm an evening builder, not a morning coder. This wasn't a surprise, but seeing it visualized reinforced that I should protect those hours.

### Model Usage Shifted Over Time

Early sessions: mostly Sonnet for speed.
Later sessions: mostly Opus for complex architectural work.

The data showed a clear transition as projects moved from prototyping to production. Different phases need different models.

### MCP Tools: The Hidden Multipliers

The packed bubble chart showing my connected MCP servers was eye-opening. Seven tools that extend Claude's capabilities:

- **Supabase** - Database queries and management
- **Claude in Chrome** - Browser automation and testing
- **Context7** - Documentation lookups
- **GitHub** - Repository operations
- **Playwright** - End-to-end testing
- **Slack** - Team notifications
- **Railway** - Deployment automation

These aren't just plugins—they're force multipliers. Each MCP connection means Claude can take action instead of just giving instructions.

### Skills: Workflows I Actually Use

The 3-column skills breakdown revealed my workflow patterns:

| Anthropic (8) | Community (1) | My Skills (7) |
|---------------|---------------|---------------|
| frontend-design | superpowers-brainstorming | document-progress |
| skill-creator | | project-onboarding |
| webapp-testing | | gemini-ui-generator |
| brand-guidelines | | legal-assistant |
| security-review | | social-digital-marketing |
| pdf, pptx, xlsx | | kevin-magnan-resume-builder |

The Anthropic skills handle document generation and code review. Community skills like brainstorming help with ideation. My custom skills automate repetitive project tasks—onboarding to new codebases, documenting progress, generating UI with Gemini.

## Prompts to Try Yourself

Start with exploration:
> "Analyze my ~/.claude/stats-cache.json and tell me my usage patterns"

Then go deeper:
> "Parse my ~/.claude/history.jsonl and show me which projects I've spent the most time on"

Build the visualization:
> "Create a single-file HTML dashboard with D3.js showing my Claude Code usage. Include: daily message timeline, model usage donut chart, hourly activity heatmap, language breakdown, MCP tools as a packed bubble chart, and skills organized in 3 columns by category. Make it dark mode with animated counters."

Customize the aesthetic:
> "Use the frontend-design skill to match my website's aesthetic: dark backgrounds, copper accents, Playfair Display headers"

## The Meta Lesson

Building a dashboard about your AI usage with your AI is recursive in a useful way. You learn:
- What data is available (more than you think)
- How Claude approaches data visualization
- What your actual working patterns are vs. what you assume

The dashboard itself took about two hours to build and iterate. The insights will shape how I work for much longer.

---

*My dashboard is live at [Claude Pilled 💊](/dashboard/claude-code-dashboard.html). Fork the approach, build your own, and see what your data reveals.*
