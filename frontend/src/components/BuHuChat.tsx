import { apiFetch } from '../api';
import { useState, useEffect, useRef, memo } from 'react';
import { Send, Bot, GraduationCap, PanelRightClose, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';


interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

type AiMode = 'buhu' | 'deep-tutor';

interface BuHuChatProps {
  articleId: number;
  onClose: () => void;
}

const BuHuChat = memo(({ articleId, onClose }: BuHuChatProps) => {
  const [mode, setMode] = useState<AiMode>('deep-tutor');

  // BuHu state
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [buhuMessages, setBuhuMessages] = useState<ChatMessage[]>([]);

  // Deep Tutor state
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([]);
  const [tutorStarted, setTutorStarted] = useState(false);
  const [tutorLoading, setTutorLoading] = useState(false);

  // Shared state
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const messages = mode === 'buhu' ? buhuMessages : tutorMessages;
  const setMessages = mode === 'buhu' ? setBuhuMessages : setTutorMessages;
  const isLoading = mode === 'buhu' ? chatLoading : (chatLoading || tutorLoading);

  useEffect(() => {
    fetchSummary();
  }, [articleId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [buhuMessages, tutorMessages, summary, mode]);

  // Auto-start Deep Tutor with overview when first switching to it
  useEffect(() => {
    if (mode === 'deep-tutor' && !tutorStarted && tutorMessages.length === 0) {
      startDeepTutor();
    }
  }, [mode]);

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

  const startDeepTutor = async () => {
    setTutorStarted(true);
    setTutorLoading(true);
    const initMsg: ChatMessage = { role: 'user', content: 'Please provide a structured overview and outline of this article. Break it into key sections and highlight the main points I should pay attention to.' };
    setTutorMessages([initMsg]);

    try {
      const res = await apiFetch(`/api/articles/${articleId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [initMsg], mode: 'deep-tutor' }),
      });
      if (res.ok) {
        const data = await res.json();
        setTutorMessages([initMsg, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Deep Tutor init error:', err);
    } finally {
      setTutorLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: chatInput.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await apiFetch(`/api/articles/${articleId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, mode: mode === 'deep-tutor' ? 'deep-tutor' : undefined }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      {/* Drawer Header */}
      <div className="buhu-drawer-header">
        {/* Mode Switcher */}
        <div className="ai-mode-switcher">
          <button
            className={`ai-mode-btn ${mode === 'deep-tutor' ? 'ai-mode-btn-active' : ''}`}
            onClick={() => setMode('deep-tutor')}
          >
            <GraduationCap size={14} /> Deep Tutor
          </button>
          <button
            className={`ai-mode-btn ${mode === 'buhu' ? 'ai-mode-btn-active' : ''}`}
            onClick={() => setMode('buhu')}
          >
            <Bot size={14} /> BuHu
          </button>
        </div>
        <button onClick={onClose} className="buhu-drawer-close">
          <PanelRightClose size={18} />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="buhu-drawer-messages">
        {mode === 'buhu' && (
          <>
            {loadingSummary ? (
              <div className="buhu-msg buhu-msg-assistant">
                <Loader2 size={14} className="spin" /> Summarizing this article...
              </div>
            ) : summary ? (
              <div className="buhu-msg buhu-msg-assistant">
                <div className="markdown-body"><ReactMarkdown>{summary}</ReactMarkdown></div>
              </div>
            ) : null}

            {!loadingSummary && !summary && buhuMessages.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 1rem', textAlign: 'center' }}>
                <Bot size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                <p>Ask me anything about this article...</p>
              </div>
            )}
          </>
        )}

        {mode === 'deep-tutor' && tutorMessages.length === 0 && !tutorLoading && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', padding: '2rem 1rem', textAlign: 'center' }}>
            <GraduationCap size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
            <p>Deep Tutor will analyze this article for deep understanding...</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`buhu-msg buhu-msg-${msg.role}`}>
            {msg.role === 'assistant' ? (
              <div className="markdown-body"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            ) : (
              msg.content
            )}
          </div>
        ))}
        {isLoading && (
          <div className="buhu-msg buhu-msg-assistant">
            <Loader2 size={14} className="spin" /> {mode === 'deep-tutor' ? 'Analyzing...' : 'Thinking...'}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <div className="buhu-drawer-input">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChat()}
          placeholder={mode === 'deep-tutor' ? 'Ask Deep Tutor...' : 'Ask BuHu...'}
          disabled={isLoading}
        />
        <button onClick={sendChat} disabled={isLoading || !chatInput.trim()}>
          <Send size={16} />
        </button>
      </div>
    </>
  );
});

export default BuHuChat;
