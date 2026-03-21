import type { Article } from '../types';

const JINA_URL = 'https://r.jina.ai/https://www.star-history.com/';

export async function collectStarHistory(): Promise<Article[]> {
  const res = await fetch(JINA_URL, {
    headers: { 'Accept': 'text/markdown', 'User-Agent': 'AI-News-Hacker-Dashboard' }
  });
  if (!res.ok) throw new Error(`Star History fetch error: ${res.status}`);
  const markdown = await res.text();

  // Match "owner/repo+number" or "owner/repo +number"
  const repoRegex = /([a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+)\s*\+\s*([\d,]+)/g;
  const repos: { owner: string; repo: string; starGains: number }[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = repoRegex.exec(markdown)) !== null) {
    const fullName = match[1];
    const starGains = parseInt(match[2].replace(/,/g, ''), 10);
    const [owner, repo] = fullName.split('/');
    const key = `${owner}/${repo}`.toLowerCase();
    if (owner && repo && !seen.has(key)) {
      seen.add(key);
      repos.push({ owner, repo, starGains });
    }
  }

  console.log(`[star-history] Parsed ${repos.length} repos from leaderboard`);
  if (repos.length === 0) throw new Error('No repos found in Star History leaderboard');

  // Try to enrich from GitHub API, but fallback to basic info if rate limited
  const articles: Article[] = [];
  for (const r of repos.slice(0, 10)) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${r.owner}/${r.repo}`, {
        headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' }
      });

      if (ghRes.ok) {
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
      } else {
        // Rate limited or not found — use basic info
        articles.push({
          external_id: `star-history-${r.owner}/${r.repo}`,
          source: 'github' as any,
          title: `${r.owner}/${r.repo}`,
          description: `[+${r.starGains.toLocaleString()} stars this week] Trending on Star History`,
          url: `https://github.com/${r.owner}/${r.repo}`,
          image_url: `https://github.com/${r.owner}.png?size=128`,
          tags: JSON.stringify(['trending']),
          upvotes: r.starGains,
          comments: 0,
          published_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Network error — still add with basic info
      articles.push({
        external_id: `star-history-${r.owner}/${r.repo}`,
        source: 'github' as any,
        title: `${r.owner}/${r.repo}`,
        description: `[+${r.starGains.toLocaleString()} stars this week] Trending on Star History`,
        url: `https://github.com/${r.owner}/${r.repo}`,
        image_url: `https://github.com/${r.owner}.png?size=128`,
        tags: JSON.stringify(['trending']),
        upvotes: r.starGains,
        comments: 0,
        published_at: new Date().toISOString(),
      });
    }
  }

  return articles;
}
