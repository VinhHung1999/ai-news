import { Search, Bell, PlusSquare, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuToggle: () => void;
  onAddArticle?: () => void;
}

const Header = ({ onMenuToggle, onAddArticle }: HeaderProps) => {
  return (
    <header className="header">
      <button className="menu-toggle-btn" onClick={onMenuToggle}>
        <Menu size={22} />
      </button>
      <div className="search-bar">
        <span style={{color: 'var(--accent-brand)', fontWeight: 800}}>&gt;</span>
        <input type="text" placeholder="grep -i 'attention' /var/lib/news/..." />
        <Search size={16} color="var(--text-muted)" />
      </div>
      <div className="header-actions">
        <button className="icon-btn" onClick={onAddArticle} title="Add article"><PlusSquare size={18} /></button>
        <button className="icon-btn"><Bell size={18} /></button>
        <div className="avatar">_<span className="blink">|</span></div>
      </div>
    </header>
  );
};
export default Header;
