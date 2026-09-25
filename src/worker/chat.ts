import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "./env";
import {
  CONTEXT_DOCS,
  FIT_ANALYSIS_PROMPT,
  OFF_TOPIC_REDIRECT,
  SYSTEM_PROMPT,
  getRoleContext,
} from "./chat-context";

// Input limits
export const MAX_CONVERSATION_LENGTH = 2000;
export const MAX_FIT_ANALYSIS_LENGTH = 15000;

// Prompt-injection patterns. Conservative on purpose to avoid false positives
// on legitimate recruiter questions ("what was your previous role").
export const INJECTION_PATTERNS = [
  /ignore\s+(all\s+|the\s+|your\s+|any\s+)?(previous|above|prior|preceding)\s+(instructions?|prompts?|rules?|messages?)/i,
  /disregard\s+(all\s+|the\s+|your\s+|any\s+)?(previous|above|prior|system)/i,
  /(reveal|show|print|output|repeat|tell\s+me|share)\s+(your\s+|the\s+|the\s+full\s+)?(system\s+)?(prompt|instructions|context\s+document)/i,
  /\bDAN\s+mode\b/i,
  /<\|[^|]*\|>/,
  /\[\[\s*system[^\]]*\]\]/i,
  /act\s+as\s+(?:a\s+)?(?:different|new|another)\s+(?:ai|assistant|model|persona|character)/i,
];

/**
 * True when the text trips one of the injection patterns above.
 */
