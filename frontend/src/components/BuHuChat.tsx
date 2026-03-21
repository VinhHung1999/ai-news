import { apiFetch } from '../api';
import { useState, useEffect, useRef, memo } from 'react';
import { Send, Bot, PanelRightClose, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface BuHuChatProps {
  articleId: number;
  onClose: () => void;
}

const BuHuChat = memo(({ articleId, onClose }: BuHuChatProps) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSummary();
  }, [articleId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, summary]);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await apiFetch(`/api/articles/${articleId}/summarize`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.error('Summary error:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiFetch(`/api/articles/${articleId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      <div className="buhu-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} color="var(--accent-brand)" />
          <span style={{ fontWeight: 700 }}>BuHu Assistant</span>
        </div>
        <button onClick={onClose} className="buhu-drawer-close">
          <PanelRightClose size={18} />
        </button>
      </div>

      <div className="buhu-drawer-messages">
        {loadingSummary ? (
          <div className="buhu-msg buhu-msg-assistant">
            <Loader2 size={14} className="spin" /> Summarizing this article...
          </div>
        ) : summary ? (
          <div className="buhu-msg buhu-msg-assistant">
            <div className="markdown-body"><ReactMarkdown>{summary}</ReactMarkdown></div>
          </div>
        ) : null}

        {!loadingSummary && !summary && chatMessages.length === 0 && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 1rem', textAlign: 'center' }}>
            <Bot size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p>Ask me anything about this article...</p>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={i} className={`buhu-msg buhu-msg-${msg.role}`}>
            {msg.role === 'assistant' ? (
              <div className="markdown-body"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {chatLoading && (
          <div className="buhu-msg buhu-msg-assistant">
            <Loader2 size={14} className="spin" /> Thinking...
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="buhu-drawer-input">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder="Ask BuHu..."
          disabled={chatLoading}
        />
        <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()}>
          <Send size={16} />
        </button>
      </div>
    </>
  );
});

export default BuHuChat;
