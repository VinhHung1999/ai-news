export interface Article {
  external_id: string;
  source: 'github' | 'anthropic' | 'google_ai' | 'hackernews';
  title: string;
  description: string;
  url: string;
  image_url: string | null;
  tags: string; // JSON stringified array
  upvotes: number;
  comments: number;
  published_at: string | null;
  collected_at?: string;
  is_top_pick?: boolean;
}

export interface ArticleRow extends Article {
  id: number;
  collected_at: string;
  is_top_pick: boolean;
  full_content: string | null;
  ai_summary: string | null;
  bookmarked: boolean;
}

export interface FormattedArticle {
  id: number;
  title: string;
  source: string;
  time: string;
  tags: string[];
  upvotes: number;
  comments: number;
  desc: string;
  gradient: string;
  url: string;
  image?: string;
  delay: number;
  is_top_pick: boolean;
  has_content?: boolean;
  has_summary?: boolean;
  bookmarked?: boolean;
}
