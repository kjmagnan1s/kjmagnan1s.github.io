---
layout: post
title: "From Idea to App Store: Building a Full-Stack App with AI in Three Months"
date: 2025-12-09
categories: [AI, Development, Personal]
description: "How I built and shipped AIppliance Manager:a full-stack mobile app with RAG, subscriptions, and push notifications:using Claude as my co-developer. No traditional dev team. Just persistence and a frontier model."
thumbnail: /assets/images/blog/aippliance_logo.jpeg
---

**Download AIppliance Manager:**
[App Store](https://apps.apple.com/us/app/aippliance-manager/id6754003121) | [Google Play](https://play.google.com/store/apps/details?id=com.smarthomeai.app) | [Website](https://aippliancemanager.com/)

---

Three months ago, I had an idea. Today, that idea is live on the App Store and Google Play.

My new app, AIppliance Manager, started as a simple frustration as a new homeowner: every time an appliance broke, or needed maintenance, or needed to be cleaned, I found myself hunched over trying to find a model number and googling for manual pdfs and error codes that returned forum posts from 2009. What if I could just ask my appliances questions and get real answers?

That idea became an app. And I built it almost entirely with AI.

## The Scope Was Ambitious

This was not a toy project. The final product includes:

- **Native apps for both iOS and Android**:SwiftUI for iOS, React Native for Android, sharing the same backend
- **Supabase backend** with PostgreSQL, Row Level Security, Edge Functions, and vector search
- **AI-powered Q&A** using Claude and Gemini with RAG (retrieval-augmented generation)
- **Railway-hosted services** for automatic manual discovery (web scrapers that find PDFs from manufacturer websites) and PDF parsing pipeline (extracts structured content:sections, tables, images:and generates embeddings)
- **YouTube integration** that surfaces relevant how-to videos and walkthroughs for each appliance model, tapping into the vast library of home repair professionals
- **Push notifications** for manual discovery status
- **RevenueCat subscription system** with custom paywall UI
- **Google and Apple Sign-In** via native SDKs
- **Multi-home support** for property managers or vacation homes
- **Camera recognition** using Gemini Vision to scan appliance labels

That is a lot of surface area. Authentication, payments, file storage, vector search, LLM orchestration, native mobile features, web scraping with bot detection bypass:across two platforms. Any one of these could be a sprint for a traditional team.

I shipped all of it in roughly **12 weeks**, working nights and weekends.

## Claude Was My Co-Developer

I have been writing about AI fluency for months. This project was the test.

With Claude Opus 4.5 by my side, I was able to architect, debug, document, and QA at scale. Every major decision, every edge case, every "why is this breaking" moment went through Claude Code on my terminal.

The development log tells the story. Over 1,300 lines of detailed session notes, tracking everything from schema migrations to OAuth race conditions to Parser_v2 heading detection bugs. Claude helped me write that log, helped me fix the bugs it documented, and helped me understand code libraries and app design which I had never touched before.

The key was never being blocked. When Google OAuth hung indefinitely in production, we switched to native SDKs. When the PDF parser created 1,300+ sections instead of 200, we traced it to a font-size bug and fixed the guard logic. When RevenueCat's paywall SDK broke on Android, we built a custom UI in an afternoon. Row Level Security policies conflicting with Edge Functions? Debugged and resolved. Supabase vector search returning irrelevant results? Tuned the similarity threshold and chunking strategy. Camera recognition misreading appliance labels? Added preprocessing and fallback flows.

Every problem had a solution. Every solution took hours or days, not weeks. That momentum:troubleshoot, fix, move forward:is what made this possible.

## What Surprised Me

The speed was remarkable, but the quality surprised me more.

I expected to ship something rough:a proof of concept I would need to heavily refine. Instead, both apps passed their respective store reviews. The architecture is clean enough that I can extend it. The code is documented. The edge cases are handled.

I would describe the problem, Claude would propose solutions, I would push back on complexity or ask about tradeoffs, and we would converge on something that worked. When bugs appeared, Claude would trace them systematically:reading logs, checking database state, proposing hypotheses, testing fixes.

The development log became a forcing function for quality. Every session, we documented what changed, what broke, what we learned. That discipline and standard I held my LLMs to saved me countless hours of re-debugging forgotten issues.

## What This Means for Builders

I am in no way a mobile developer. I work in consulting, focused on practical AI uses in public sector, advanced data visualizations, and public safety modernization. SwiftUI, React Native, Supabase, Railway, RevenueCat:these were all new to me a few months ago.

The cost and speed of building has been democratized. Not just in dollars, but in expertise. Frontier models compress the learning curve, turning specialized knowledge that once required teams or years into something accessible in weeks. What used to demand deep platform expertise in native mobile development, backend infrastructure, vector search, payment systems can now be learned and implemented in parallel.

This does not mean everyone will ship apps overnight. You still need creativity, problem-solving, persistence, and the ability to recognize when something is wrong. But the barrier has fundamentally shifted. The bottleneck is no longer "can I learn this technology?" It is "do I have an idea worth building?"

## What Comes Next

AIppliance Manager is live, but the roadmap is long. Better manual discovery for stubborn manufacturers. Image search using VLM-captioned diagrams. Multi-language support for international manuals. Multi-home support for property managers or vacation homes. Predictive maintenance alerts.

If you have been waiting for permission to build something ambitious with AI, stop waiting. The window is open. The models are capable. The only question is whether you will use them.

---

*AIppliance Manager is available now on the [App Store](https://apps.apple.com/us/app/aippliance-manager/id6754003121), [Google Play](https://play.google.com/store/apps/details?id=com.smarthomeai.app), and at [aippliancemanager.com](https://aippliancemanager.com/).*
