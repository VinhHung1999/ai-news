import { Terminal, Hash, Bookmark, Settings, X } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  activeView: string;
  onNavigate: (view: 'feed' | 'bookmarks') => void;
}

const Sidebar = ({ open, onClose, activeView, onNavigate }: SidebarProps) => {
  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="logo">
        <Terminal size={24} color="var(--accent-brand)" />
        <span className="logo-text">root@ai.news:~#</span><span className="blink">_</span>
        <button className="sidebar-close-btn" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <nav className="nav-menu">
        <a href="#" className={`nav-item ${activeView === 'feed' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('feed'); }}>
          <Hash size={18} /> ./my_feed.sh
        </a>
        <a href="#" className={`nav-item ${activeView === 'bookmarks' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); onNavigate('bookmarks'); }}>
          <Bookmark size={18} /> ./bookmarks
        </a>
      </nav>
      <div className="sidebar-bottom">
        <a href="#" className="nav-item"><Settings size={18} /> ./config.json</a>
      </div>
    </aside>
  );
};
export default Sidebar;
