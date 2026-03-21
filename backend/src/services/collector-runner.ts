import { collectGitHub } from '../collectors/github';
import { collectAnthropic } from '../collectors/anthropic';
import { collectGoogleAI } from '../collectors/google-ai';
import { collectHackerNews } from '../collectors/hackernews';
import { insertMany, markTopPicks } from '../db/database';
import type { Article } from '../types';

const collectors = [
  { name: 'GitHub', fn: collectGitHub },
  { name: 'Anthropic', fn: collectAnthropic },
  { name: 'Google AI', fn: collectGoogleAI },
  { name: 'Hacker News', fn: collectHackerNews },
];

export async function runAllCollectors() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`\n[collector] Starting collection for ${today}...`);

  const results = await Promise.allSettled(
    collectors.map(async ({ name, fn }) => {
      console.log(`[${name}] Fetching...`);
      const articles = await fn();
      const stamped: Article[] = articles.map(a => ({
        ...a,
        collected_at: today,
        is_top_pick: false,
      }));
      const inserted = await insertMany(stamped);
      console.log(`[${name}] Done: ${inserted} new articles (${articles.length} fetched)`);
      return { name, fetched: articles.length, inserted };
    })
  );

  let totalInserted = 0;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      totalInserted += result.value.inserted;
    } else {
      console.error(`[collector] FAILED:`, result.reason?.message || result.reason);
    }
  }

  await markTopPicks(today);
  console.log(`[collector] Complete! ${totalInserted} new articles saved. Top picks marked.\n`);

  return results;
}
