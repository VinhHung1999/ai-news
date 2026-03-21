import { MessageSquare, ArrowUp, BookmarkPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface NewsCardProps {
  title: string;
  source: string;
  time: string;
  tags: string[];
  upvotes: number;
  comments: number;
  image?: string;
  gradient?: string;
  delay?: number;
  onClick?: () => void;
}

const NewsCard = ({ title, source, time, tags, upvotes, comments, image, gradient, delay = 0, onClick }: NewsCardProps) => {
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
        <button className="action-btn" onClick={(e) => e.stopPropagation()}><BookmarkPlus size={16} /></button>
      </div>
    </motion.div>
  );
};
export default NewsCard;
