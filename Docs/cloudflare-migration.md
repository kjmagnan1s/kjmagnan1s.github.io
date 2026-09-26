# Cloudflare migration

kevinjmagnan.com moved from GitHub Pages plus a Netlify Function to a single
Cloudflare Worker that serves the Jekyll build as static assets and handles
`/api/*` itself.

Worker name: `kevinjmagnan-com`
Cloudflare account: `Kjmagnan1s@gmail.com's Account` (`716729a7277f99da0b33538c0d62ffd0`)
Wrangler auth profile: `personal` (already bound to this directory)

## How it fits together

```
request
  |
  +-- /              -> src/worker/markdown.ts  (HTML plus Link headers; Accept: text/markdown gets _site/index.md)
  +-- /api/chat      -> src/worker/chat.ts      (Claude, same-origin only, rate limited)
  +-- /api/compose   -> src/worker/compose/     (Workers AI, typesafe/jev)
  +-- /api/play      -> src/worker/play/        (home page playground, typesafe/jev, rate limited)
  +-- /api/subscribe -> src/worker/subscribe.ts (Beehiiv kit signup, same-origin only, rate limited)
  +-- /api/health    -> { "ok": true }
  |
  +-- everything else -> env.ASSETS.fetch(request) -> _site
```

`wrangler.jsonc` sets `run_worker_first: ["/", "/api/*", "/c/*"]`, so every other
static request goes straight to the assets layer without touching Worker code.
`not_found_handling: "404-page"` makes the assets layer serve the site's own
`404.html`. The `_redirects` file that Jekyll copies into `_site` is read by the
assets layer, and so is `_headers`.

**`/c/*` is served by the Worker, not by `_redirects`.** The old rule
`/c/*  /c/index.html  200` is rejected at deploy time with
`Invalid _redirects configuration: Line 3: Infinite loop detected in this rule`,
because the assets layer strips `/index` from the rewrite target and re-enters
the same rule. `src/worker/index.ts` serves `/c/index.html` for any `/c/` path
instead. Do not put that rule back: it fails the whole deploy, not just that
route.

## Run it locally

```sh
bundle install                 # once, or after a Gemfile change
bundle exec jekyll build       # writes _site
wrangler dev                   # serves _site plus the /api routes on :8787
```

`wrangler dev` does not run Jekyll. Rebuild the site whenever you change
templates or content, then reload. For live Jekyll reloading on content work,
`bundle exec jekyll serve` on :4000 still works; the chat API is allowlisted for
`http://localhost:4000` and `:4001` (and the `127.0.0.1` forms) so the chat modal
can call a running `wrangler dev` from there.

Local secrets go in `.dev.vars` (gitignored). Copy `.dev.vars.example` and fill
it in.

## Secrets

```sh
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put TYPESAFE_API_KEY   # /api/play, and the compose agent if it needs it
wrangler secret put BEEHIIV_API_KEY    # /api/subscribe
```

The Beehiiv publication ID is not a secret. It is the `BEEHIIV_PUBLICATION_ID`
var in `wrangler.jsonc`. Until both are set, `/api/subscribe` returns 503 with
`{"ok":false,"error":"not_configured"}`.

Secrets are per-Worker and per-environment. They are not in the repo and not in
`wrangler.jsonc`. Until `ANTHROPIC_API_KEY` is set, `/api/chat` returns a clean
503 with `{"error":"Failed to get response","details":"Chat is not configured yet."}`
instead of throwing.

## Deploy

```sh
npm install
npm run typecheck
npm test
bundle exec jekyll build
npm run deploy                 # wrangler deploy
```

`wrangler deploy` uploads the Worker script and everything under `_site`. There
is no build step on Cloudflare's side, so `_site` has to be current before you
deploy.

Confirm the right account first:

```sh
wrangler whoami                # must show the `personal` profile
```

## Rate limits

The Netlify function used Upstash Redis with a sliding window of 10 requests per
5 minutes per IP. The Workers Rate Limiting binding only accepts a period of 10
or 60 seconds, so that exact window cannot be expressed. The replacement:

