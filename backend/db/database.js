const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ai_news.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      url TEXT NOT NULL UNIQUE,
      image_url TEXT,
      tags TEXT,
      upvotes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      published_at TEXT,
      collected_at TEXT NOT NULL,
      is_top_pick INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
    CREATE INDEX IF NOT EXISTS idx_articles_collected ON articles(collected_at);
  `);
}

function insertArticle(article) {
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO articles (external_id, source, title, description, url, image_url, tags, upvotes, comments, published_at, collected_at, is_top_pick)
    VALUES (@external_id, @source, @title, @description, @url, @image_url, @tags, @upvotes, @comments, @published_at, @collected_at, @is_top_pick)
  `);
  return stmt.run(article);
}

function insertMany(articles) {
  const insert = getDb().prepare(`
    INSERT OR IGNORE INTO articles (external_id, source, title, description, url, image_url, tags, upvotes, comments, published_at, collected_at, is_top_pick)
    VALUES (@external_id, @source, @title, @description, @url, @image_url, @tags, @upvotes, @comments, @published_at, @collected_at, @is_top_pick)
  `);
  const tx = getDb().transaction((items) => {
    let inserted = 0;
    for (const item of items) {
      const result = insert.run(item);
      if (result.changes > 0) inserted++;
    }
    return inserted;
  });
  return tx(articles);
}

function getArticlesByDate(date, source) {
  let query = 'SELECT * FROM articles WHERE collected_at = ?';
  const params = [date];
  if (source) {
    query += ' AND source = ?';
    params.push(source);
  }
  query += ' ORDER BY upvotes DESC';
  return getDb().prepare(query).all(...params);
}

function getTopPicks(date) {
  return getDb().prepare(
    'SELECT * FROM articles WHERE collected_at = ? AND is_top_pick = 1 ORDER BY upvotes DESC'
  ).all(date);
}

function markTopPicks(date) {
  const sources = getDb().prepare(
    'SELECT DISTINCT source FROM articles WHERE collected_at = ?'
  ).all(date);

  const update = getDb().prepare(
    `UPDATE articles SET is_top_pick = 1
     WHERE id = (SELECT id FROM articles WHERE collected_at = ? AND source = ? ORDER BY upvotes DESC LIMIT 1)`
  );

  for (const { source } of sources) {
    update.run(date, source);
  }
}

function getLatestCollectionDate() {
  const row = getDb().prepare('SELECT MAX(collected_at) as date FROM articles').get();
  return row?.date || null;
}

module.exports = { getDb, insertArticle, insertMany, getArticlesByDate, getTopPicks, markTopPicks, getLatestCollectionDate };
