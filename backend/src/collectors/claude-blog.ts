import type { Article } from '../types';

const BLOG_URL = 'https://claude.com/blog';
const USER_AGENT = 'AI-News-Hacker-Dashboard';

export async function collectClaudeBlog(): Promise<Article[]> {
  const res = await fetch(BLOG_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Claude blog error: ${res.status}`);
  const html = await res.text();

  // Extract unique blog slugs
  const slugs: string[] = [];
  const regex = /href="\/blog\/([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!slugs.includes(match[1])) {
      slugs.push(match[1]);
    }
  }

  if (slugs.length === 0) throw new Error('No posts found on Claude blog');

  // Fetch metadata for first 5 posts
  const articles: Article[] = [];
  for (const slug of slugs.slice(0, 5)) {
    try {
      const articleUrl = `${BLOG_URL}/${slug}`;
      const articleRes = await fetch(articleUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!articleRes.ok) continue;
      const articleHtml = await articleRes.text();

      const title = extractMeta(articleHtml, 'og:title')?.replace(' | Claude', '') || slug;
      const description = extractMeta(articleHtml, 'og:description') || '';
      const image = extractMeta(articleHtml, 'og:image') || null;

      articles.push({
        external_id: `claude-blog-${slug}`,
        source: 'anthropic',
        title,
        description: description.substring(0, 300),
        url: articleUrl,
        image_url: image,
        tags: JSON.stringify(['claude', 'blog']),
        upvotes: 0,
        comments: 0,
        published_at: null,
      });
    } catch (err) {
      console.warn(`[claude-blog] Failed to fetch ${slug}:`, err instanceof Error ? err.message : err);
    }
  }

  return articles;
}

function extractMeta(html: string, property: string): string | null {
  const regex = new RegExp(`<meta[^>]*(?:property|name)="${property}"[^>]*content="([^"]*)"`, 'i');
  const match = regex.exec(html);
  if (match) return decodeHtml(match[1]);

  const regex2 = new RegExp(`<meta[^>]*content="([^"]*)"[^>]*(?:property|name)="${property}"`, 'i');
  const match2 = regex2.exec(html);
  if (match2) return decodeHtml(match2[1]);

  return null;
}

function decodeHtml(str: string): string {
  return str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