| Binding           | Route          | Limit          | Notes                                        |
| ----------------- | -------------- | -------------- | -------------------------------------------- |
| `CHAT_LIMITER`    | `/api/chat`    | 2 per 60s      | Same long-run average as 10 per 5 min, tighter burst |
| `COMPOSE_LIMITER` | `/api/compose` | 6 per 60s      | New endpoint, no prior baseline              |
| `SUBSCRIBE_LIMITER` | `/api/subscribe` | 3 per 60s    | Kit signup, stops scripted list stuffing     |
| `PLAY_LIMITER`    | `/api/play`    | 12 per 60s     | Home page playground, each example chip is one Jev call |

The key is the `CF-Connecting-IP` header, which Cloudflare sets and a caller
cannot forge. The old function read `x-forwarded-for`, which a caller could.
If the limiter call itself throws, the request is logged and allowed through,
same as the Upstash behavior it replaces.

Rate limiting counters are per-Cloudflare-location and eventually consistent, so
enforcement is approximate. Measured on the deployed Worker, a burst of 15 POSTs
to `/api/chat` from one IP came back as a mix of 429 and pass-through rather than
a clean cutoff after the second request. Treat the limits as an abuse brake, not
an exact quota.

**The chat limit is tight and worth revisiting.** The Upstash window allowed a
burst of 10 before throttling; 2 per 60s does not. A recruiter who asks three
questions in a minute will hit a 429 mid-conversation. If that shows up in the
logs, raise it in `wrangler.jsonc`:

```jsonc
"simple": { "limit": 10, "period": 60 }
```

That restores the old burst allowance at a higher long-run ceiling, which is the
tradeoff the 10-or-60-second period forces.

## URL shape change: `.html` now redirects

On GitHub Pages, `/2025/10/13/age-of-cheap-intelligence.html` served a 200. The
Workers assets layer normalizes URLs (`html_handling` defaults to
`auto-trailing-slash`), so that path now returns a 307 to
`/2025/10/13/age-of-cheap-intelligence` and the content is served there.

Every internal post link and every sitemap entry still uses the `.html` form,
because the Jekyll permalink is `/:year/:month/:day/:title.html`. Nothing is
broken, but every post link costs a redirect hop and the canonical tag in the
page points at the `.html` URL the server redirects away from. Two ways out,
neither urgent:

- Leave it. Browsers and crawlers follow the 307.
- Change the permalink to `/:year/:month/:day/:title/` so the links, the
  canonical tags, and the served URL agree. That rewrites every post URL, so it
  needs `_redirects` entries for the old `.html` paths and a sitemap rebuild.

`html_handling: "none"` is not an option: it would stop `/about/` and `/blog/`
resolving to their `index.html` files.

## Origin policy

The Netlify function kept a CORS allowlist of production hostnames because the
API lived on a different domain. It does not any more. `/api/chat` now accepts a
request when the `Origin` header is absent, when it matches the request URL's own
origin, or when it is one of the four Jekyll dev origins. Everything else gets a
403 before any work happens. `/api/subscribe` applies the same check.

## DNS cutover

Do these in order. The site keeps serving off GitHub Pages until step 4.

1. **Move the zone to Cloudflare.** Add `kevinjmagnan.com` to the
   `Kjmagnan1s@gmail.com's Account` account, import the existing records, and
   change the nameservers at the registrar. Wait for the zone to go active.
   Nothing about the Worker changes at this step.
2. **Verify the Worker on workers.dev.** Walk the site on the
   `*.workers.dev` URL: homepage, `/resume.html`, a blog post, `/robots.txt`,
   a `/c/<slug>` page, and a 404. Set `ANTHROPIC_API_KEY` and send a real chat
   message.
3. **Attach the custom domain.** In the Cloudflare dashboard, Workers and Pages
   -> `kevinjmagnan-com` -> Settings -> Domains and Routes, add
   `kevinjmagnan.com` and `www.kevinjmagnan.com` as custom domains. Cloudflare
   creates the DNS records and the certificate. This is the moment traffic
   switches.
4. **Turn off the old hosts.** In the GitHub repo settings, disable GitHub Pages
   (and delete the `CNAME` file in a follow-up commit). In Netlify, delete the
   site or at minimum unlink the custom domain so nothing serves a stale copy.
   The `netlify/` directory and `netlify.toml` stay in the repo until the Worker
   has run clean for a week, then get removed.
5. **Clean up the hardcoded Netlify URLs.** Several pages still point the chat
   widget at the Netlify function directly: `igs.html`, `c/index.html`,
   `c/anthropic-csm-pubsec/index.html`, `c/anthropic-pm/index.html`,
   `c/openai-deployment-manager/index.html`, `anthropic/applied-ai-architect/index.html`,
   and `openai/ai-success-engineer/index.html`. They need to become `/api/chat`
   before Netlify goes away.

