import { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ViewMode, Book, Category, Author, DbStats } from './types';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { BookList } from './components/BookList';
import { BookReader } from './components/BookReader';
import { AuthorView } from './components/AuthorView';
import { AuthorsView } from './components/AuthorsView';
import { SearchResults } from './components/SearchResults';
import { PdfViewer } from './components/PdfViewer';
import { ServicesView } from './components/ServicesView';
import { TipsDialog } from './components/TipsDialog';
import { UpdateView } from './components/UpdateView';
import { UpdateNotifier } from './components/UpdateNotifier';
import { StatusBar } from './components/StatusBar';

declare global {
  interface Window {
    api: {
      getStats: () => Promise<DbStats>;
      getCategories: () => Promise<Category[]>;
      getBooks: (opts: any) => Promise<{ books: Book[]; total: number }>;
      getBook: (id: number) => Promise<Book>;
      getBookContent: (opts: any) => Promise<{ content: any[]; totalPages: number; currentPage: number }>;
      getBookContentByPage: (opts: any) => Promise<{ content: any[]; totalPages: number; currentPage: number }>;
      getBookToc: (id: number) => Promise<any[]>;
      getAuthor: (id: number) => Promise<Author>;
      getAuthors: (opts: { page?: number; limit?: number; search?: string }) => Promise<{ authors: (Author & { book_count: number })[]; total: number }>;
      getAuthorBooks: (id: number) => Promise<Book[]>;
      search: (opts: any) => Promise<Book[]>;
      searchContent: (opts: any) => Promise<any[]>;
      getRecentBooks: () => Promise<Book[]>;
      getPdfPath: (relativePath: string) => Promise<string | null>;
      addHistory: (opts: { bookId: number; bookTitle: string; authorName?: string | null; page?: number }) => Promise<boolean | null>;
      getHistory: (opts?: { limit?: number }) => Promise<any[]>;
      clearHistory: () => Promise<boolean>;
      deleteHistoryItem: (id: number) => Promise<boolean>;
      addBookmark: (opts: { bookId: number; bookTitle: string; authorName?: string | null; page?: number; title?: string }) => Promise<boolean | null>;
      getBookmarks: (opts?: { limit?: number }) => Promise<any[]>;
      getBookmarksForBook: (bookId: number) => Promise<any[]>;
      deleteBookmark: (id: number) => Promise<boolean>;
      addNote: (opts: { bookId: number; bookTitle: string; page?: number; content: string }) => Promise<boolean | null>;
      getNotes: (opts?: { limit?: number }) => Promise<any[]>;
      deleteNote: (id: number) => Promise<boolean>;
      exportText: (opts: { content: string; defaultName?: string }) => Promise<boolean>;
      print: () => Promise<boolean>;
      checkUpdates: () => Promise<any>;
      startUpdate: (opts?: { bookIds?: number[] }) => Promise<any>;
      onUpdateProgress: (callback: (data: any) => void) => () => void;
      findDuplicateAuthors: () => Promise<import('./types').DuplicateAuthorGroup[]>;
      mergeDuplicateAuthors: (opts: { primaries: { primaryId: number; duplicateIds: number[] }[] }) => Promise<{ success: boolean; merged?: number; deleted?: number; error?: string }>;
      checkForAppUpdates: () => Promise<boolean>;
      downloadAppUpdate: () => Promise<boolean>;
      quitAndInstallApp: () => Promise<boolean>;
      getAppVersion: () => Promise<string>;
      getInstallDirectory: () => Promise<string>;
      onAppUpdateStatus: (callback: (data: import('./types').AppUpdateStatus) => void) => () => void;
      checkDbStatus: () => Promise<{ ready: boolean; reason?: string; totalBooks?: number; contentBooks?: number }>;
    };
  }
}