export function isInjectionAttempt(text: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

// Jekyll dev servers. Everything else has to be same-origin now that the API
// lives on the site's own origin instead of a separate Netlify domain.
const DEV_ORIGINS = [
  "http://localhost:4000",
  "http://localhost:4001",
  "http://127.0.0.1:4000",
  "http://127.0.0.1:4001",
];

/**
 * Validate origin and return CORS headers.
 * A missing Origin (same-origin form posts, curl, server-side callers) is fine.
 * An Origin that matches the request's own origin is fine. Anything else is
 * a cross-site caller and gets rejected.
 * Returns null if origin is not allowed.
 */
export function getCorsHeaders(
  origin: string | null,
  requestUrl: string
): Record<string, string> | null {
  if (!origin) return {};

  const sameOrigin = new URL(requestUrl).origin;
  if (origin === sameOrigin || DEV_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    };
  }
  return null;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

function json(
  body: unknown,
  status: number,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export async function handleChat(
  request: Request,
  env: Env,
  _ctx: ExecutionContext
): Promise<Response> {
  const origin = request.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin, request.url);

  // Reject requests from unauthorized origins
  if (!corsHeaders) {
    return json({ error: "Origin not allowed" }, 403);
  }

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  // Per-IP rate limit. Cloudflare gives the real client IP in CF-Connecting-IP,
  // which cannot be spoofed by the caller the way x-forwarded-for could.
  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

  try {
    const { success } = await env.CHAT_LIMITER.limit({ key: clientIp });
    if (!success) {
      return json(
        {
          error: "Too many requests",
          details: "rate limited - please slow down and try again shortly",
        },
        429,
        { "Retry-After": "60", ...corsHeaders }
      );
    }
  } catch (err) {
    // If the limiter itself fails, log and continue rather than 500ing the user.
    console.error("[claude-chat] rate limit check failed:", err);
  }

  try {
    let body: {
      message?: unknown;
      messages?: unknown;
      mode?: unknown;
      roleSlug?: unknown;
    };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return json({ error: "Invalid JSON body" }, 400, corsHeaders);
    }

    const {
      message,
      messages: clientMessages,
      mode,
      roleSlug,
    } = body as {
      message?: string;
      messages?: ChatMessage[];
      mode?: string;
      roleSlug?: string;
    };

    // Multi-turn support. Frontends can either send `messages` (array of
    // {role, content} for full conversation history) or fall back to `message`
    // (single string) for backward compat with existing /c/ pages.
    const isMultiTurn =
      Array.isArray(clientMessages) && clientMessages.length > 0;
    const conversationMessages: ChatMessage[] | null = isMultiTurn
      ? (clientMessages as ChatMessage[])
      : message && typeof message === "string"
        ? [{ role: "user", content: message }]
        : null;

    if (!conversationMessages) {
      return json(
        { error: "Message or messages array is required" },
        400,
        corsHeaders
      );
    }

    // The latest user turn is what we scan for length / injection.
    const latestUserMessage = [...conversationMessages]
      .reverse()
      .find((m) => m && m.role === "user")?.content;

    if (!latestUserMessage || typeof latestUserMessage !== "string") {
      return json(
        { error: "Latest message must be a string user turn" },
        400,
        corsHeaders
      );
    }

    // Length cap. JDs are longer than chat questions, so allow more in fit-analysis.
    const maxLength =
      mode === "fit-analysis"
        ? MAX_FIT_ANALYSIS_LENGTH
        : MAX_CONVERSATION_LENGTH;
    if (latestUserMessage.length > maxLength) {
      return json(
        {
          error: "Message too long",
          details: `Maximum ${maxLength} characters.`,
        },
        400,
        corsHeaders
      );
    }

    // Drive-by prompt-injection block. Conversation mode only - fit-analysis
    // accepts arbitrary pasted JD text and is protected via the prompt + length cap.
    if (mode !== "fit-analysis" && isInjectionAttempt(latestUserMessage)) {
      return json({ response: OFF_TOPIC_REDIRECT }, 200, corsHeaders);
    }

    let systemPrompt: string;
    let outgoingMessages: ChatMessage[] = conversationMessages;

    if (mode === "fit-analysis") {
      // Fit analysis mode - expects job description as the only user message.
      systemPrompt = FIT_ANALYSIS_PROMPT + CONTEXT_DOCS;
      outgoingMessages = [
        {
          role: "user",
          content: `Analyze this job description for fit:\n\n${latestUserMessage}`,
        },
      ];
    } else {
      // Conversation mode (default)
      systemPrompt = SYSTEM_PROMPT + CONTEXT_DOCS;

      // Add role-specific context if provided
      if (roleSlug) {
        const roleContext = getRoleContext(roleSlug);
        if (roleContext) {
          systemPrompt += `

## INTERVIEW MODE - CRITICAL
You are Kevin Magnan. You are ACTIVELY INTERVIEWING for the ${roleContext.role} position at ${roleContext.company}. You WANT this job. You applied for it because it's the right next step in your career. This is not hypothetical.

MINDSET:
- You are pursuing this role with conviction. You've already decided this is the job you want.
- When asked "why do you want this job" or "why ${roleContext.company}", answer with the certainty of someone who has made a deliberate career decision, not someone considering options.
- Never say "if I were interested" or "I would imagine" - you ARE interested, you HAVE imagined it, and you're here to get the job.
- This is a first interview. Be conversational, professional, and focused on demonstrating you're the right fit.
- Connect your experience directly to what they need. Every answer should reinforce why you belong in this role.
- Weave in talking points naturally. Don't list them robotically, but hit them.
- You can ask clarifying questions if it helps you give a better, more targeted answer.

${roleContext.context}`;
        }
      }
    }

    // Checked here rather than up top so the validation and injection paths
    // still behave correctly before the secret is set.
    if (!env.ANTHROPIC_API_KEY) {
      console.error("[claude-chat] ANTHROPIC_API_KEY is not set");
      return json(
        {
          error: "Failed to get response",
          details: "Chat is not configured yet.",
        },
        503,
        corsHeaders
      );
    }

    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      temperature: 0.4,
      system: systemPrompt,
      messages: outgoingMessages,
    });

    const firstBlock = response.content[0];
    const reply = firstBlock && firstBlock.type === "text" ? firstBlock.text : "";

    // For fit analysis, parse JSON and validate the contract shape.
    // If shape is invalid we surface parseError so the frontend's existing
    // error path triggers instead of feeding garbage to the renderer.
    let parsedResponse: Record<string, unknown> = { response: reply };
    if (mode === "fit-analysis") {
      const fallback = { response: reply, parseError: true };
      try {
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          parsedResponse = fallback;
        } else {
          const parsed = JSON.parse(jsonMatch[0]);
          const isValid =
            parsed &&
            Array.isArray(parsed.strongFit) &&
            Array.isArray(parsed.growthAreas) &&
            Array.isArray(parsed.gaps) &&
            typeof parsed.summary === "string" &&
            parsed.summary.length > 0;
          if (isValid) {
            parsedResponse = { ...parsed, raw: reply };
          } else {
            console.warn(
              "[claude-chat] fit-analysis JSON failed shape validation"
            );
            parsedResponse = fallback;
          }
        }
      } catch {
        parsedResponse = fallback;
      }
    }

    // Include brand colors for customized versions
    if (roleSlug) {
      const roleContext = getRoleContext(roleSlug);
      if (roleContext?.brand) {
        parsedResponse.brand = roleContext.brand;
      }
    }

    return json(parsedResponse, 200, corsHeaders);
  } catch (error) {
    console.error("Claude API error:", error);
    return json(
      {
        error: "Failed to get response",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
      corsHeaders
    );
  }
}
