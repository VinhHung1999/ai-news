import { apiFetch } from '../api';
import { useState, useRef } from 'react';
import { X, Link, Upload, Loader2 } from 'lucide-react';


interface AddArticleModalProps {
  onClose: () => void;
  onAdded: (article: any) => void;
}

const AddArticleModal = ({ onClose, onAdded }: AddArticleModalProps) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/api/articles/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded(data.article);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add article');
    } finally {
      setLoading(false);
    }
  };

  const handleFile = async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch(`/api/articles/add`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onAdded(data.article);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>&gt; ./add_article.sh</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* URL input */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>
              <Link size={14} style={{ verticalAlign: 'middle' }} /> Paste URL (GitHub, blog, news...)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrl()}
                placeholder="https://github.com/owner/repo or any URL..."
                className="modal-input"
                disabled={loading}
              />
              <button className="btn-primary" onClick={handleUrl} disabled={loading || !url.trim()} style={{ whiteSpace: 'nowrap' }}>
                {loading ? <Loader2 size={16} className="spin" /> : 'Add'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '1rem 0' }}>
            — or —
          </div>

          {/* File upload */}
          <div
            className="upload-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
            onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
            onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
          >
            <Upload size={24} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <p>Drop file here or click to upload</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>.pdf, .docx, .md, .txt</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.md,.txt"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
            />
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '1rem', padding: '0.5rem', background: 'rgba(239,68,68,0.1)', borderRadius: '4px' }}>
              Error: {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AddArticleModal;
