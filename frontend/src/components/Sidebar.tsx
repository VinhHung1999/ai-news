import { Terminal, Hash, Bookmark, History, Settings } from 'lucide-react';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="logo">
        <Terminal size={24} color="var(--accent-brand)" />
        <span className="logo-text">root@ai.news:~#</span><span className="blink">_</span>
      </div>
      <nav className="nav-menu">
        <a href="#" className="nav-item active"><Hash size={18} /> ./my_feed.sh</a>
        <a href="#" className="nav-item"><Terminal size={18} /> ./discover.sh</a>
        <a href="#" className="nav-item"><Bookmark size={18} /> ./bookmarks</a>
        <a href="#" className="nav-item"><History size={18} /> ./history.log</a>
      </nav>
      <div className="sidebar-bottom">
        <a href="#" className="nav-item"><Settings size={18} /> ./config.json</a>
      </div>
    </aside>
  );
};
export default Sidebar;
