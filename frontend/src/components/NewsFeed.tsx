import { useEffect, useState } from 'react';
import NewsCard from './NewsCard';

interface NewsFeedProps {
  onSelectArticle: (article: any) => void;
}

const NewsFeed = ({ onSelectArticle }: NewsFeedProps) => {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/github');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        setNews(data);
      } catch (err) {
        console.error('Failed to fetch:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  return (
    <div className="feed-scroll">
      <div className="feed-header">
        <h1 className="title">~/ai.news/feed$ ls -la</h1>
        <div className="feed-filters">
          <button className="filter-btn active">--sort=hot</button>
          <button className="filter-btn">--sort=new</button>
          <button className="filter-btn">--watch</button>
        </div>
      </div>
      
      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--accent-brand)', fontSize: '1.2rem', fontWeight: 600 }}>
          &gt; Fetching intelligence from GitHub API... <span className="blink">_</span>
        </div>
      ) : (
        <>
          {news.length > 0 && (
            <div className="repo-of-the-day" onClick={() => onSelectArticle(news[0])}>
              <div className="rotd-label">[REPO_OF_THE_DAY] --highest-score</div>
              <div className="rotd-content">
                <h2 className="title blink-hover">&gt; {news[0].title}</h2>
                <p className="rotd-desc">{news[0].desc}</p>
                <div className="card-tags">
                  {news[0].tags.map((t: string) => <span key={t} className="badge">--{t.toLowerCase()}</span>)}
                </div>
              </div>
              <div className="rotd-stats">
                <span>★ {news[0].upvotes}</span>
                <span title="Forks">⑂ {news[0].comments}</span>
              </div>
            </div>
          )}
          <div className="news-grid">
            {news.slice(1).map((n) => (
              <NewsCard key={n.id} {...n} onClick={() => onSelectArticle(n)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
export default NewsFeed;
