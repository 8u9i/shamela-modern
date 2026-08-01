import { useState, useEffect } from 'react';
import { BookOpen, Users, Library } from 'lucide-react';
import { Book, DbStats } from '../types';

// The catalog is static within a session: cache the random selection so
// navigating back to Home doesn't re-query + re-sort the books table each time.
let recentCache: Book[] | null = null;

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
      if (recentCache) {
        setRecentBooks(recentCache);
        setLoading(false);
        return;
      }
      const books = await window.api.getRecentBooks();
      recentCache = books;
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
      <div className="text-center mb-12 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
          <Library className="w-3.5 h-3.5" />
          المكتبة الشاملة الإباضية
        </div>
        <h1 className="font-arabic text-3xl font-bold text-foreground mb-3 leading-relaxed">
          مكتبة التراث الإباضي
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
          مكتبة شاملة للتراث الإباضي تحتوي على آلاف الكتب والمراجع في العلوم الإسلامية
        </p>

        {stats && (
          <div className="flex justify-center gap-8 mt-8">
            <div className="stat-block">
              <div className="stat-value">{stats.books.toLocaleString('ar')}</div>
              <div className="stat-label">كتاب</div>
            </div>
            <div className="w-px bg-border" />
            <div className="stat-block">
              <div className="stat-value">{stats.authors.toLocaleString('ar')}</div>
              <div className="stat-label">مؤلف</div>
            </div>
            <div className="w-px bg-border" />
            <div className="stat-block">
              <div className="stat-value">{stats.withContent.toLocaleString('ar')}</div>
              <div className="stat-label">بالنص</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-10">
        <button
          onClick={onBrowseBooks}
          className="pixel-card bg-card p-6 text-center group hover:border-primary/50 hover:shadow-md transition-all"
        >
          <BookOpen className="w-7 h-7 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-muted-foreground text-sm group-hover:text-foreground">تصفح الكتب</span>
        </button>
        <button
          onClick={onBrowseAuthors}
          className="pixel-card bg-card p-6 text-center group hover:border-primary/50 hover:shadow-md transition-all"
        >
          <Users className="w-7 h-7 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-muted-foreground text-sm group-hover:text-foreground">المؤلفون</span>
        </button>
      </div>

      {/* Recent Books */}
      <div>
        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium mb-4 px-2">
          <BookOpen className="w-4 h-4 text-primary/70" />
          كتب عشوائية
        </div>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-border rounded w-3/4 mb-2" />
                <div className="h-3 bg-border rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : recentBooks.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-14 text-center text-muted-foreground text-sm">
            لا توجد كتب متاحة بعد
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recentBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => onOpenBook(book)}
                className="book-card bg-card border border-border rounded-xl p-4 text-start hover:border-primary/60 hover:shadow-md transition-all"
              >
                <h3 className="font-arabic text-foreground text-sm font-medium mb-2 line-clamp-2 leading-relaxed">
                  {book.title}
                </h3>
                <p className="text-muted-foreground text-xs truncate">
                  {book.author_name}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {book.category_name && (
                    <span className="px-2 py-0.5 bg-primary/10 rounded-full text-primary text-xs">
                      {book.category_name}
                    </span>
                  )}
                  {book.has_content ? (
                    <span className="px-2 py-0.5 bg-success/10 rounded-full text-success text-xs">
                      نص
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-warning/10 rounded-full text-warning text-xs">
                      PDF
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
