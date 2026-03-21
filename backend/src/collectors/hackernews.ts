import type { Article } from '../types';

const ALGOLIA_URL = 'https://hn.algolia.com/api/v1/search';

interface HNHit {
  objectID: string;
  title: string;
  url: string | null;
  points: number;
  num_comments: number;
  created_at: string;
}

export async function collectHackerNews(): Promise<Article[]> {
  const fourteenDaysAgo = Math.floor(Date.now() / 1000) - (14 * 86400);

  const queries = [
    'LLM',
    'GPT',
    'Claude AI',
    'Gemini AI',
    'machine learning',
    'OpenAI',
    'Anthropic',
  ];

  const allHits = new Map<string, HNHit>();

  for (const query of queries) {
    const url = `${ALGOLIA_URL}?query=${encodeURIComponent(query)}&tags=story&numericFilters=${encodeURIComponent(`created_at_i>${fourteenDaysAgo},points>50`)}&hitsPerPage=20`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' } });
      if (!res.ok) continue;
      const data = await res.json() as { hits: HNHit[] };
      for (const hit of data.hits) {
        if (!allHits.has(hit.objectID)) {
          allHits.set(hit.objectID, hit);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[hackernews] Query "${query}" failed: ${message}`);
    }
  }

  const sorted = [...allHits.values()]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  return sorted.map(hit => ({
    external_id: hit.objectID,
    source: 'hackernews' as const,
    title: hit.title || 'Untitled',
    description: hit.url ? `Source: ${hit.url}` : `HN Discussion: https://news.ycombinator.com/item?id=${hit.objectID}`,
    url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
    image_url: null,
    tags: JSON.stringify(['hackernews', 'ai']),
    upvotes: hit.points || 0,
    comments: hit.num_comments || 0,
    published_at: hit.created_at || null,
  }));
}
