import type { Env } from "./env";

/**
 * Homepage handler. wrangler.jsonc routes `/` through the Worker so agents can
 * negotiate content: `Accept: text/markdown` gets the Markdown twin that
 * scripts/generate_markdown.py writes at build time, and everyone else gets the
 * normal HTML. Both carry Link headers that point agents at the discovery files
 * (RFC 8288, RFC 9727).
 */

const LINKS = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</api/openapi.json>; rel="service-desc"; type="application/openapi+json"',
  '</llms.txt>; rel="service-doc"; type="text/plain"',
  '</api/profile.json>; rel="describedby"; type="application/json"',
  '</index.md>; rel="alternate"; type="text/markdown"',
].join(", ");

export function wantsMarkdown(request: Request): boolean {
  const accept = request.headers.get("Accept") ?? "";
  return /(^|,)\s*text\/markdown/i.test(accept);
}

export async function handleHome(request: Request, env: Env): Promise<Response> {
  if (wantsMarkdown(request) && (request.method === "GET" || request.method === "HEAD")) {
    const md = await env.ASSETS.fetch(new URL("/index.md", request.url));
    if (md.ok) {
      const body = await md.text();
      return new Response(request.method === "HEAD" ? null : body, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "public, max-age=0, must-revalidate",
          "Vary": "Accept",
          "Link": LINKS,
          // Rough token estimate: about four characters per token.
          "x-markdown-tokens": String(Math.ceil(body.length / 4)),
        },
      });
    }
  }

  const res = await env.ASSETS.fetch(request);
  const out = new Response(res.body, res);
  out.headers.set("Link", LINKS);
  out.headers.append("Vary", "Accept");
  return out;
}
