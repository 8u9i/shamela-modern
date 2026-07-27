import { useState, useEffect } from 'react';
import { Book, DbStats } from '../types';

interface HomeViewProps {
  stats: DbStats | null;
  onOpenBook: (book: Book) => void;
  onBrowseBooks: () => void;
  onBrowseAuthors: () => void;
}

export function HomeView({ stats, onOpenBook, onBrowseBooks, onBrowseAuthors }: HomeViewProps) {
  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecent();
  }, []);

  const loadRecent = async () => {
    try {
      const books = await window.api.getRecentBooks();
      setRecentBooks(books);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto fade-in">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="font-pixel text-[var(--accent)] text-xs mb-6" style={{ lineHeight: 2 }}>
          المكتبة الشاملة الإباضية
        </div>
        <p className="text-[var(--text-secondary)] text-sm max-w-2xl mx-auto leading-relaxed">
          مكتبة شاملة للتراث الإباضي تحتوي على آلاف الكتب والمراجع في العلوم الإسلامية
        </p>

        {stats && (
          <div className="flex justify-center gap-6 mt-6">
            <div className="stat-block">
              <div className="stat-value">{stats.books.toLocaleString('ar')}</div>
              <div className="stat-label">كتاب</div>
            </div>
            <div className="w-px bg-[var(--bg-border)]" />
            <div className="stat-block">
              <div className="stat-value">{stats.authors.toLocaleString('ar')}</div>
              <div className="stat-label">مؤلف</div>
            </div>
            <div className="w-px bg-[var(--bg-border)]" />
            <div className="stat-block">
              <div className="stat-value">{stats.withContent.toLocaleString('ar')}</div>
              <div className="stat-label">بالنص</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4 mb-10 max-w-3xl mx-auto">
        <button
          onClick={onBrowseBooks}
          className="pixel-btn-gold bg-[var(--bg-surface)] p-5 text-center group"
        >
          <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[var(--text-secondary)] text-xs group-hover:text-[var(--text-primary)]">بحث سريع</span>
        </button>
        <button
          onClick={onBrowseBooks}
          className="pixel-btn-gold bg-[var(--bg-surface)] p-5 text-center group"
        >
          <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <span className="text-[var(--text-secondary)] text-xs group-hover:text-[var(--text-primary)]">تصفح الكتب</span>
        </button>
        <button
          onClick={onBrowseAuthors}
          className="pixel-btn-gold bg-[var(--bg-surface)] p-5 text-center group"
        >
          <svg className="w-8 h-8 mx-auto mb-2 text-[var(--accent)] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-[var(--text-secondary)] text-xs group-hover:text-[var(--text-primary)]">المؤلفون</span>
        </button>
      </div>

      {/* Recent Books */}
      <div>
        <div className="font-pixel text-[var(--text-muted)] text-[10px] mb-4 px-2" style={{ lineHeight: 2 }}>كتب عشوائية</div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[var(--bg-surface)] rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-[var(--bg-border)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[var(--bg-border)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => onOpenBook(book)}
                className="book-card bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-4 text-right hover:border-[var(--accent)] transition-all"
              >
                <h3 className="font-arabic text-[var(--text-primary)] text-sm font-medium mb-2 line-clamp-2 leading-relaxed">
                  {book.title}
                </h3>
                <p className="text-[var(--text-muted)] text-xs truncate">
                  {book.author_name}
                </p>
                {book.category_name && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-[var(--bg-card)] rounded text-[var(--accent)] text-xs">
                    {book.category_name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
