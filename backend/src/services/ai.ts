import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const MODEL = 'grok-4-1-fast-non-reasoning';

// System prompt shared between summary and chat for cache reuse
function buildSystemPrompt(articleContent: string, title: string, isVideo = false): string {
  const type = isVideo ? 'YouTube video transcript' : 'article';
  return `You are BuHu Assistant — a helpful AI that analyzes ${type}s about AI/tech news.

## ${isVideo ? 'Video' : 'Article'}: ${title}

${articleContent}

---
Instructions:
- Always respond in the same language the user uses.
- Be concise and informative.
- Reference specific parts of the ${type} when answering.${isVideo ? '\n- Include relevant timestamps when referencing video content.' : ''}`;
}

export async function summarizeArticle(title: string, content: string): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt(content, title) },
      { role: 'user', content: 'Summarize this article in 3-5 bullet points. Focus on what is new, why it matters, and key takeaways.' },
    ],
    max_tokens: 1024,
  });
  return response.choices[0]?.message?.content || 'Unable to generate summary.';
}

export async function chatAboutArticle(
  title: string,
  content: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      // Same system prompt as summary → xAI auto-caches this prefix
      { role: 'system', content: buildSystemPrompt(content, title) },
      ...messages,
    ],
    max_tokens: 1024,
  });
  return response.choices[0]?.message?.content || 'Unable to generate response.';
}

// Deep Tutor system prompt — focused on teaching and deep understanding
function buildDeepTutorPrompt(articleContent: string, title: string): string {
  return `You are Deep Tutor — an AI reading tutor that helps users deeply understand articles and papers about AI/tech.

## Article: ${title}

${articleContent}

---
Instructions:
- Act as a deep reading tutor for the article above.
- PRESERVE the original content — never rewrite, filter, or "cook" it. When discussing the article, reference the original text.
- Add your own perspective only as SUPPLEMENTS: insights, critical thinking prompts, connections to broader context.
- When English technical terms appear, provide simple, clear explanations in Vietnamese. For example: "Transformer (kiến trúc mạng neural dùng cơ chế attention để xử lý dữ liệu tuần tự)".
- Minimize Vieglish — avoid mixing English words into Vietnamese sentences unnecessarily. Use Vietnamese equivalents when they exist.
- Respond in the same language the user uses.
- Be thorough but structured — break content into digestible sections with clear headings.
- Encourage critical thinking: ask follow-up questions, highlight assumptions, note limitations.`;
}

export async function deepTutorChat(
  title: string,
  content: string,
  messages: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: buildDeepTutorPrompt(content, title) },
      ...messages,
    ],
    max_tokens: 2048,
  });
  return response.choices[0]?.message?.content || 'Unable to generate response.';
}
