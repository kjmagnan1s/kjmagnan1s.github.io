---
layout: post
title: "PackLlama: Building a B2B AI Product in Two Weeks"
date: 2025-12-29
categories: [AI, Development, Startups]
description: "How I built PackLlama—a conversational AI moving inventory assistant—and deployed it as an embeddable B2B SaaS product. From frustrating forms to natural conversation, powered by Claude and Gemini."
thumbnail: /assets/images/blog/packllama.png
---

**Try the demo:** [packllama.app](https://packllama.app)

---

Moving companies have a lead quality problem. Every estimate starts with an inventory—how much stuff are you moving? But the tools they give customers are terrible: endless dropdown menus, 50-field spreadsheets, click-heavy room-by-room wizards. Half of users abandon before finishing. The other half submit incomplete lists that lead to inaccurate quotes and unhappy move days.

I built PackLlama to fix this. It is a conversational AI assistant that lets customers describe their belongings naturally—"I have a two-bedroom apartment with a home office and a lot of books"—and builds a complete, structured inventory through dialogue.

The widget is embeddable. Moving companies drop a script tag on their website. Their customers chat with an AI that feels like texting a helpful friend. The company gets detailed leads with cubic footage estimates, room breakdowns, and contact information. Everyone wins.

I built and deployed it in two weeks, working evenings and weekends. Claude was my architect. Gemini powers the conversations. Railway runs the infrastructure.

## The Stack

PackLlama is a monorepo with three packages:

- **@packllama/embed** — A React widget built with Vite, bundled as a single IIFE file that moving companies embed via iframe. Zustand for state, TanStack Query for server sync, Tailwind for styling. The entire bundle is under 100KB gzipped.

- **@packllama/api** — A Fastify server handling conversation orchestration, inventory management, and lead capture. Gemini 2.0 Flash powers the LLM layer with structured JSON output for reliable parsing. Supabase provides Postgres for persistence and will handle auth when the admin dashboard ships.

- **@packllama/shared** — Shared types, constants, and an item catalog with 200+ common household items, each with cubic footage and weight estimates.

The backend runs on Railway with auto-deploy from GitHub. Environment variables for API keys, CORS configuration, and Supabase credentials are managed through Railway's dashboard. The embed widget is served from a separate Railway service as a static bundle.

## How It Works

The conversation follows a simple loop: user describes belongings, AI extracts items, suggests what they might be forgetting, and confirms before moving on.

When a user says "I have a king bed and two nightstands in the master bedroom," the LLM returns structured JSON:

```json
{
  "message": "Got it—king bed and two nightstands for the master. Do you have a dresser or armoire in there too?",
  "actions": [
    { "type": "add_item", "item": "king_bed", "quantity": 1, "room": "master_bedroom" },
    { "type": "add_item", "item": "nightstand", "quantity": 2, "room": "master_bedroom" }
  ],
  "suggestions": ["dresser", "armoire", "mirror"]
}
```

The inventory panel updates in real-time. Users can tap suggestions to add them, adjust quantities, or remove items. When they are done, a lead capture form collects contact info, move dates, and addresses. The moving company gets an email with the complete inventory—or a webhook payload if they have a CRM integration.

The magic is in the suggestions. PackLlama knows that beds usually come with frames and mattresses. That one nightstand probably means two. That a garage means bikes, tools, and seasonal storage. That a home office means a desk, chair, monitors, and probably a filing cabinet. These contextual prompts catch items users forget to mention—which means more accurate estimates and fewer surprises on move day.

## Claude as Architect

This project would not exist without Claude.

Every architectural decision—monorepo structure, Vite library builds, esbuild bundling for Node.js ESM, CORS configuration for cross-origin embeds—was a conversation. When Railway deployments failed because pnpm workspace dependencies were not building in the right order, Claude traced the issue and fixed the build scripts. When the React bundle crashed in production with "process is not defined," Claude identified that React's CJS production build checks `process.env.NODE_ENV` at runtime and proposed a polyfill.

The development log has entries like:

> **ESM module resolution failures** — API crashed with "Cannot find module './services/conversation'" because tsconfig uses `moduleResolution: bundler` but Node.js runs compiled files directly. Fixed by switching from `tsc` to `esbuild` bundling with explicit external dependencies.

That is not a bug I would have diagnosed quickly on my own. With Claude, it took thirty minutes from crash to fix.

The rebrand from "MoveFlow" to "PackLlama" happened in a single session. New color palette, new CSS variables, new Tailwind theme, new header, updated across three packages and a marketing website. Claude did not just find-and-replace. It understood the brand system and updated colors contextually—accent colors, hover states, focus rings, gradients.

## What Comes Next

PackLlama is live, but the roadmap is long:

- **Admin dashboard** for moving companies to view leads, configure branding, and manage webhook integrations
- **Photo-based inventory** using Gemini Vision—snap a picture of your living room, get suggested items
- **CRM integrations** with MoveitPro, SmartMoving, and other industry tools
- **Price estimation** by connecting inventory data to moving company rate cards
- **Multi-language support** for the increasingly diverse moving market

The B2B model is straightforward: per-lead pricing to start, graduating to SaaS subscriptions as value is proven. Moving companies pay for qualified leads with complete inventories. Customers get a frictionless experience. PackLlama captures the spread.

## The Takeaway

Two weeks ago, this was an idea. Today, it is a deployed product with a marketing site, a live demo, and a clear path to revenue.

The tools have changed. Frontier models compress what used to take teams and months into focused sprints. The question is no longer "can I build this?" It is "is this worth building?"

For PackLlama, the answer was obvious. Moving inventory is a solved problem poorly executed. Conversational AI makes the solution feel effortless. The market is fragmented and underserved.

If you are sitting on an idea like this—a clear pain point, a better approach, a market ready for disruption—stop waiting. The models are capable. The infrastructure is cheap. The only bottleneck is you.

---

*PackLlama is live at [packllama.app](https://packllama.app). Moving companies interested in embedding the widget can reach out at [aippliedlabs@gmail.com](mailto:aippliedlabs@gmail.com).*
