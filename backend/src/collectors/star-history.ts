import type { Article } from '../types';

const JINA_URL = 'https://r.jina.ai/https://www.star-history.com/';

export async function collectStarHistory(): Promise<Article[]> {
  const res = await fetch(JINA_URL, {
    headers: { 'Accept': 'text/markdown', 'User-Agent': 'AI-News-Hacker-Dashboard' }
  });
  if (!res.ok) throw new Error(`Star History fetch error: ${res.status}`);
  const markdown = await res.text();

  // Parse leaderboard: pattern like "owner/repo+1,234" or "owner/repo+981"
  const repoRegex = /(\d+)\.\s+\[.*?\]\(https:\/\/www\.star-history\.com\/([^/]+\/[^)]+)\)[^+]*\+([\d,]+)/g;
  const repos: { rank: number; owner: string; repo: string; starGains: number }[] = [];

  let match;
  while ((match = repoRegex.exec(markdown)) !== null) {
    const fullName = match[2];
    const starGains = parseInt(match[3].replace(/,/g, ''), 10);
    const [owner, repo] = fullName.split('/');
    if (owner && repo) {
      repos.push({ rank: parseInt(match[1], 10), owner, repo: repo.toLowerCase(), starGains });
    }
  }

  if (repos.length === 0) throw new Error('No repos found in Star History leaderboard');

  // Fetch repo info from GitHub API for each (top 15)
  const articles: Article[] = [];
  for (const r of repos.slice(0, 10)) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}`, {
        headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' }
      });
      if (!ghRes.ok) continue;
      const gh = await ghRes.json() as {
        full_name: string;
        description?: string;
        html_url: string;
        stargazers_count: number;
        forks_count: number;
        topics?: string[];
        created_at: string;
        owner?: { avatar_url?: string };
      };

      articles.push({
        external_id: `star-history-${gh.full_name}`,
        source: 'github' as any,
        title: gh.full_name,
        description: `[+${r.starGains.toLocaleString()} stars this week] ${gh.description || 'No description.'}`.substring(0, 300),
        url: gh.html_url,
        image_url: gh.owner?.avatar_url || null,
        tags: JSON.stringify(gh.topics?.slice(0, 5) || ['trending']),
        upvotes: gh.stargazers_count,
        comments: gh.forks_count,
        published_at: gh.created_at,
      });
    } catch (err) {
      console.warn(`[star-history] Failed to fetch ${r.owner}/${r.repo}:`, err instanceof Error ? err.message : err);
    }
  }

  return articles;
}
