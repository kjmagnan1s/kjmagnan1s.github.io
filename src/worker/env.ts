/**
 * Bindings and secrets available to the Worker at runtime.
 * Keep this in sync with wrangler.jsonc.
 */
export interface Env {
  // Static assets built by Jekyll into _site. Used as the fallthrough for
  // anything that is not an /api/* route.
  ASSETS: Fetcher;

  // Workers AI. The compose agent runs typesafe/jev through this binding.
  AI: Ai;

  // Per-IP rate limiters. See wrangler.jsonc for the configured windows.
  CHAT_LIMITER: RateLimit;
  COMPOSE_LIMITER: RateLimit;

  // Secrets. Set with `wrangler secret put <NAME>`.
  ANTHROPIC_API_KEY: string;
  TYPESAFE_API_KEY?: string;
}
