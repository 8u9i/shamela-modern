import { useState, useEffect } from 'react';
import { Book } from '../types';

interface BookListProps {
  categoryId: number | null;
  onOpenBook: (book: Book) => void;
  onOpenAuthor: (authorId: number) => void;
  compact?: boolean;
}

export function BookList({ categoryId, onOpenBook, onOpenAuthor, compact }: BookListProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const limit = compact ? 100 : 30;

  useEffect(() => {
    setPage(0);
    loadBooks(0);
  }, [categoryId]);

  const loadBooks = async (p: number) => {
    setLoading(true);
    try {
      const result = await window.api.getBooks({ categoryId, page: p, limit });
      setBooks(result.books);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    loadBooks(p);
  };

  const totalPages = Math.ceil(total / limit);

  if (compact) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-card">
          <div className="text-muted-foreground text-xs">
            {total.toLocaleString('ar')} كتاب
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-1 p-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse px-3 py-2">
                  <div className="h-3 bg-border rounded w-3/4 mb-1" />
                  <div className="h-2 bg-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {books.map((book) => (
                <button
                  key={book.id}
                  onClick={() => onOpenBook(book)}
                  className="w-full text-start px-3 py-2 hover:bg-muted transition-colors"
                >
                  <div className="font-arabic text-foreground text-sm line-clamp-1 leading-relaxed">
                    {book.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted-foreground text-[11px] truncate">
                      {book.author_name || 'بدون مؤلف'}
                    </span>
                    {book.has_content ? (
                      <span className="text-success text-[10px]">●</span>
                    ) : (
                      <span className="text-warning text-[10px]">●</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-card text-xs">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 0}
              className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
              aria-label="الصفحة السابقة"
            >
              →
            </button>
            <span className="text-muted-foreground tabular-nums">
              {(page + 1).toLocaleString('ar')}/{(totalPages).toLocaleString('ar')}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages - 1}
              className="text-muted-foreground disabled:opacity-30 hover:text-foreground"
              aria-label="الصفحة التالية"
            >
              ←
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 overflow-y-auto fade-in">
      <div className="mb-6">
        <h1 className="font-arabic text-2xl text-foreground font-bold">
          {categoryId ? 'كتب القسم' : 'جميع الكتب'}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {total.toLocaleString('ar')} كتاب
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-border rounded w-3/4 mb-2" />
              <div className="h-3 bg-border rounded w-1/2 mb-2" />
              <div className="h-3 bg-border rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {books.map((book) => (
              <div
                key={book.id}
                className="book-card bg-card border border-border rounded-xl p-4 text-start hover:border-primary/50 hover:shadow-md transition-all"
              >
                <button
                  onClick={() => onOpenBook(book)}
                  className="w-full text-start font-arabic text-foreground text-sm font-medium mb-2 line-clamp-2 leading-relaxed hover:text-primary transition-colors"
                >
                  {book.title}
                </button>
                {book.author_id && (
                  <button
                    onClick={() => onOpenAuthor(book.author_id)}
                    className="text-muted-foreground text-xs hover:text-primary transition-colors truncate block w-full text-start"
                  >
                    {book.author_name || 'بدون مؤلف'}
                  </button>
                )}
                {!book.author_id && (
                  <p className="text-muted-foreground text-xs truncate">
                    {book.author_name || 'بدون مؤلف'}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
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
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground disabled:opacity-50 hover:border-primary/50 hover:text-foreground transition-all"
              >
                السابق
              </button>
              <span className="text-muted-foreground text-sm px-4 tabular-nums">
                صفحة {(page + 1).toLocaleString('ar')} من {totalPages.toLocaleString('ar')}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages - 1}
                className="px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground disabled:opacity-50 hover:border-primary/50 hover:text-foreground transition-all"
              >
                التالي
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
