# Development Log

## 2026-02-27

### Diagnostic: Full Website Health Check and Bug Fixes

**Overview:**
Ran a comprehensive diagnostic on kevinjmagnan.com using Chrome browser automation, codebase analysis, and GitHub/Netlify status checks. Identified three issues: the "Ask Me Anything" chat was erroring out due to Anthropic API spending limits (not a code bug), a portfolio image was 404ing due to a filename mismatch, and a stale 52MB binary was sitting in the repo. Fixed the two code issues and improved error handling so users see actionable messages instead of generic failures.

---

**Changes:**

1. `index.html:219` - Fixed portfolio image path
   - Before: `claude-code-dashboard.png` (hyphens, does not exist)
   - After: `claude_code_dashboard.png` (underscores, matches actual file on disk)

2. `_posts/2026-01-21-83-days-with-claude-code.md:7` - Fixed blog post thumbnail path
   - Before: `/assets/images/blog/claude-code-dashboard.png` (wrong directory, wrong filename)
   - After: `/assets/images/portfolio/claude_code_dashboard.png` (correct path)

3. `assets/js/conversation.js` - Improved error handling in three API call paths
   - `sendMessage()` (line 185): Parse error response body, detect rate-limit messages
   - `handleTriggerSubmit()` catch block: Show rate-limit-specific message with email fallback
   - `handleChatSubmit()` catch block: Same rate-limit handling
   - `handleFitAnalysis()` (line 309): Same pattern for fit analysis API calls

4. `assets/images/blog/Zoom.pkg` - Removed stale 52MB binary from repo

---

**Bugs Fixed:**

1. **Portfolio image 404** - The "83 Days with Claude Code" card in "What I've Made" showed broken alt text instead of the dashboard screenshot
   - Root cause: `index.html` referenced `claude-code-dashboard.png` (hyphens) but the actual file is `claude_code_dashboard.png` (underscores)
   - Also affected: Blog post thumbnail referenced a nonexistent path in `/assets/images/blog/`
   - Fix: Corrected both references to match the actual filename and directory

2. **Generic error message on API failure** - Users saw "Something went wrong. Please try again." with no indication the issue was temporary or what to do instead
   - Root cause: All API errors were caught and displayed with the same generic message
   - Fix: Frontend now parses the error response from the Netlify function, detects "usage limits" or "rate" in the error details, and shows: "The AI is temporarily unavailable due to API limits. Please try again later, or reach out directly at kjmagnan1s@gmail.com."

3. **Stale binary in repo** - `assets/images/blog/Zoom.pkg` (52MB) was deleted locally but not committed
   - Fix: Committed the deletion

---

**Diagnostic Findings (No Code Fix Needed):**

1. **"Ask Me Anything" chat broken** - Anthropic API returning 400: "You have reached your specified API usage limits. You will regain access on 2026-03-01 at 00:00 UTC."
   - Not a code bug. Spending limit needs to be increased in the Anthropic dashboard.
   - Affects both chat and fit analysis (same API key)

2. **Site health otherwise good:**
   - GitHub Pages status: "built", HTTPS cert valid through 2026-05-16
   - Last 5 Netlify deploys: all succeeded
   - Zero JavaScript console errors from site code (only noise from Chrome shopping extension)
   - All 14/15 network resources loaded successfully (only the image 404)
   - All 7 external links present and correct (LinkedIn, TikTok, GitHub, Bluesky, X, PackLlama, AIppliance)
   - Page layout, styling, and responsive behavior all clean

3. **Architecture note:** No rate limiting on the Netlify function endpoint, which likely contributed to hitting the API budget. Consider adding basic rate limiting in a future session.

---

**Testing:**