## Rollback

Re-enable GitHub Pages and point the DNS records back. The Worker can stay
deployed on workers.dev while you debug. Nothing in the Worker writes state, so
there is nothing to unwind.

## Observability

Logs are on (`observability.logs.enabled`). Tail them live with:

```sh
wrangler tail kevinjmagnan-com
```

## Shell

**The shell is parked.** The redesigned `index.html` sets `layout: null` (its
front matter exists only so it can use the shared header and footer includes),
so it doesn't render through `_layouts/default.html`. No page loads `genui.js`
or `genui.css`: the rewritten `_layouts/default.html` dropped them. The home
page's Jev playground calls `/api/play` instead. The shell source (`src/genui/`), its Vite build, and `/api/compose`
stay in the repo. The rest of this
section describes the shell as it worked on the old Jekyll-layout front page,
which provided the markup (the `#bg` mount point, the ask form, and the
`#composed` div) that the shell expects.

### Build order

```sh
npm run build:shell                  # vite build -> assets/genui/{genui.js,genui.css}
python3 scripts/generate_sitemap.py
bundle exec jekyll build
python3 scripts/generate_markdown.py # pandoc -> _site/index.md, needs pandoc installed
```

`npm run build:site` runs these in that order, and the order matters: Jekyll
copies `assets/` into `_site`, so the Vite output has to exist first. Filenames
are fixed (no content hash) because the layout that mounts the shell
references them literally. `vite.config.ts` sets `outDir: "assets/genui"`,
`emptyOutDir: true`, `cssCodeSplit: false`, and fixed
`entryFileNames`/`assetFileNames`.

`src/` stays excluded from Jekyll, so the client source never ships. The built
output under `assets/genui/` is gitignored, so run `npm run build:site` (or
`npm run build:shell`) before a Jekyll build that needs it.

Typecheck the client with `npm run typecheck:shell`
(`tsconfig.genui.json`). `npm run typecheck` still covers the Worker only.

### Animated background

The old front page had the mount point:

```html
<div id="bg" class="shell-bg" aria-hidden="true">
    <!-- animated background mounts here -->
</div>
```

`.shell-bg` in `src/genui/shell.css` is fixed to the viewport at `z-index: -1`
with `pointer-events: none`, and currently paints a static copper wash as a
placeholder. The real background replaces that rule and mounts inside the div.
It must stay non-interactive and must not change document height: the idle
front page fits the viewport with no scrolling at 1280x800 and at 390x844, and
that is a requirement, not an accident.

### States

`document.body[data-shell]` is `idle`, `composing`, or `composed`, and every
transition is CSS only behind `prefers-reduced-motion: no-preference`. The
layout ships `data-shell="idle"` in the HTML, so the idle page is correct before
any script runs.

### Talking to /api/compose

Every message posts `{ prompt, initialSpec, route }`. `initialSpec` and `route`
are the current page's, when there is one.

**The client strips `followUp` from the route it sends back.** `handleCompose`
reuses `body.route` verbatim whenever it carries a numeric `followUp`, so
sending the whole thing would pin every later message to the first message's
follow-up probability and no edit would ever be recognized. Without that field
the Worker re-asks the follow-up question for this message, which is what its
own tests do. If the Worker ever recomputes `followUp` on a reused route, this
can go back to sending the route whole.

A `complete` event with `stopReason: "unavailable"` keeps the current page and
says the request could not be applied. Cards link to their static twins with
absolute `kevinjmagnan.com` URLs; the client rewrites same-site URLs to paths so
a card click stays on whatever host is serving the page.

### site.css

`_layouts/default.html` no longer loads `main.css` or `site.css`; it loads
`assets/css/v2.css` only. The history below applies to the old layout.
`site.css` was a whole legacy skin
that had never been loaded, and its global rules fought `main.css`: it redefined
the `--text-primary` and `--text-secondary` tokens, set a white page background
and a sans body font, restyled every heading, link, section and button, and hid
every `[data-aos]` element (no AOS library loads, so those blocks would have
been invisible on `/about` and `/resume`). Those rules were removed on
2026-09-19. What is left is class-scoped and inert unless a page opts into it.
