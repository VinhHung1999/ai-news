import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import { getArticlesByDate, getTopPicks, getLatestCollectionDate, getArticleById, updateFullContent, updateAiSummary, toggleBookmark, getBookmarks, insertOneArticle, updateTitle } from './db/database';
import { runAllCollectors } from './services/collector-runner';
import { summarizeArticle, chatAboutArticle } from './services/ai';
import { fetchContentFromUrl, extractContentFromFile } from './services/content-fetcher';
import type { ArticleRow, FormattedArticle } from './types';

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// API key auth middleware — protects write endpoints
import type { NextFunction } from 'express';
const requireApiKey = (req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key'] as string;
  if (!process.env.APP_API_KEY || key === process.env.APP_API_KEY) {
    return next();
  }
  res.status(401).json({ error: 'Invalid API key' });
};

const SOURCE_GRADIENTS: Record<string, string> = {
  github: 'linear-gradient(135deg, #001a1a 0%, #003333 100%)',
  anthropic: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)',
  google_ai: 'linear-gradient(135deg, #0a1628 0%, #1a2940 100%)',
  hackernews: 'linear-gradient(135deg, #1a1200 0%, #332600 100%)',
  manual: 'linear-gradient(135deg, #1a0a1a 0%, #2d1b2d 100%)',
};

const SOURCE_LABELS: Record<string, string> = {
  github: 'GitHub',
  anthropic: 'Anthropic',
  google_ai: 'Google AI',
  hackernews: 'Hacker News',
  manual: 'Manual',
};

function formatArticle(article: ArticleRow, index: number): FormattedArticle {
  let tags: string[];
  try { tags = JSON.parse(article.tags); } catch { tags = ['ai']; }

  return {
    id: article.id,
    title: article.title,
    source: SOURCE_LABELS[article.source] || article.source,
    time: article.published_at
      ? new Date(article.published_at).toLocaleDateString()
      : article.collected_at,
    tags,
    upvotes: article.upvotes,
    comments: article.comments,
    desc: article.description || '',
    gradient: SOURCE_GRADIENTS[article.source] || SOURCE_GRADIENTS.github,
    url: article.url,
    image: article.image_url || undefined,
    delay: (index % 10) * 0.05,
    is_top_pick: !!article.is_top_pick,
    has_content: !!article.full_content,
    has_summary: !!article.ai_summary,
    bookmarked: !!article.bookmarked,
  };
}

app.get('/api/news', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || await getLatestCollectionDate();
    if (!date) return res.json([]);
    const source = (req.query.source as string) || null;
    const articles = await getArticlesByDate(date, source);
    res.json(articles.map(formatArticle));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error fetching news:', message);
    res.status(500).json({ error: message });
  }
});

app.get('/api/news/top-picks', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || await getLatestCollectionDate();
    if (!date) return res.json([]);
    const picks = await getTopPicks(date);
    res.json(picks.map(formatArticle));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Error fetching top picks:', message);
    res.status(500).json({ error: message });
  }
});

