import type { Article } from '../types';

const BLOG_URL = 'https://claude.com/blog';
const USER_AGENT = 'AI-News-Hacker-Dashboard';

interface BlogPost {
  slug: string;
  date: string;
}

export async function collectClaudeBlog(): Promise<Article[]> {
  const res = await fetch(BLOG_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Claude blog error: ${res.status}`);
  const html = await res.text();

  // Extract date + slug pairs from the chronological list section
  // Pattern: date appears before slug in HTML
  const dateSlugRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d+,\s+\d{4})[\s\S]*?href="\/blog\/([^"]+)"/g;
  const posts: BlogPost[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = dateSlugRegex.exec(html)) !== null) {
    const date = match[1];
    const slug = match[2];
    if (!slug.startsWith('category/') && !seen.has(slug)) {
      seen.add(slug);
      posts.push({ slug, date });
    }
  }

  if (posts.length === 0) throw new Error('No dated posts found on Claude blog');

  // Take 5 most recent
  const recent = posts.slice(0, 5);

  // Fetch metadata for each
  const articles: Article[] = [];
  for (const post of recent) {
    try {
      const articleUrl = `${BLOG_URL}/${post.slug}`;
      const articleRes = await fetch(articleUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!articleRes.ok) continue;
      const articleHtml = await articleRes.text();

      const title = extractMeta(articleHtml, 'og:title')?.replace(' | Claude', '') || post.slug;
      const description = extractMeta(articleHtml, 'og:description') || '';
      const image = extractMeta(articleHtml, 'og:image') || null;

      articles.push({
        external_id: `claude-blog-${post.slug}`,
        source: 'anthropic',
        title,
        description: description.substring(0, 300),
        url: articleUrl,
        image_url: image,
        tags: JSON.stringify(['claude', 'blog']),
        upvotes: 0,
        comments: 0,
        published_at: new Date(post.date).toISOString(),
      });
    } catch (err) {
      console.warn(`[claude-blog] Failed to fetch ${post.slug}:`, err instanceof Error ? err.message : err);
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
