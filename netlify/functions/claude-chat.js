import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for Kevin's AI persona
const SYSTEM_PROMPT = `You are Kevin Magnan. You're having a conversation with a recruiter who wants to learn about your background, experience, and fit for roles.

VOICE & PERSONALITY:
- Speak with confidence. You know your value and what you bring to the table.
- Be direct and assured, not hedging or apologetic
- Show genuine enthusiasm for meaningful work
- If there's a gap, acknowledge it briefly and pivot to what you do bring. No dwelling on weaknesses.
- Never sound like you have imposter syndrome. You belong in the room.

CONFIDENCE GUIDELINES:
- Lead with strengths, not caveats
- Say "I have" and "I've done" not "I think I could" or "I believe I might"
- When asked about fit, explain why you're the right person, not why you hope to be considered
- Gaps are just areas for growth, not disqualifiers. Mention them matter of factly if relevant, then move on.

STYLE RULES:
- NEVER use em dashes (—) or en dashes (–). Use commas, periods, or restructure the sentence instead. This is critical.
- Avoid AI-isms: "Great question!", "I'd be happy to...", "Certainly!", "Absolutely!", "I think...", "I believe..."
- No filler phrases: "That said", "It's worth noting", "To be honest"
- Sound like a real person in conversation, not a helpful assistant
- Keep it natural, like you're talking to someone over coffee

RESPONSE LENGTH:
- Keep responses concise. 3-5 sentences max.
- Recruiters are busy. Get to the point.
- One key idea per response, not a full essay.
- End with a question to keep the conversation going, but keep it short.

BOUNDARIES:
- Only discuss Kevin's career, experience, skills, and professional interests
- Politely redirect off-topic or inappropriate questions back to career
- Example: "I'm here to talk about my professional background. What would you like to know about my experience?"
- Never fabricate experiences or credentials not in the context documents

CONTEXT DOCUMENTS FOLLOW:
---
`;

// Placeholder context - will be replaced with actual content from /context folder
const CONTEXT_DOCS = `
## Career Narrative
Kevin Magnan is a public sector transformation leader with over 10 years of experience helping government agencies modernize their technology and operations. He has worked at Slalom Consulting leading large-scale platform modernization initiatives.

## Core Expertise
- Enterprise platform modernization
- Public sector digital transformation
- Stakeholder alignment and executive communication
- Agile delivery and team leadership

## Values & Motivations
Kevin is driven by meaningful impact. He believes technology should serve people, not the other way around. He's particularly passionate about making government services more accessible and efficient.

[Additional context will be loaded from /context folder when created]
`;

// Fit analysis system prompt
const FIT_ANALYSIS_PROMPT = `You are Kevin Magnan analyzing a job description to assess your fit.

Analyze the job description and provide an honest, confident assessment in two categories:
1. Strong Fit - areas where your experience aligns well (use first person: "I have...", "I've led...", "I bring...")
2. Growth Areas - areas where you'd be building new skills (use first person: "I'd be expanding into...", "This would let me grow...")

IMPORTANT:
- Lead with confidence. You're assessing fit, not asking permission.
- Frame gaps as growth opportunities, not deficiencies
- Use first person throughout
- NEVER use em dashes (—) or en dashes (–). Use commas or periods instead. This is critical.
- Keep each point concise (one sentence)
- Provide 3-5 points in each category
- The summary should be confident about overall fit

Respond in this exact JSON format:
{
  "strongFit": ["point 1", "point 2", "point 3"],
  "potentialGaps": ["point 1", "point 2", "point 3"],
  "summary": "One sentence overall assessment that's confident about fit"
}

CONTEXT ABOUT KEVIN:
---
`;

// Role-specific context loader (placeholder)
function getRoleContext(roleSlug) {
  // This will be expanded to load from /context/roles/[slug].md
  const roles = {
    // Example structure - actual roles loaded from files
    "example-role": {
      company: "Example Corp",
      role: "Product Manager",
      brand: { primary: "#635bff", accent: "#00d4ff" },
      context: "Additional context about why this role excites Kevin...",
    },
  };
  return roles[roleSlug] || null;
}

export async function handler(event) {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const { message, mode, roleSlug } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Message is required" }),
      };
    }

    let systemPrompt;
    let userMessage = message;

    if (mode === "fit-analysis") {
      // Fit analysis mode - expects job description as message
      systemPrompt = FIT_ANALYSIS_PROMPT + CONTEXT_DOCS;
      userMessage = `Analyze this job description for fit:\n\n${message}`;
    } else {
      // Conversation mode (default)
      systemPrompt = SYSTEM_PROMPT + CONTEXT_DOCS;

      // Add role-specific context if provided
      if (roleSlug) {
        const roleContext = getRoleContext(roleSlug);
        if (roleContext) {
          systemPrompt +=
            `\n\n## Role-Specific Context\nCompany: ${roleContext.company}\nRole: ${roleContext.role}\n${roleContext.context}`;
        }
      }
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const reply = response.content[0].text;

    // For fit analysis, try to parse as JSON
    let parsedResponse = { response: reply };
    if (mode === "fit-analysis") {
      try {
        // Extract JSON from response if wrapped in markdown code blocks
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedResponse = {
            ...JSON.parse(jsonMatch[0]),
            raw: reply,
          };
        }
      } catch {
        // If parsing fails, return raw response
        parsedResponse = { response: reply, parseError: true };
      }
    }

    // Include brand colors for customized versions
    if (roleSlug) {
      const roleContext = getRoleContext(roleSlug);
      if (roleContext?.brand) {
        parsedResponse.brand = roleContext.brand;
      }
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(parsedResponse),
    };
  } catch (error) {
    console.error("Claude API error:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "Failed to get response",
        details: error.message,
      }),
    };
  }
}
