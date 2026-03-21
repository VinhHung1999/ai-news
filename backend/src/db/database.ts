import pg from 'pg';
import type { Article, ArticleRow } from '../types';

const pool = new pg.Pool({
  database: 'ai_news',
  host: 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
});

export async function insertMany(articles: Article[]): Promise<number> {
  const client = await pool.connect();
  try {
    let inserted = 0;
    for (const a of articles) {
      const result = await client.query(
        `INSERT INTO articles (external_id, source, title, description, url, image_url, tags, upvotes, comments, published_at, collected_at, is_top_pick)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (url) DO NOTHING`,
        [a.external_id, a.source, a.title, a.description, a.url, a.image_url, a.tags, a.upvotes, a.comments, a.published_at, a.collected_at, a.is_top_pick ?? false]
      );
      if (result.rowCount && result.rowCount > 0) inserted++;
    }
    return inserted;
  } finally {
    client.release();
  }
}

export async function getArticlesByDate(date: string, source?: string | null): Promise<ArticleRow[]> {
  let query = 'SELECT * FROM articles WHERE collected_at = $1';
  const params: string[] = [date];
  if (source) {
    query += ' AND source = $2';
    params.push(source);
  }
  query += ' ORDER BY id DESC';
  const result = await pool.query(query, params);
  return result.rows;
}

export async function getTopPicks(date: string): Promise<ArticleRow[]> {
  const result = await pool.query(
    'SELECT * FROM articles WHERE collected_at = $1 AND is_top_pick = TRUE ORDER BY upvotes DESC',
    [date]
  );
  return result.rows;
}

export async function markTopPicks(date: string): Promise<void> {
  const sources = await pool.query(
    'SELECT DISTINCT source FROM articles WHERE collected_at = $1',
    [date]
  );

  for (const { source } of sources.rows) {
    await pool.query(
      `UPDATE articles SET is_top_pick = TRUE
       WHERE id = (SELECT id FROM articles WHERE collected_at = $1 AND source = $2 ORDER BY upvotes DESC LIMIT 1)`,
      [date, source]
    );
  }
}

export async function getLatestCollectionDate(): Promise<string | null> {
  const result = await pool.query("SELECT to_char(MAX(collected_at), 'YYYY-MM-DD') as date FROM articles");
  return result.rows[0]?.date || null;
}

export async function insertOneArticle(article: Article): Promise<ArticleRow> {
  const result = await pool.query(
    `INSERT INTO articles (external_id, source, title, description, url, image_url, tags, upvotes, comments, published_at, collected_at, is_top_pick, full_content)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [article.external_id, article.source, article.title, article.description, article.url, article.image_url, article.tags, article.upvotes, article.comments, article.published_at, article.collected_at, article.is_top_pick ?? false, (article as any).full_content || null]
  );
  return result.rows[0];
}

export async function getArticleById(id: number): Promise<ArticleRow | null> {
  const result = await pool.query('SELECT * FROM articles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function updateFullContent(id: number, content: string): Promise<void> {
  await pool.query('UPDATE articles SET full_content = $1 WHERE id = $2', [content, id]);
}

export async function updateAiSummary(id: number, summary: string): Promise<void> {
  await pool.query('UPDATE articles SET ai_summary = $1 WHERE id = $2', [summary, id]);
}

export async function updateTitle(id: number, title: string): Promise<void> {
  await pool.query('UPDATE articles SET title = $1 WHERE id = $2', [title, id]);
}

export async function toggleBookmark(id: number): Promise<boolean> {
  const result = await pool.query(
    'UPDATE articles SET bookmarked = NOT bookmarked WHERE id = $1 RETURNING bookmarked',
    [id]
  );
  return result.rows[0]?.bookmarked ?? false;
}

export async function getBookmarks(): Promise<ArticleRow[]> {
  const result = await pool.query('SELECT * FROM articles WHERE bookmarked = TRUE ORDER BY id DESC');
  return result.rows;
}

export async function closePool(): Promise<void> {
  await pool.end();
}
