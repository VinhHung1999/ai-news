import { apiFetch } from '../api';
import { useEffect, useState } from 'react';
import NewsCard from './NewsCard';


interface NewsFeedProps {
  onSelectArticle: (article: any) => void;
}

const SOURCES = [
  { key: '', label: '--all' },
  { key: 'github', label: '--github' },
  { key: 'anthropic', label: '--anthropic' },
  { key: 'google_ai', label: '--google-ai' },
];

const NewsFeed = ({ onSelectArticle }: NewsFeedProps) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSource, setActiveSource] = useState('');
  const [collecting, setCollecting] = useState(false);

  const fetchNews = async (source: string) => {
    setLoading(true);
    try {
      const params = source ? `?source=${source}` : '';
      const res = await apiFetch(`/api/news${params}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setNews(data);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(activeSource);
  }, [activeSource]);

  const handleCollect = async () => {
    setCollecting(true);
    try {
      const res = await apiFetch(`/api/news/collect`, { method: 'POST' });
      if (!res.ok) throw new Error('Collection failed');
      await fetchNews(activeSource);
    } catch (err) {
      console.error('Collection error:', err);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <div className="feed-scroll">
      <div className="feed-header">
        <h1 className="title">~/ai.news/feed$ ls -la</h1>
        <div className="feed-filters">
          {SOURCES.map(s => (
            <button
              key={s.key}
              className={`filter-btn ${activeSource === s.key ? 'active' : ''}`}
              onClick={() => setActiveSource(s.key)}
            >
              {s.label}
            </button>
          ))}
          <button
            className="filter-btn collect-btn"
            onClick={handleCollect}
            disabled={collecting}
          >
            {collecting ? '> collecting...' : '> ./collect.sh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--accent-brand)', fontSize: '1.2rem', fontWeight: 600 }}>
          &gt; Fetching intelligence from sources... <span className="blink">_</span>
        </div>
      ) : news.length === 0 ? (
        <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          &gt; No data found. Run <span style={{ color: 'var(--accent-brand)', cursor: 'pointer' }} onClick={handleCollect}>./collect.sh</span> to fetch latest AI news.
        </div>
      ) : (
        <>
          {(() => {
            // Top pick = highest upvotes, rest sorted by newest (already from API)
            const topPick = [...news].sort((a, b) => b.upvotes - a.upvotes)[0];
            const rest = news.filter(n => n.id !== topPick?.id);
            return (
              <>
                {topPick && topPick.upvotes > 0 && (
                  <div className="repo-of-the-day" onClick={() => onSelectArticle(topPick)}>
                    <div className="rotd-label">[TOP_PICK] --highest-score</div>
                    <div className="rotd-content">
                      <h2 className="title blink-hover">&gt; {topPick.title}</h2>
                      <p className="rotd-desc">{topPick.desc}</p>
                      <div className="card-tags">
                        {topPick.tags.map((t: string) => <span key={t} className="badge">--{t.toLowerCase()}</span>)}
                      </div>
                    </div>
                    <div className="rotd-stats">
                      <span className="source-tag">[{topPick.source}]</span>
                      <span>★ {topPick.upvotes}</span>
                      <span title="Comments/Forks">⑂ {topPick.comments}</span>
                    </div>
                  </div>
                )}
                <div className="news-grid">
                  {(topPick && topPick.upvotes > 0 ? rest : news).map((n) => (
                    <NewsCard key={n.id} {...n} onClick={() => onSelectArticle(n)} />
                  ))}
                </div>
              </>
            );
          })()}
        </>
      )}
    </div>
  );
};
export default NewsFeed;
