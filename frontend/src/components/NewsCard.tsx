import { apiFetch } from '../api';
import { useState } from 'react';
import { MessageSquare, ArrowUp, BookmarkPlus, BookmarkCheck } from 'lucide-react';
import { motion } from 'framer-motion';


interface NewsCardProps {
  id: number;
  title: string;
  source: string;
  time: string;
  tags: string[];
  upvotes: number;
  comments: number;
  image?: string;
  gradient?: string;
  delay?: number;
  bookmarked?: boolean;
  onClick?: () => void;
}

const NewsCard = ({ id, title, source, time, tags, upvotes, comments, image, gradient, delay = 0, bookmarked: initialBookmarked, onClick }: NewsCardProps) => {
  const [bookmarked, setBookmarked] = useState(!!initialBookmarked);

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await apiFetch(`/api/articles/${id}/bookmark`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      className="news-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {image ? (
        <div className="card-image" style={{ backgroundImage: `url(${image})` }} />
      ) : (
        <div className="card-image" style={{ background: gradient || 'var(--border-default)', opacity: 0.8 }} />
      )}
      <div className="card-content">
        <div className="card-meta">
          <span className="source-tag">[{source}]</span>
          <span className="time-tag">{time}</span>
        </div>
        <h3 className="card-title">&gt; {title}</h3>
        <div className="card-tags">
          {tags.map(t => <span key={t} className="badge">--{t.toLowerCase()}</span>)}
        </div>
      </div>
      <div className="card-footer">
        <div className="footer-left">
          <button className="action-btn" onClick={(e) => e.stopPropagation()}><ArrowUp size={14} /> {upvotes}</button>
          <button className="action-btn" onClick={(e) => e.stopPropagation()}><MessageSquare size={14} /> {comments}</button>
        </div>
        <button className={`action-btn ${bookmarked ? 'bookmarked' : ''}`} onClick={handleBookmark}>
          {bookmarked ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
        </button>
      </div>
    </motion.div>
  );
};
export default NewsCard;
