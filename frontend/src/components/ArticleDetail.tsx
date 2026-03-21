import { ArrowLeft, ExternalLink, MessageSquare, ArrowUp, Share2, BookmarkPlus } from 'lucide-react';
import { motion } from 'framer-motion';

interface ArticleDetailProps {
  article: any;
  onBack: () => void;
}

const ArticleDetail = ({ article, onBack }: ArticleDetailProps) => {
  return (
    <div className="feed-scroll article-detail-scroll">
      <div className="feed-header" style={{ marginBottom: '1rem', borderBottom: 'none' }}>
        <button className="action-btn" onClick={onBack} style={{ fontSize: '1rem', padding: '0.5rem 1rem', border: '1px solid var(--border-default)', transition: 'all 0.2s', borderRadius: '4px' }}>
          <ArrowLeft size={18} /> ./cd ..
        </button>
      </div>
      
      <motion.div 
        className="article-content pro-card" 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ padding: 0, maxWidth: '900px', margin: '0 auto', overflow: 'hidden' }}
      >
        {article.image ? (
          <div style={{ width: '100%', height: '350px', backgroundImage: `url(${article.image})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px dashed var(--border-default)' }} />
        ) : (
          <div style={{ width: '100%', height: '150px', background: article.gradient || 'var(--border-default)', borderBottom: '1px dashed var(--border-default)' }} />
        )}
        
        <div style={{ padding: '3rem' }}>
          <div className="card-meta" style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            <span className="source-tag" style={{ padding: '0.2rem 0.6rem', fontSize: '0.9rem' }}>[{article.source}]</span>
            <span className="time-tag">{article.time}</span>
          </div>
          
          <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            &gt; {article.title}
          </h1>
          
          <div className="card-tags" style={{ marginBottom: '2.5rem' }}>
            {article.tags?.map((t: string) => <span key={t} className="badge" style={{ fontSize: '0.9rem' }}>--{t.toLowerCase()}</span>)}
          </div>
          
          <div style={{ background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid var(--accent-brand)', padding: '2rem', borderRadius: '4px', marginBottom: '2.5rem' }}>
            <h4 style={{ color: 'var(--accent-brand)', marginBottom: '1rem', fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               tail -n 50 AI_SUMMARY.TXT
            </h4>
            <p style={{ color: 'var(--text-primary)', lineHeight: 1.8, fontSize: '1.05rem' }}>
              Báo cáo này xoáy sâu vào các cơ chế attention mới giúp mô hình LLM xử lý hơn 1 triệu tokens cùng lúc. Bằng cách sử dụng các bản đồ chú ý thưa (sparse attention maps), lượng băng thông bộ nhớ cần thiết đã giảm đi đáng kể. 
              <br/><br/>
              Khuyến nghị cho kỹ sư: Thuật toán này có thể được ứng dụng trong các chatbot Retrieval-Augmented Generation (RAG) yêu cầu nạp thư viện dữ liệu nội bộ cực lớn.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed var(--border-default)' }}>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none' }}>
              ./read_original.sh <ExternalLink size={16} />
            </a>
            <button className="btn-secondary"><BookmarkPlus size={18} /> save</button>
            <button className="btn-secondary"><Share2 size={18} /> share</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
export default ArticleDetail;
