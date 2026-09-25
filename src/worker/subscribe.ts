import type { Env } from "./env";
import { getCorsHeaders } from "./chat";

/**
 * POST /api/subscribe
 *
 * Adds an email to the "Website list" Beehiiv publication, the list behind
 * the free "Don't start from zero" kit. The Beehiiv key lives in the
 * BEEHIIV_API_KEY secret and never reaches the page.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function handleSubscribe(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "method" }, 405);
  if (!getCorsHeaders(request.headers.get("Origin"), request.url)) {
    return json({ ok: false, error: "origin" }, 403);
  }

  const { success } = await env.SUBSCRIBE_LIMITER.limit({
    key: request.headers.get("CF-Connecting-IP") ?? "anon",
  });
  if (!success) return json({ ok: false, error: "rate_limited" }, 429);

  let data: { email?: unknown; company?: unknown };
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  // Honeypot: people never see this field, bots fill it in. Answer as if it
  // worked so the bot has nothing to learn from.
  if (data.company) return json({ ok: true });

  const email = String(data.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json({ ok: false, error: "invalid_email" }, 400);
  }
  if (!env.BEEHIIV_API_KEY || !env.BEEHIIV_PUBLICATION_ID) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const res = await fetch(
    `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email,
        reactivate_existing: true,
        send_welcome_email: true,
        utm_source: "kevinjmagnan.com",
        utm_medium: "website",
        utm_campaign: "dont-start-from-zero",
        referring_site: "kevinjmagnan.com",
      }),
    }
  );

  if (!res.ok) {
    console.error("beehiiv subscribe failed", res.status, await res.text());
    return json({ ok: false, error: "upstream" }, 502);
  }
  return json({ ok: true });
}
