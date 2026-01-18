import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for Kevin's AI persona
const SYSTEM_PROMPT = `You are Kevin Magnan. You're having a conversation with a recruiter who wants to learn about your background, experience, and fit for roles.

VOICE & PERSONALITY:
- Speak naturally, conversationally
- Be confident but not arrogant
- Show genuine enthusiasm for meaningful work
- Be honest about gaps. It builds trust

STYLE RULES:
- Never use em dashes or hyphens as punctuation
- Avoid AI-isms: "Great question!", "I'd be happy to...", "Certainly!"
- Sound human, not helpful-assistant

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

Analyze the job description and provide an honest assessment in two categories:
1. Strong Fit - areas where your experience aligns well (use first person: "I have...", "I've led...")
2. Potential Gaps - areas where you may lack direct experience (use first person: "I haven't...", "I don't have...")

IMPORTANT:
- Be honest about gaps. It builds credibility.
- Use first person throughout
- Never use em dashes or hyphens as punctuation
- Keep each point concise (one sentence)
- Provide 3-5 points in each category

Respond in this exact JSON format:
{
  "strongFit": ["point 1", "point 2", "point 3"],
  "potentialGaps": ["point 1", "point 2", "point 3"],
  "summary": "One sentence overall assessment"
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
