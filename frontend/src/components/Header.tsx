import { Search, Bell, PlusSquare } from 'lucide-react';

const Header = () => {
  return (
    <header className="header">
      <div className="search-bar">
        <span style={{color: 'var(--accent-brand)', fontWeight: 800}}>&gt;</span>
        <input type="text" placeholder="grep -i 'attention' /var/lib/news/..." />
        <Search size={16} color="var(--text-muted)" />
      </div>
      <div className="header-actions">
        <button className="icon-btn"><PlusSquare size={18} /></button>
        <button className="icon-btn"><Bell size={18} /></button>
        <div className="avatar">_<span className="blink">|</span></div>
      </div>
    </header>
  );
};
export default Header;
