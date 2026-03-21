import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import NewsFeed from './components/NewsFeed';
import ArticleDetail from './components/ArticleDetail';
import Bookmarks from './components/Bookmarks';
import AddArticleModal from './components/AddArticleModal';

type View = 'feed' | 'bookmarks';

function App() {
  const [currentArticle, setCurrentArticle] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState<View>('feed');
  const [showAddModal, setShowAddModal] = useState(false);
  const [feedKey, setFeedKey] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        setCurrentArticle(null);
        setView('feed');
      } else if (path === '/bookmarks') {
        setCurrentArticle(null);
        setView('bookmarks');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const selectArticle = (article: any) => {
    setCurrentArticle(article);
    const slug = article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    window.history.pushState({ articleId: article.id }, '', `/article/${article.id}/${slug}`);
  };

  const goBack = () => {
    setCurrentArticle(null);
    const path = view === 'bookmarks' ? '/bookmarks' : '/';
    window.history.pushState(null, '', path);
  };

  const navigate = (target: View) => {
    setView(target);
    setCurrentArticle(null);
    setSidebarOpen(false);
    window.history.pushState(null, '', target === 'feed' ? '/' : `/${target}`);
  };

  const renderContent = () => {
    if (currentArticle) {
      return <ArticleDetail article={currentArticle} onBack={goBack} />;
    }
    switch (view) {
      case 'bookmarks':
        return <Bookmarks onSelectArticle={selectArticle} />;
      default:
        return <NewsFeed key={feedKey} onSelectArticle={selectArticle} />;
    }
  };

  return (
    <div className="layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} activeView={view} onNavigate={navigate} />
      <main className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} onAddArticle={() => setShowAddModal(true)} />
        {renderContent()}
      </main>
      {showAddModal && (
        <AddArticleModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => { setView('feed'); setFeedKey(k => k + 1); window.history.pushState(null, '', '/'); }}
        />
      )}
    </div>
  );
}

export default App;
