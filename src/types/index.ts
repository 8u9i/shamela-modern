export interface Author {
  id: number;
  name: string | null;
  long_name: string | null;
  death_year: string | null;
  description: string | null;
  shamela_id: number | null;
}

export interface Category {
  id: number;
  name: string | null;
  parent_id: number | null;
  level: number;
  order_num: number;
  shamela_id: number | null;
}

export interface Book {
  id: number;
  title: string;
  author_id: number | null;
  author_name: string | null;
  category_id: number | null;
  category_name: string | null;
  description: string | null;
  download_url: string | null;
  shamela_id: number | null;
  author_shamela_id: number | null;
  pdf_path: string | null;
  has_content: number;
}

export interface BookContent {
  id: number;
  book_id: number;
  page: number;
  part: number;
  content: string;
}

export interface BookTocItem {
  id: number;
  book_id: number;
  title: string | null;
  level: number;
  page: number;
}

export interface SearchResult extends Book {
  snippet?: string;
}

export interface ContentSearchResult extends BookContent {
  book_title: string;
}

export interface DbStats {
  books: number;
  authors: number;
  categories: number;
  withContent: number;
}

export type ViewMode = 'home' | 'books' | 'authors' | 'reader' | 'author' | 'search' | 'pdf' | 'update' | 'services';

export type LeftPanelTab = 'categories' | 'books' | 'search';

export interface UpdateCheckResult {
  total: number;
  local: number;
  newCount: number;
  updateCount: number;
  newBooks: any[];
  updatedBooks: any[];
  error?: string;
}

export interface UpdateProgress {
  msg: string;
  current: number;
  total: number;
}

export interface HistoryEntry {
  id: number;
  book_id: number;
  book_title: string;
  author_name: string | null;
  page: number;
  visited_at: string;
}

export interface BookmarkEntry {
  id: number;
  book_id: number;
  book_title: string;
  author_name: string | null;
  page: number;
  title: string | null;
  created_at: string;
}

export interface DuplicateAuthorGroup {
  name: string;
  count: number;
  members: {
    id: number;
    shamela_id: number | null;
    book_count: number;
    books: string[];
    is_primary: boolean;
  }[];
}

export interface NoteEntry {
  id: number;
  book_id: number;
  book_title: string;
  page: number;
  content: string;
  created_at: string;
}
