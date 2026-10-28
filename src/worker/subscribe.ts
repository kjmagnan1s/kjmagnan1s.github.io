import type { Env } from "./env";
import { getCorsHeaders } from "./chat";

/**
 * POST /api/subscribe
 *
 * Adds a new email to the kevinjmagnan.com list in Plunk (its own Plunk
 * project, separate from Naperthrill) and sends it one welcome email with the
 * free kit. Addresses already in the project are never changed. The Plunk key lives
 * in the PLUNK_SECRET_KEY secret and never reaches the page.
 *
 * Moved from Beehiiv on 2026-10-27: Beehiiv's free plan has no send API, and
 * Plunk lets new-page announcements go out as campaigns.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PLUNK = "https://next-api.useplunk.com";

export const WELCOME_SUBJECT = "Your free kit: Don't start from zero";
export const WELCOME_BODY = [
  "<p>Thanks for signing up.</p>",
  '<p>Here\'s the kit: <a href="https://kevinjmagnan.com/kit/">Don\'t start from zero</a>. It covers the GitHub repos, skills, and plugins I use, and how to turn what you already know into a skill of your own.</p>',
  "<p>When I put up a new page, it comes to this list first.</p>",
  "<p>Kevin</p>",
].join("\n");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const MAX_LOOKUP_PAGES = 5;

/** "present" if the exact address exists in any state, "absent" if every
 * matching page was read and it isn't there, "unknown" if the matches ran past
 * the page cap, "error" if Plunk failed. */
async function findContact(email: string, headers: Record<string, string>): Promise<"present" | "absent" | "unknown" | "error"> {
  let cursor = "";
  for (let page = 0; page < MAX_LOOKUP_PAGES; page++) {
    const url = `${PLUNK}/contacts?search=${encodeURIComponent(email)}&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error("plunk contact lookup failed", res.status, await res.text());
      return "error";
    }
    const body = (await res.json()) as { data?: { email?: string }[]; hasMore?: boolean; cursor?: string | null };
    if ((body.data ?? []).some((c) => (c.email ?? "").toLowerCase() === email)) return "present";
    if (!body.hasMore || !body.cursor) return "absent";
    cursor = body.cursor;
  }
  return "unknown";
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

  let data: { email?: unknown; company?: unknown; source?: unknown };
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

  // Optional page slug from the leave-behind pop-up (assets/js/leave-behind.js),
  // so each contact records which page brought them. Anything that isn't a
  // plain slug is dropped, never echoed.
  const rawSource = typeof data.source === "string" ? data.source : "";
  const source = /^[a-z0-9][a-z0-9/-]{0,39}$/.test(rawSource) ? rawSource : "";

  if (!env.PLUNK_SECRET_KEY || !env.PLUNK_FROM) {
    return json({ ok: false, error: "not_configured" }, 503);
  }
  const headers = {
    authorization: `Bearer ${env.PLUNK_SECRET_KEY}`,
    "content-type": "application/json",
  };

  // Existing contacts are left exactly as they are, in any state. Re-submitting
  // an address must never re-subscribe someone who opted out, or overwrite when
  // and where they first signed up. The response is the same either way, so
  // the form doesn't reveal who is on the list. Someone who unsubscribed and
  // wants back in uses the resubscribe link in Plunk's footer.
  // Plunk's search is a substring match, so page through every hit looking
  // for the exact address. If the lookup can't finish (an error, or more
  // pages than we're willing to read), fail closed: report ok, change nothing.
  const lookup = await findContact(email, headers);
  if (lookup === "error") return json({ ok: false, error: "upstream" }, 502);
  if (lookup !== "absent") return json({ ok: true });

  const res = await fetch(`${PLUNK}/contacts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      subscribed: true,
      data: {
        list: "kevinjmagnan.com",
        utm_source: "kevinjmagnan.com",
        utm_medium: source ? "leave-behind" : "website",
        utm_campaign: source || "dont-start-from-zero",
        signed_up_at: new Date().toISOString(),
      },
    }),
  });
  if (!res.ok) {
    console.error("plunk contact upsert failed", res.status, await res.text());
    return json({ ok: false, error: "upstream" }, 502);
  }

  let isNew = res.status === 201;
  try {
    const body = (await res.json()) as { _meta?: { isNew?: boolean } };
    if (typeof body?._meta?.isNew === "boolean") isNew = body._meta.isNew;
  } catch {
    /* keep the status-code answer */
  }

  if (isNew) {
    const sent = await fetch(`${PLUNK}/v1/send`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        to: email,
        subject: WELCOME_SUBJECT,
        body: WELCOME_BODY,
        from: { name: env.PLUNK_FROM_NAME || "Kevin Magnan", email: env.PLUNK_FROM },
        reply: env.PLUNK_REPLY_TO || undefined,
      }),
    });
    // The signup already worked; a failed welcome is logged, not shown.
    if (!sent.ok) console.error("plunk welcome failed", sent.status, await sent.text());
  }
  return json({ ok: true });
}
