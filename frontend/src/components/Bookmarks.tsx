import { apiFetch } from '../api';
import { useEffect, useState } from 'react';
import NewsCard from './NewsCard';


interface BookmarksProps {
  onSelectArticle: (article: any) => void;
}

const Bookmarks = ({ onSelectArticle }: BookmarksProps) => {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/bookmarks`);
      if (res.ok) {
        const data = await res.json();
        setBookmarks(data);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feed-scroll">
      <div className="feed-header">
        <h1 className="title">~/ai.news/bookmarks$ ls -la</h1>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', color: 'var(--accent-brand)', fontSize: '1.2rem', fontWeight: 600 }}>
          &gt; Loading bookmarks... <span className="blink">_</span>
        </div>
      ) : bookmarks.length === 0 ? (
        <div style={{ padding: '2rem', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          &gt; No bookmarks yet. Save articles to see them here.
        </div>
      ) : (
        <div className="news-grid">
          {bookmarks.map((n) => (
            <NewsCard key={n.id} {...n} onClick={() => onSelectArticle(n)} onDelete={(id) => setBookmarks(prev => prev.filter(a => a.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
};
export default Bookmarks;
