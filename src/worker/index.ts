import type { Env } from "./env";
import { handleChat } from "./chat";
import { handleCompose } from "./compose";
import { handlePlay } from "./play";
import { handleSubscribe } from "./subscribe";

/**
 * Router for the kevinjmagnan.com Worker.
 *
 * wrangler.jsonc sets `run_worker_first: ["/api/*", "/c/*"]`, so every other
 * static asset is served straight from the assets layer and this code never
 * sees it. The default branch still defers to ASSETS so the static JSON files
 * that live under /api/ in the Jekyll build (health.json, openapi.json,
 * work.json, and friends) keep working.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const { pathname } = new URL(request.url);

    // Every /c/<slug> conversation page is the same document; the page reads
    // the slug off the URL itself. This used to be a `_redirects` rewrite, but
    // the assets layer rejects that rule as a loop, so the Worker serves it.
    if (pathname.startsWith("/c/")) {
      return env.ASSETS.fetch(new URL("/c/index.html", request.url));
    }

    switch (pathname) {
      case "/api/chat":
        return handleChat(request, env, ctx);

      case "/api/compose":
        return handleCompose(request, env, ctx);

      case "/api/play":
        return handlePlay(request, env);

      case "/api/subscribe":
        return handleSubscribe(request, env);

      case "/api/health":
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });

      default:
        return env.ASSETS.fetch(request);
    }
  },
};
