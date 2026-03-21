import { XMLParser } from 'fast-xml-parser';
import type { Article } from '../types';

const RSS_URL = 'https://blog.google/technology/ai/rss';

export async function collectGoogleAI(): Promise<Article[]> {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' }
  });
  if (!res.ok) throw new Error(`Google AI RSS error: ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
  const feed = parser.parse(xml);

  const channel = feed.rss?.channel;
  if (!channel) throw new Error('Cannot parse Google AI RSS feed');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items: any[] = channel.item || [];
  if (!Array.isArray(items)) items = [items];

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recent = items.filter(item => {
    const pubDate = new Date(item.pubDate || 0);
    return pubDate >= fourteenDaysAgo;
  });

  return (recent.length > 0 ? recent : items.slice(0, 10)).map(item => {
    const categories = Array.isArray(item.category) ? item.category : (item.category ? [item.category] : []);
    const tags = categories.slice(0, 5).map((c: string | { '#text'?: string }) =>
      typeof c === 'string' ? c : (c as { '#text'?: string })['#text'] || 'ai'
    );

    return {
      external_id: item.guid?.['#text'] || item.guid || item.link,
      source: 'google_ai' as const,
      title: item.title || 'Untitled',
      description: stripHtml(item.description || '').substring(0, 300),
      url: item.link,
      image_url: extractImage(item),
      tags: JSON.stringify(tags.length > 0 ? tags : ['google', 'ai']),
      upvotes: 0,
      comments: 0,
      published_at: item.pubDate || null,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImage(item: any): string | null {
  if (item['media:content']?.['@_url']) return item['media:content']['@_url'];
  if (item['media:thumbnail']?.['@_url']) return item['media:thumbnail']['@_url'];
  return null;
}

function stripHtml(str: string): string {
  return String(str).replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}