- Loaded kevinjmagnan.com in fresh Chrome tab (no cookies/cache issues)
- Verified all 7 images load (6/7 before fix, 7/7 after)
- Submitted "What is Kevin's background?" to Ask Me Anything
- Confirmed modal opens, loading messages cycle, then error displays
- Captured full API error chain: frontend fetch -> Netlify function 500 -> Anthropic API 400 (rate limited)
- Verified no site-originated JavaScript errors in console

---

**Impact:**

- Visitors now see the dashboard screenshot in the portfolio grid instead of broken alt text
- When the API is rate-limited, users get a clear message with an email fallback instead of a dead-end error
- Repo is 52MB lighter without the stale Zoom installer

---

**Files Modified:**

1. `index.html` - Fixed image path (1 line)
2. `_posts/2026-01-21-83-days-with-claude-code.md` - Fixed thumbnail path (1 line)
3. `assets/js/conversation.js` - Rate-limit error detection and messaging (+27 lines, -6 lines)
4. `assets/images/blog/Zoom.pkg` - Deleted (52MB binary)

---

**Commits:**

- `f38bba2` - fix: broken dashboard image and generic chat error messages

---

**Remaining Work:**

- [ ] Increase Anthropic API spending limit (or wait for March 1 reset)
- [ ] Consider adding rate limiting to Netlify function to prevent future budget exhaustion
- [ ] Push committed changes to origin

---

## 2026-01-28

### Feature: Anthropic CSM Public Sector Resume Agent Page

**Overview:**
Built a dedicated conversation page for the Anthropic Customer Success Manager, Public Sector role. This extends the existing "Ask Me Anything" resume agent system with role-specific context, prompting, and styling. Also fixed critical prompt engineering issues where the agent was hedging instead of speaking with conviction about wanting the job.

---

**Changes:**