export default function App() {
  const [view, setView] = useState<ViewMode>('home');
  const [stats, setStats] = useState<DbStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [selectedAuthor, setSelectedAuthor] = useState<Author | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [splitPosition, setSplitPosition] = useState(320);
  const [pdfBook, setPdfBook] = useState<Book | null>(null);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [dbReady, setDbReady] = useState(false);
  const [showInitialUpdate, setShowInitialUpdate] = useState(true);
  const [dbError, setDbError] = useState('');
  const isDragging = useRef(false);
  const bookNavVersion = useRef(0);
  const splitCleanup = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (splitCleanup.current) splitCleanup.current();
    };
  }, []);

  useEffect(() => {
    if (!showInitialUpdate && dbReady) {
      initApp();
    }
  }, [showInitialUpdate, dbReady]);

  const initApp = async () => {
    try {
      const [s, cats] = await Promise.all([
        window.api.getStats(),
        window.api.getCategories(),
      ]);
      if (!s) {
        setDbError('قاعدة البيانات غير موجودة.');
      } else if (!s.books && !s.authors) {
        setDbError('قاعدة البيانات فارغة أو تالفة.');
      }
      setStats(s);
      setCategories(cats);
    } catch (e: any) {
      console.error('Failed to initialize:', e);
      setDbError(e?.message || 'فشل تحميل قاعدة البيانات');
    } finally {
      setLoading(false);
      if (!localStorage.getItem('hasSeenTips')) {
        setTipsOpen(true);
      }
    }
  };

  const handleUpdateComplete = useCallback(() => {
    setShowInitialUpdate(false);
    setDbReady(true);
    localStorage.setItem('updateDone', 'true');
  }, []);

  const handleSkipUpdate = useCallback(() => {
    setShowInitialUpdate(false);
    setDbReady(true);
  }, []);

  const handleOpenBook = useCallback(async (book: Book) => {
    const version = ++bookNavVersion.current;
    const fullBook = await window.api.getBook(book.id);
    if (version !== bookNavVersion.current) return;
    setSelectedBook(fullBook);
    setView('reader');
    window.api.addHistory({
      bookId: book.id,
      bookTitle: fullBook.title,
      authorName: fullBook.author_name,
      page: 0,
    }).catch(() => {});
  }, []);

  const handleOpenAuthor = useCallback(async (authorId: number) => {
    const author = await window.api.getAuthor(authorId);
    setSelectedAuthor(author);
    setView('author');
  }, []);

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setView('books');
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setView('search');
    }
  }, []);

  const handleOpenPdf = useCallback((book: Book) => {
    setPdfBook(book);
    setView('pdf');
  }, []);

  const handleBack = useCallback(() => {
    setView('home');
    setSelectedBook(null);
    setSelectedAuthor(null);
    setSelectedCategoryId(null);
    setSearchQuery('');
  }, []);

  const handleOpenAuthors = useCallback(() => {
    setView('authors');
  }, []);

  const handleOpenServices = useCallback(() => {
    setView('services');
  }, []);

  const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newPos = window.innerWidth - e.clientX;
      setSplitPosition(Math.max(250, Math.min(600, newPos)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const cleanup = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    splitCleanup.current = cleanup;
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  if (showInitialUpdate) {
    return <UpdateView onComplete={handleUpdateComplete} onSkip={handleSkipUpdate} />;
  }

  if (loading && !dbError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="pixel-card px-8 py-10 text-center" style={{ minWidth: 320 }}>
          <div className="font-arabic text-primary text-base font-bold mb-6 loading-pulse">
            المكتبة الشاملة
          </div>
          <div className="text-muted-foreground text-xs">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (dbError) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="pixel-card px-8 py-10 text-center" style={{ minWidth: 400, maxWidth: 500 }}>
          <div className="flex items-center justify-center gap-2 text-danger text-base font-medium mb-4">
            <AlertTriangle className="w-5 h-5" />
            خطأ
          </div>
          <div className="text-foreground text-sm mb-4">{dbError}</div>
          <div className="text-muted-foreground text-xs mb-3">
            شغّل التحديث لتحميل كتب المكتبة الشاملة من الموقع الرسمي
          </div>
          <button
            onClick={() => { setShowInitialUpdate(true); setDbError(''); }}
            className="px-6 py-3 bg-primary text-primary-foreground text-sm font-medium rounded-xl hover:bg-primary/90 transition-opacity"
          >
            بدء التحديث
          </button>
        </div>
      </div>
    );
  }

  const showRightPanelBooks = view === 'books' && selectedCategoryId !== null;
  const showRightPanelSearch = view === 'search' && searchQuery.trim() !== '';

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background" dir="rtl">
      <Header
        onSearch={handleSearch}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onBack={view !== 'home' ? handleBack : undefined}
        searchQuery={searchQuery}
      />

      <div className="flex-1 flex overflow-hidden mx-3 my-3 pixel-card">
        {sidebarOpen && (
          <div
            className="flex flex-col bg-popover overflow-hidden"
            style={{ width: splitPosition }}
          >
            <div className="flex-1 overflow-hidden">
              <Sidebar
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleCategorySelect}
                onOpenBook={handleOpenBook}
                onOpenServices={handleOpenServices}
                stats={stats}
              />
            </div>
          </div>
        )}

        {sidebarOpen && (
          <div
            className="w-1.5 bg-border hover:bg-primary active:bg-primary cursor-col-resize transition-colors"
            onMouseDown={handleSplitMouseDown}
          />
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {view === 'home' && (
            <HomeView
              stats={stats}
              onOpenBook={handleOpenBook}
              onBrowseBooks={() => { setSelectedCategoryId(null); setView('books'); }}
              onBrowseAuthors={handleOpenAuthors}
            />
          )}
          {showRightPanelBooks && (
            <BookList
              categoryId={selectedCategoryId}
              onOpenBook={handleOpenBook}
              onOpenAuthor={handleOpenAuthor}
            />
          )}
          {view === 'books' && selectedCategoryId === null && (
            <BookList
              categoryId={null}
              onOpenBook={handleOpenBook}
              onOpenAuthor={handleOpenAuthor}
            />
          )}
          {view === 'authors' && (
            <AuthorsView
              onOpenAuthor={handleOpenAuthor}
              onOpenBook={handleOpenBook}
            />
          )}
          {view === 'reader' && selectedBook && (
            <BookReader
              key={selectedBook.id}
              book={selectedBook}
              onBack={handleBack}
              onOpenAuthor={handleOpenAuthor}
              onOpenPdf={handleOpenPdf}
            />
          )}
          {view === 'pdf' && pdfBook && (
            <PdfViewer
              relativePath={pdfBook.pdf_path || ''}
              bookTitle={pdfBook.title}
              onBack={handleBack}
            />
          )}
          {view === 'author' && selectedAuthor && (
            <AuthorView
              author={selectedAuthor}
              onOpenBook={handleOpenBook}
              onBack={handleBack}
            />
          )}
          {showRightPanelSearch && (
            <SearchResults
              query={searchQuery}
              onOpenBook={handleOpenBook}
            />
          )}
          {view === 'services' && <ServicesView />}
        </div>
      </div>

      <TipsDialog open={tipsOpen} onClose={() => setTipsOpen(false)} />
      <UpdateNotifier />
      <StatusBar
        stats={stats}
        currentBook={selectedBook}
        view={view}
      />
    </div>
  );
}
