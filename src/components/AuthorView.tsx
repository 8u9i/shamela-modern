import { useState, useEffect } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Author, Book } from '../types';

interface AuthorViewProps {
  author: Author;
  onOpenBook: (book: Book) => void;
  onBack: () => void;
}

export function AuthorView({ author, onOpenBook, onBack }: AuthorViewProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBooks();
  }, [author.id]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const result = await window.api.getAuthorBooks(author.id);
      setBooks(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto fade-in">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          <span className="text-sm">رجوع</span>
        </button>

        <div className="flex items-start gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-primary-foreground font-bold text-2xl font-arabic shrink-0">
            {(author.name || '?').charAt(0)}
          </div>
          <div>
            <h1 className="font-arabic text-3xl text-foreground font-bold leading-relaxed">
              {author.name || 'بدون اسم'}
            </h1>
            {author.long_name && (
              <p className="font-arabic text-secondary-foreground text-base mt-1">
                {author.long_name}
              </p>
            )}
            <div className="flex gap-4 mt-2">
              {author.death_year && (
                <span className="text-muted-foreground text-sm">
                  توفي: {author.death_year}
                </span>
              )}
              <span className="text-muted-foreground text-sm">
                {books.length.toLocaleString('ar')} كتاب
              </span>
            </div>
            {author.description && (
              <p className="text-secondary-foreground text-sm mt-3 leading-relaxed max-w-2xl">
                {author.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <h2 className="flex items-center gap-2 text-secondary-foreground text-sm font-medium mb-4">
        <BookOpen className="w-4 h-4 text-primary" />
        كتب المؤلف
      </h2>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-border rounded w-3/4 mb-2" />
              <div className="h-3 bg-border rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">لا توجد كتب لهذا المؤلف</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {books.map((book) => (
            <button
              key={book.id}
              onClick={() => onOpenBook(book)}
              className="book-card bg-card border border-border rounded-xl p-4 text-start hover:border-primary/50 hover:shadow-md transition-all"
            >
              <h3 className="font-arabic text-foreground text-sm font-medium line-clamp-2 leading-relaxed">
                {book.title}
              </h3>
              {book.category_name && (
                <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 rounded-full text-primary text-xs">
                  {book.category_name}
                </span>
              )}
              {book.has_content ? (
                <span className="inline-block ms-1 px-2 py-0.5 bg-success/10 rounded-full text-success text-xs">
                  نص
                </span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