app.post('/api/news/collect', requireApiKey, async (_req: Request, res: Response) => {
  try {
    console.log('[api] Manual collection triggered');
    const results = await runAllCollectors();
    const summary = results.map((r, i) => ({
      source: ['GitHub', 'Anthropic', 'Google AI', 'Hacker News', 'Star History'][i],
      status: r.status,
      ...(r.status === 'fulfilled' ? r.value : { error: (r as PromiseRejectedResult).reason?.message }),
    }));
    res.json({ success: true, summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Collection error:', message);
    res.status(500).json({ error: message });
  }
});

app.get('/api/github', async (_req: Request, res: Response) => {
  try {
    const date = await getLatestCollectionDate();
    if (!date) return res.json([]);
    const articles = await getArticlesByDate(date, 'github');
    res.json(articles.map(formatArticle));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// GET /api/articles/:id — get single article with full content
app.get('/api/articles/:id', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(Number(req.params.id));
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({
      ...formatArticle(article, 0),
      full_content: article.full_content,
      ai_summary: article.ai_summary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /api/articles/:id/fetch-content — fetch full content via Jina Reader
app.post('/api/articles/:id/fetch-content', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(Number(req.params.id));
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.full_content) {
      return res.json({ content: article.full_content, cached: true });
    }

    let markdown: string;

    if (article.source === 'github') {
      // GitHub: fetch README.md directly from API (already markdown)
      const repoName = article.title; // e.g. "owner/repo"
      const readmeRes = await fetch(`https://api.github.com/repos/${repoName}/readme`, {
        headers: { 'Accept': 'application/vnd.github.raw', 'User-Agent': 'AI-News-Hacker-Dashboard' }
      });
      if (!readmeRes.ok) throw new Error(`GitHub README error: ${readmeRes.status}`);
      markdown = await readmeRes.text();
    } else {
      // Other sources: fetch via Jina Reader
      const jinaRes = await fetch(`https://r.jina.ai/${article.url}`, {
        headers: { 'Accept': 'text/markdown', 'User-Agent': 'AI-News-Hacker-Dashboard' }
      });
      if (!jinaRes.ok) throw new Error(`Jina Reader error: ${jinaRes.status}`);
      markdown = await jinaRes.text();
    }

    await updateFullContent(article.id, markdown);
    res.json({ content: markdown, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Fetch content error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/articles/:id/summarize — AI summary via xAI
app.post('/api/articles/:id/summarize', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(Number(req.params.id));
    if (!article) return res.status(404).json({ error: 'Article not found' });

    if (article.ai_summary) {
      return res.json({ summary: article.ai_summary, cached: true });
    }

    // Need content first
    const content = article.full_content || article.description || '';
    if (!content) return res.status(400).json({ error: 'No content to summarize' });

    const summary = await summarizeArticle(article.title, content);
    await updateAiSummary(article.id, summary);
    res.json({ summary, cached: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Summarize error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/articles/:id/chat — chat with BuHu Assistant about article
app.post('/api/articles/:id/chat', async (req: Request, res: Response) => {
  try {
    const article = await getArticleById(Number(req.params.id));
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const content = article.full_content || article.description || '';
    const { messages } = req.body as { messages: { role: 'user' | 'assistant'; content: string }[] };

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const reply = await chatAboutArticle(article.title, content, messages);
    res.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Chat error:', message);
    res.status(500).json({ error: message });
  }
});

// POST /api/articles/add — add article manually (URL or file)
app.post('/api/articles/add', requireApiKey, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    let title: string;
    let content: string;
    let url: string;

    if (req.file) {
      // File upload
      const result = await extractContentFromFile(req.file.buffer, req.file.originalname);
      title = result.title;
      content = result.content;
      url = `file://${req.file.originalname}`;
    } else if (req.body.url) {
      // URL
      url = req.body.url;
      const result = await fetchContentFromUrl(url);
      title = result.title;
      content = result.content;
    } else {
      return res.status(400).json({ error: 'Provide a URL or upload a file' });
    }

    const article = await insertOneArticle({
      external_id: `manual-${Date.now()}`,
      source: 'manual' as any,
      title,
      description: content.substring(0, 300),
      url,
      image_url: null,
      tags: JSON.stringify(['manual']),
      upvotes: 0,
      comments: 0,
      published_at: new Date().toISOString(),
      collected_at: today,
      is_top_pick: false,
      full_content: content,
    } as any);

    res.json({ success: true, article: formatArticle(article, 0) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Add article error:', message);
    res.status(500).json({ error: message });
  }
});

// PATCH /api/articles/:id/title
app.patch('/api/articles/:id/title', requireApiKey, async (req: Request, res: Response) => {
  try {
    const { title } = req.body as { title: string };
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    await updateTitle(Number(req.params.id), title.trim());
    res.json({ success: true, title: title.trim() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// POST /api/articles/:id/bookmark — toggle bookmark
app.post('/api/articles/:id/bookmark', requireApiKey, async (req: Request, res: Response) => {
  try {
    const bookmarked = await toggleBookmark(Number(req.params.id));
    res.json({ bookmarked });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// GET /api/bookmarks — get all bookmarked articles
app.get('/api/bookmarks', async (_req: Request, res: Response) => {
  try {
    const articles = await getBookmarks();
    res.json(articles.map(formatArticle));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

// Serve frontend static files in production
import path from 'path';
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// Cron: collect daily at 5AM
import cron from 'node-cron';
cron.schedule('0 5 * * *', async () => {
  console.log(`[cron] Scheduled run at ${new Date().toISOString()}`);
  try {
    await runAllCollectors();
  } catch (err) {
    console.error('[cron] Scheduled collection error:', err);
  }
});

const PORT = 3342;
app.listen(PORT, () => {
  console.log(`[root@ai.news:~#] Backend server active on http://localhost:${PORT}`);
  console.log(`[cron] Scheduler active. Next run: 5:00 AM daily.`);
});
