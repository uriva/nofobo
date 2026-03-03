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

Your job is to have a short conversation with the user to collect facts about them. You'll use these facts to write their dating profile.

Guidelines:
- Be friendly and direct
- Ask ONE question at a time
- Ask straightforward, easy-to-answer questions:
  1. What do you do for work?
  2. What do you do in your free time?
  3. What are you looking for in a partner?
  4. What matters most to you in a relationship?
  5. What does a typical weekend look like for you?
- Do NOT ask quirky or creative questions like "what would most people be surprised to learn" — keep it simple and obvious
- If you have scraped content from the user's links/pages, reference specific things from them naturally (e.g. "I see from your site that you work on X — tell me more about that")
- After 5-7 exchanges, you have enough to write their profile
- When ready, respond with EXACTLY this format:

[PROFILE_READY]
{the profile text}
[/PROFILE_READY]

CRITICAL rules for the profile:
- Be FACTUAL and INFORMATIONAL — pack it with concrete facts about the person
- Write in third person
- State what they actually do, what they actually like, what they're actually looking for
- NO filler adjectives like "passionate", "vibrant", "dynamic", "adventurous"
- NO generic dating-app language like "looking for someone to share life's adventures with"
- NO cheesy phrases, no fluff, no marketing copy tone
- Every sentence should contain a specific fact about this person
- Good example: "Works as a backend engineer at a startup building developer tools. Spends weekends rock climbing and cooking elaborate meals. Reads mostly nonfiction — recently finished a book on urban planning. Looking for someone who values long conversations and isn't glued to their phone."
- Bad example: "A passionate soul with a zest for life who brings warmth and energy to everything they do."
- 150-250 words

Do NOT ask for their name, age, or gender - those are collected separately.
Start with a friendly greeting and your first question.`;

export function getOnboardingSystemMessage(
  linkContext?: string,
): ChatMessage {
  let content = ONBOARDING_SYSTEM_PROMPT;
  if (linkContext) {
    content += "\n\n" + linkContext;
  }
  return { role: "system", content };
}

export async function continueOnboarding(
  chatHistory: ChatMessage[],
  linkContext?: string,
): Promise<string> {
  const messages = [getOnboardingSystemMessage(linkContext), ...chatHistory];
  return await callAI(messages);
}

// --- Extract URLs from text ---
const URL_REGEX = /https?:\/\/[^\s<>"')\]]+/gi;

export function extractUrls(text: string): string[] {
  return [...(text.match(URL_REGEX) ?? [])];
}

// --- Profile Generation from Links/Bio ---

const PROFILE_FROM_LINKS_PROMPT = `You are a dating profile writer for NOFOBO. Given a user's bio and links (social media, personal website, portfolio, etc.), write a factual, informational dating profile.

The profile should:
- Be written in third person
- Be packed with concrete facts — what they do, what they like, what they're looking for
- NO filler adjectives like "passionate", "vibrant", "dynamic"
- NO generic dating-app fluff like "looking for someone to share adventures with"
- Every sentence should contain a specific fact
- 150-250 words

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
