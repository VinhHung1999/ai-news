import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import NewsFeed from './components/NewsFeed';
import ArticleDetail from './components/ArticleDetail';

function App() {
  const [currentArticle, setCurrentArticle] = useState<any | null>(null);

  return (
    <div className="layout">
      <Sidebar />
      <main className="main-content">
        <Header />
        {currentArticle ? (
          <ArticleDetail article={currentArticle} onBack={() => setCurrentArticle(null)} />
        ) : (
          <NewsFeed onSelectArticle={(article) => setCurrentArticle(article)} />
        )}
      </main>
    </div>
  );
}

export default App;
