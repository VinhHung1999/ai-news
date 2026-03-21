import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

const MODEL = 'grok-4-1-fast-non-reasoning';

// System prompt shared between summary and chat for cache reuse
function buildSystemPrompt(articleContent: string, title: string): string {
  return `You are BuHu Assistant — a helpful AI that analyzes articles about AI/tech news.

## Article: ${title}

${articleContent}

---
Instructions:
- Always respond in the same language the user uses.
- Be concise and informative.
- Reference specific parts of the article when answering.`;
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
