// AI-powered profile generation and onboarding chat

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callAI(messages: ChatMessage[]): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// --- Onboarding Chat ---
// AI asks questions to get to know the user, then generates their profile.

const ONBOARDING_SYSTEM_PROMPT = `You are the onboarding assistant for NOFOBO, a dating app that uses the Gale-Shapley algorithm to find stable matches.

Your job is to have a warm, curious conversation with the user to learn about them. You'll use this to write their dating profile.

Guidelines:
- Be warm, genuine, and slightly playful
- Ask ONE question at a time
- Ask about: what they do, what excites them, what they're looking for in a partner, hobbies, values, deal-breakers, a fun fact
- After 5-7 exchanges, tell them you have enough to write their profile
- When you have enough info, respond with EXACTLY this format:

[PROFILE_READY]
{a 2-3 paragraph engaging profile description}
[/PROFILE_READY]

The profile should:
- Be written in third person
- Sound authentic and specific (not generic)
- Highlight what makes this person interesting
- Be warm and inviting without being cheesy
- Include specific details from the conversation
- Be 150-250 words

Do NOT ask for their name, age, or gender - those are collected separately.
Start with a warm greeting and your first question.`;

export function getOnboardingSystemMessage(): ChatMessage {
  return { role: "system", content: ONBOARDING_SYSTEM_PROMPT };
}

export async function continueOnboarding(
  chatHistory: ChatMessage[],
): Promise<string> {
  const messages = [getOnboardingSystemMessage(), ...chatHistory];
  return await callAI(messages);
}

// --- Profile Generation from Links/Bio ---

const PROFILE_FROM_LINKS_PROMPT = `You are a dating profile writer for NOFOBO. Given a user's bio and links (social media, personal website, portfolio, etc.), write an engaging dating profile.

The profile should:
- Be written in third person
- Sound authentic and specific
- Highlight interesting aspects gleaned from their links and bio
- Be warm and inviting
- Be 150-250 words
- Focus on personality, interests, and what makes them unique

Respond ONLY with the profile text, no preamble.`;

export async function generateProfileFromLinks(
  bio: string,
  links: string[],
): Promise<string> {
  const linksText = links.length > 0
    ? `\n\nLinks:\n${links.map((l) => `- ${l}`).join("\n")}`
    : "";

  return await callAI([
    { role: "system", content: PROFILE_FROM_LINKS_PROMPT },
    { role: "user", content: `Bio: ${bio}${linksText}` },
  ]);
}

// --- Scrape link content for richer profiles ---
export async function fetchLinkSummary(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "NOFOBO-Bot/1.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Extract text content (very basic - strip tags)
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);
    return text;
  } catch {
    return "";
  }
}
