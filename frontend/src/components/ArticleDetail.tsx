import { apiFetch } from '../api';
import { useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, BookmarkPlus, BookmarkCheck, Star, GitFork, MessageSquare, Loader2, Pencil, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import BuHuChat from './BuHuChat';


interface ArticleDetailProps {
  article: any;
  onBack: () => void;
}

const ArticleDetail = ({ article, onBack }: ArticleDetailProps) => {
  const [fullContent, setFullContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'ai'>('content');
  const [bookmarked, setBookmarked] = useState(!!article.bookmarked);
  const [title, setTitle] = useState(article.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(article.title);

  useEffect(() => {
    fetchContent();
  }, [article.id]);

  const fetchContent = async () => {
    setLoadingContent(true);
    setContentError(null);
    try {
      const res = await apiFetch(`/api/articles/${article.id}/fetch-content`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setFullContent(data.content);
      } else {
        const data = await res.json();
        setContentError(data.error || 'Failed to fetch content');
      }
    } catch (err) {
      setContentError('Network error');
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="article-detail-layout">
      <div className="article-detail-main">
        {/* Top Bar */}
        <div className="article-top-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button className="action-btn" onClick={onBack} style={{ fontSize: '1rem', padding: '0.5rem 1rem', border: '1px solid var(--border-default)', transition: 'all 0.2s', borderRadius: '4px' }}>
              <ArrowLeft size={18} /> ./cd ..
            </button>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }} onClick={(e) => e.stopPropagation()}>
              <ExternalLink size={14} /> Original
            </a>
          </div>

          <div className="article-top-bar-title">
            {editingTitle ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
                <input
                  value={titleDraft}
                  onChange={e => setTitleDraft(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      const res = await apiFetch(`/api/articles/${article.id}/title`, {
                        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title: titleDraft }),
                      });
                      if (res.ok) { setTitle(titleDraft); setEditingTitle(false); }
                    } else if (e.key === 'Escape') { setTitleDraft(title); setEditingTitle(false); }
                  }}
                  autoFocus
                  style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--accent-brand)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 700, padding: '0.4rem 0.6rem', borderRadius: '4px', outline: 'none' }}
                />
                <button className="btn-primary" style={{ padding: '0.4rem' }} onClick={async () => {
                  const res = await apiFetch(`/api/articles/${article.id}/title`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: titleDraft }),
                  });
                  if (res.ok) { setTitle(titleDraft); setEditingTitle(false); }
                }}><Check size={16} /></button>
              </div>
            ) : (
              <span className="article-top-bar-title-text" onClick={() => setEditingTitle(true)}>
                &gt; {title} <Pencil size={14} style={{ opacity: 0.3, flexShrink: 0 }} />
              </span>
            )}

            <button className={bookmarked ? 'btn-primary' : 'btn-secondary'} style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', flexShrink: 0 }} onClick={async () => {
              try {
                const res = await apiFetch(`/api/articles/${article.id}/bookmark`, { method: 'POST' });
                if (res.ok) { const data = await res.json(); setBookmarked(data.bookmarked); }
              } catch (err) { console.error(err); }
            }}>
              {bookmarked ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
            </button>
          </div>
        </div>

        {/* Article Image/Gradient */}
        <motion.div
          className="article-content pro-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          {article.image ? (
            <div style={{ width: '100%', height: '300px', backgroundImage: `url(${article.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px dashed var(--border-default)', flexShrink: 0 }} />
          ) : (
            <div style={{ width: '100%', height: '120px', background: article.gradient || 'var(--border-default)', borderBottom: '1px dashed var(--border-default)', flexShrink: 0 }} />
          )}

          {/* Tab Bar */}
          <div className="article-tabs">
            <button
              className={`article-tab ${activeTab === 'content' ? 'article-tab-active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              Content
            </button>
            <button
              className={`article-tab ${activeTab === 'ai' ? 'article-tab-active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              AI
            </button>
          </div>

          {/* Tab Content */}
          <div className="article-tab-content">
            {activeTab === 'content' ? (
              <div className="article-detail-body">
                <div className="card-meta" style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  <span className="source-tag" style={{ padding: '0.2rem 0.6rem', fontSize: '0.9rem' }}>[{article.source}]</span>
                  <span className="time-tag">{article.time}</span>
                </div>

                <div className="card-tags" style={{ marginBottom: '1.5rem' }}>
                  {article.tags?.map((t: string) => <span key={t} className="badge" style={{ fontSize: '0.9rem' }}>--{t.toLowerCase()}</span>)}
                </div>

                {(article.upvotes > 0 || article.comments > 0) && (
                  <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1rem' }}>
                    {article.upvotes > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Star size={16} color="var(--accent-brand)" /> {article.upvotes.toLocaleString()} {article.source === 'GitHub' ? 'stars' : 'points'}
                      </span>
                    )}
                    {article.comments > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {article.source === 'GitHub' ? <GitFork size={16} /> : <MessageSquare size={16} />}
                        {article.comments.toLocaleString()} {article.source === 'GitHub' ? 'forks' : 'comments'}
                      </span>
                    )}
                  </div>
                )}

                {loadingContent ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-brand)', padding: '2rem 0' }}>
                    <Loader2 size={16} className="spin" /> Fetching article content...
                  </div>
                ) : contentError ? (
                  <div style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.05)', borderLeft: '4px solid #ef4444', borderRadius: '4px', marginBottom: '2rem' }}>
                    <p style={{ color: '#ef4444', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{contentError}</p>
                    <button className="btn-secondary" onClick={fetchContent} style={{ fontSize: '0.85rem' }}>
                      Retry
                    </button>
                  </div>
                ) : fullContent ? (
                  <div className="markdown-body" style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '2rem' }}>
                    <ReactMarkdown>{fullContent}</ReactMarkdown>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="article-ai-tab">
                <BuHuChat articleId={article.id} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default ArticleDetail;
