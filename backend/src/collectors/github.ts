import type { Article } from '../types';

interface GitHubRepo {
  id: number;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  topics?: string[];
  created_at: string;
  owner?: { avatar_url?: string };
}

export async function collectGitHub(): Promise<Article[]> {
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const since14d = twoWeeksAgo.toISOString().split('T')[0];

  // Same query as original — look back 14 days
  const query = `"ai agent" OR "llm" OR "machine learning" created:>${since14d}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=15`;

  const allRepos = new Map<number, GitHubRepo>();

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AI-News-Hacker-Dashboard' }
    });
    if (!response.ok) {
      console.warn(`[github] Query failed: ${response.status}`);
    } else {
      const data = await response.json() as { items?: GitHubRepo[] };
      for (const repo of (data.items || [])) {
        if (!allRepos.has(repo.id)) {
          allRepos.set(repo.id, repo);
        }
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[github] Fetch error: ${message}`);
  }

  const sorted = [...allRepos.values()]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 15);

  return sorted.map(repo => ({
    external_id: String(repo.id),
    source: 'github' as const,
    title: repo.full_name,
    description: repo.description ? repo.description.substring(0, 300) : 'No description provided.',
    url: repo.html_url,
    image_url: repo.owner?.avatar_url || null,
    tags: JSON.stringify(repo.topics?.slice(0, 5) || ['ai']),
    upvotes: repo.stargazers_count,
    comments: repo.forks_count,
    published_at: repo.created_at,
  }));
}