1. `c/anthropic-csm-pubsec/index.html` - New dedicated conversation page
   - Custom greeting tailored to CSM role
   - Anthropic brand colors (#D4A574, #C4956A)
   - Open Graph and Twitter Card meta tags for social sharing
   - noindex/nofollow for privacy

2. `context/roles/anthropic-csm-pubsec.md` - Role context document
   - "Why I Want This Job" framing (not "Why This Role Excites Me")
   - Key talking points, experience highlights, questions
   - Things to emphasize vs. avoid

3. `c/index.html` - Added `anthropic-csm-pubsec` to ROLES config

4. `netlify/functions/claude-chat.js` - Multiple updates:
   - Added `anthropic-csm-pubsec` role context to `getRoleContext()`
   - Rewrote interview mode prompt for conviction-based responses
   - Added rule: "NEVER use markdown formatting" for plain text output

---

**Bugs Fixed:**

1. **Agent hedging instead of wanting the job** - When asked "why do you want to work at Anthropic," the agent responded with "I don't have specific information about Kevin wanting to work at Anthropic" and "If I were interested..."
   - Root cause: Interview prompt said "speak as if you're excited" which implied acting, not genuine intent
   - Fix: Changed to explicit "You WANT this job. You applied for it. This is not hypothetical." framing

2. **Markdown appearing in responses** - Raw `**bold**` syntax was showing in chat interface
   - Root cause: Claude was using markdown but frontend renders plain text
   - Fix: Added style rule "NEVER use markdown formatting (no **bold**, *italics*, bullet points, or headers)"

---

**Features Added:**

1. **Dedicated role page** - `/c/anthropic-csm-pubsec/` provides a shareable, role-specific conversation experience
2. **Conviction-based prompting** - Interview mode now frames Kevin as actively pursuing the role with deliberate career intent
3. **Role context system** - Extensible pattern for adding new role-specific pages with custom talking points

---

**Testing:**

- ✅ CSM page loads with correct greeting and Anthropic branding
- ✅ "Why do you want this job" now answered with conviction, not hedging
- ✅ Responses are plain text without markdown artifacts

---

**Documentation:**

- Created `/context/roles/anthropic-csm-pubsec.md` as source of truth for role talking points
- Updated ROLES config in `/c/index.html` for slug-based routing

---

**Impact:**

✅ Shareable URL for Anthropic CSM role: `kevinjmagnan.com/c/anthropic-csm-pubsec/`
✅ Agent speaks with the confidence of someone who wants the job
✅ Clean plain text output in conversation interface

---

**Files Modified:**

1. `c/anthropic-csm-pubsec/index.html` - New file (458 lines)
2. `context/roles/anthropic-csm-pubsec.md` - New file (111 lines)
3. `c/index.html` - Added role to ROLES config
4. `netlify/functions/claude-chat.js` - Role context + prompt fixes

---

**Commits:**

- `4983025` - Add Anthropic CSM Public Sector role page
- `9c45b51` - Fix resume agent to speak with conviction about wanting the job
- `caf10bc` - Disable markdown formatting in chat responses

---

**Remaining Work:**

- [ ] Decide whether to keep, update, or remove `anthropic-pm` role (Product Operations Manager)
- [ ] Push committed changes to origin
- [ ] Test with additional interview questions for persona validation

---

## 2026-01-17

### Bug Fix: API Endpoint Architecture for GitHub Pages + Netlify Hybrid Setup

**Overview:**
Debugged and fixed the Claude chat API which was returning 404/405 errors. Root cause: the site is hosted on GitHub Pages but the JavaScript was calling a relative Netlify function path. Fixed by using absolute Netlify URLs and clarified the hybrid architecture.

---

**Changes:**

1. `assets/js/conversation.js:11` - Updated API endpoint from relative to absolute URL
   - Before: `'/.netlify/functions/claude-chat'`
   - After: `'https://tubular-torte-6b51ae.netlify.app/.netlify/functions/claude-chat'`

2. `c/index.html:290` - Same fix for customized conversation pages

3. `package.json` - Fixed root package.json for Netlify function builds
   - Added `"type": "module"` for ESM support
   - Replaced `openai` dependency with `@anthropic-ai/sdk`

4. `netlify.toml` - Multiple configuration attempts (ultimately not needed for current setup)
   - Added redirect rule for `/c/*` paths
   - Added `force = true` flag
   - Added npm install to build command

---

**Bugs Fixed:**

1. **API returning 404/405** - The Netlify function existed and worked, but kevinjmagnan.com DNS points to GitHub Pages (185.199.x.x IPs), not Netlify. Relative API paths were hitting GitHub Pages which doesn't have the function.
   - Root cause: Hybrid architecture misunderstanding
   - Fix: Use absolute Netlify URL for API calls

2. **Custom conversation URLs returning 404** - `/c/anthropic-pm` works on Netlify (with redirects) but not GitHub Pages
   - Root cause: GitHub Pages doesn't support server-side redirects
   - Fix: Use query parameter format: `/c/?role=anthropic-pm`

3. **Function not deploying** - Root `package.json` was missing `"type": "module"` and had old `openai` dependency instead of `@anthropic-ai/sdk`

---

**Testing:**

- ✅ Main site chat (kevinjmagnan.com) - Working
- ✅ Netlify function directly (tubular-torte-6b51ae.netlify.app) - Working
- ✅ Custom role page via query param (`/c/?role=anthropic-pm`) - Working
- ❌ Custom role page via path (`/c/anthropic-pm`) - 404 on GitHub Pages (expected, use query param)

---

**Architecture Clarification:**

```
kevinjmagnan.com (GitHub Pages)
├── DNS: A records → 185.199.x.x (GitHub)
├── Static site: Jekyll build
├── /c/index.html - reads ?role= query param
└── JS calls absolute Netlify URL for API

tubular-torte-6b51ae.netlify.app (Netlify)
├── Hosts: Netlify Functions only
├── /.netlify/functions/claude-chat
└── ANTHROPIC_API_KEY in env vars
```

---

**Impact:**

✅ Chat functionality now works on production site
✅ Custom conversation pages work with query parameter format
✅ Clear understanding of hybrid GitHub Pages + Netlify architecture

---

**Files Modified:**

1. `assets/js/conversation.js` - Absolute API endpoint URL
2. `c/index.html` - Absolute API endpoint URL
3. `package.json` - ESM support and Anthropic SDK
4. `netlify.toml` - Build configuration updates

---

**Remaining Work (Updated):**

- [x] ~~Add ANTHROPIC_API_KEY to Netlify environment variables~~ Done
- [x] ~~Debug API 404/405 errors~~ Fixed
- [x] ~~Get chat working on production~~ Working
- [ ] Kevin writes actual content for context documents
- [ ] Test with real recruiter questions for persona validation

---

### Feature: AI Conversation and Fit Analysis Tools for Recruiters

**Overview:**
Built an interactive "conversation" section for kevinjmagnan.com where recruiters can chat with a Claude-powered AI that speaks as Kevin. Includes a chat modal for Q&A and a fit analysis tool that evaluates job descriptions.

---

**Changes:**

1. `netlify/functions/claude-chat.js` - Created new Netlify Function with Claude Sonnet 4.5 integration
   - System prompt with voice, personality, style rules, and boundaries
   - Two modes: `conversation` and `fit-analysis`
   - Response length constraints (3-5 sentences max)
   - Support for role-specific context via `roleSlug` parameter

2. `assets/js/conversation.js` - Chat and fit analysis frontend logic
   - Modal open/close with keyboard support (Escape to close)
   - Intersection Observer for scroll-triggered greeting reveal
   - Fade reveal animation (not typewriter as originally planned)
   - Cycling loading messages (12 messages, 5-second interval, pulse animation)
   - Fit analysis with JSON parsing for two-column results

3. `assets/css/conversation.css` - Complete styling (489 lines)
   - Chat modal with 70% viewport height
   - Fade reveal effect using `.revealed` class with opacity/color transitions
   - Loading spinner for Analyze button
   - Pulse animation for loading messages
   - Two-column fit results layout (responsive to single column on mobile)

4. `index.html` - Added two new sections before About
   - Conversation section with greeting and trigger form
   - Chat modal structure (header, body, footer)
   - Fit analysis section with textarea and results columns

5. `c/index.html` - Template for customized/unlisted role-specific versions
   - Standalone page for sending with job applications
   - Brand color support via CSS variables
   - Personalized greeting structure

6. `context/` folder structure - AI persona training documents
   - `/core/career-narrative.md`, `speaking-style.md`, `values-and-motivations.md`
   - `/experience/detailed-projects.md`, `impact-stories.md`
   - `/faq/common-questions.md`
   - `/roles/_template.md`, `README.md` (workflow documentation)

7. Configuration updates
   - `_config.yml` - Include _redirects, exclude context folder from Jekyll build
   - `_redirects` - Netlify redirects for `/c/*` URLs
   - `.gitignore` - Added `.env` for local API key storage
   - `_layouts/default.html` - Added conversation.css and conversation.js references

8. `api/chat.js` - Deprecated old Express router (placeholder redirect)

9. `netlify/functions/package.json` - Updated dependencies
   - Added `@anthropic-ai/sdk` ^0.39.0
   - Changed to ES modules (`"type": "module"`)

---

**Progress:**

✅ Phase 1: Backend Foundation - Complete
- Netlify Function created and working
- Claude Sonnet 4.5 integration operational
- Context loading structure in place

✅ Phase 2: Context Documents - Structure created (Kevin to write actual content)
- Folder structure and templates ready
- README with workflow documentation

✅ Phase 3: Chat Section - Complete
- Chat modal with fade reveal animations
- Modal opens on question submit
- Cycling loading messages during API call
- Response displays with fade reveal
- Follow-up questions supported in modal

✅ Phase 4: Fit Analysis Section - Complete
- Job description textarea with placeholder
- Loading spinner on Analyze button
- Two-column results (Strong Fit / Potential Gaps)
- Reset button to try another analysis

✅ Phase 5: Customized Versions - Structure created
- `/c/index.html` template ready
- Role context template and README created
- Brand color support implemented

⏳ Phase 6: Polish & Deploy - Partially complete
- Error handling implemented
- Mobile responsiveness tested
- Needs: Production API key in Netlify, final persona testing

---

**Features Added:**

1. **AI Chat Modal** - Recruiters ask questions, Kevin's AI responds in a modal popup
2. **Fit Analysis Tool** - Paste job description, get honest two-column assessment
3. **Customized Versions** - Unlisted pages with personalized greetings for specific roles
4. **Fade Reveal Animations** - Text fades in smoothly (changed from typewriter per user feedback)
5. **Cycling Loading Messages** - 12 different messages with pulse animation during API calls
6. **Concise Responses** - System prompt enforces 3-5 sentences max

---

**Bugs Fixed:**

1. **Wrong Claude model ID** - Initially used `claude-sonnet-4-5-20250514` (404 error), fixed to `claude-sonnet-4-5-20250929`
2. **Port conflicts** - Killed processes on ports 4000/8888 for local development

---

**Testing:**

- ✅ Chat modal opens on question submission
- ✅ Greeting fade reveal on scroll into view
- ✅ Loading messages cycle every 5 seconds with pulse animation
- ✅ Response displays with fade reveal
- ✅ Follow-up questions work in modal
- ✅ Fit analysis parses JSON and displays two-column results
- ✅ Loading spinner shows during analysis
- ✅ Reset button clears results and shows input again
- ✅ Modal closes on X button, overlay click, or Escape key
- ✅ Response length is concise (3-5 sentences)

---

**Documentation:**

- Created context document templates with guidance for Kevin to fill in
- Created README in `/context/roles/` with workflow for creating customized versions
- Plan documented at `.claude/plans/wondrous-weaving-unicorn.md`

---

**Dependencies:**

- Added: `@anthropic-ai/sdk` ^0.39.0
- Changed: `netlify/functions/package.json` to ES modules

---

**Impact:**

This feature transforms Kevin's portfolio site into an interactive experience for recruiters. Instead of passively reading a resume, recruiters can have a conversation with an AI that represents Kevin authentically. The fit analysis tool provides honest self-assessment, building trust by acknowledging both strengths and gaps.

---

**Files Modified:**

1. `.gitignore` - Added .env
2. `_config.yml` - Include _redirects, exclude context
3. `_layouts/default.html` - Added CSS/JS references
4. `_redirects` - NEW: Netlify redirects
5. `api/chat.js` - Deprecated placeholder
6. `assets/css/conversation.css` - NEW: 489 lines of styling
7. `assets/js/conversation.js` - NEW: 393 lines of logic
8. `c/index.html` - NEW: Customized version template
9. `context/README.md` - NEW: Context folder overview
10. `context/core/career-narrative.md` - NEW: Template
11. `context/core/speaking-style.md` - NEW: Template
12. `context/core/values-and-motivations.md` - NEW: Template
13. `context/experience/detailed-projects.md` - NEW: Template
14. `context/experience/impact-stories.md` - NEW: Template
15. `context/faq/common-questions.md` - NEW: Template
16. `context/roles/README.md` - NEW: Workflow docs
17. `context/roles/_template.md` - NEW: Role template
18. `index.html` - Added conversation and fit analysis sections
19. `netlify/functions/claude-chat.js` - NEW: Main API endpoint
20. `netlify/functions/package.json` - Updated dependencies

---

**Remaining Work:**

- [ ] Kevin writes actual content for context documents
- [ ] Add ANTHROPIC_API_KEY to Netlify environment variables for production
- [ ] Test customized versions with a real role
- [ ] Final persona testing with varied recruiter questions

---
