import type { Article } from '../types';

const NEWS_URL = 'https://www.anthropic.com/news';
const USER_AGENT = 'AI-News-Hacker-Dashboard';

interface NewsItem {
  slug: string;
  title: string;
  date: string;
  category: string;
}

export async function collectAnthropic(): Promise<Article[]> {
  const res = await fetch(NEWS_URL, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Anthropic news page error: ${res.status}`);
  const html = await res.text();

  // Parse the PublicationList section (the News table with Date/Category/Title)
  const items: NewsItem[] = [];
  const itemRegex = /<a\s+href="\/news\/([^"]+)"[^>]*class="PublicationList[^"]*listItem"[^>]*>.*?<time[^>]*>([^<]+)<\/time>.*?<span[^>]*subject[^>]*>([^<]+)<\/span>.*?<span[^>]*title[^>]*>([^<]+)<\/span>/gs;

  let match;
  while ((match = itemRegex.exec(html)) !== null) {
    items.push({
      slug: match[1],
      date: match[2].trim(),
      category: match[3].trim(),
      title: decodeHtml(match[4].trim()),
    });
  }

  if (items.length === 0) {
    console.warn('[anthropic] No items found in PublicationList, falling back to link scan');
    return fallbackCollect(html);
  }

  // Filter to last 14 days
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recent = items.filter(item => {
    const pubDate = new Date(item.date);
    return pubDate >= fourteenDaysAgo;
  });

  const filtered = recent.length > 0 ? recent : items.slice(0, 10);

  return filtered.map(item => ({
    external_id: item.slug,
    source: 'anthropic' as const,
    title: item.title,
    description: `[${item.category}] ${item.title}`,
    url: `https://www.anthropic.com/news/${item.slug}`,
    image_url: null,
    tags: JSON.stringify(['anthropic', item.category.toLowerCase()]),
    upvotes: 0,
    comments: 0,
    published_at: new Date(item.date).toISOString(),
  }));
}

function fallbackCollect(html: string): Article[] {
  const slugs: string[] = [];
  const regex = /href="\/news\/([^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    if (!slugs.includes(match[1])) slugs.push(match[1]);
  }
  return slugs.slice(0, 10).map(slug => ({
    external_id: slug,
    source: 'anthropic' as const,
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    description: '',
    url: `https://www.anthropic.com/news/${slug}`,
    image_url: null,
    tags: JSON.stringify(['anthropic', 'claude']),
    upvotes: 0,
    comments: 0,
    published_at: null,
  }));
}

function decodeHtml(str: string): string {
  return str.replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
}
