import { useState, useEffect, useCallback } from 'react';
import { Search, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Book } from '../types';

interface AuthorEntry {
  id: number;
  name: string | null;
  long_name: string | null;
  death_year: string | null;
  description: string | null;
  book_count: number;
}

interface AuthorsViewProps {
  onOpenAuthor: (authorId: number) => void;
  onOpenBook: (book: Book) => void;
}

export function AuthorsView({ onOpenAuthor }: AuthorsViewProps) {
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const limit = 30;

  useEffect(() => {
    setPage(0);
    loadAuthors(0);
  }, [search]);

  useEffect(() => {
    loadAuthors(page);
  }, [page]);

  const loadAuthors = async (p: number) => {
    setLoading(true);
    try {
      const result = await window.api.getAuthors({ page: p, limit, search });
      setAuthors(result.authors);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  }, [searchInput]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-arabic text-base font-bold text-foreground">المؤلفون</h2>
          </div>
          <div className="text-muted-foreground text-xs tabular-nums">
            {total.toLocaleString('ar')} مؤلف
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="بحث عن مؤلف..."
              className="w-full bg-background border border-border text-foreground text-sm ps-9 pe-3 py-2 rounded-lg outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            بحث
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse px-4 py-3">
                <div className="h-4 bg-border rounded w-3/4 mb-2" />
                <div className="h-3 bg-border rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 text-sm">
            {search ? 'لا توجد نتائج' : 'لا يوجد مؤلفون'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {authors.map((author) => (
              <button
                key={author.id}
                onClick={() => onOpenAuthor(author.id)}
                className="w-full text-start px-5 py-4 hover:bg-muted transition-colors group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-arabic text-foreground text-sm font-medium leading-relaxed group-hover:text-primary transition-colors">
                      {author.name || 'بدون اسم'}
                    </div>
                    {author.death_year && (
                      <div className="text-muted-foreground text-xs mt-0.5">
                        توفي {author.death_year}
                      </div>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                    {author.book_count.toLocaleString('ar')} كتاب
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-border bg-card flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-background border border-border text-muted-foreground text-xs disabled:opacity-40 hover:text-foreground hover:border-primary/50 transition-all"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            السابق
          </button>
          <span className="text-muted-foreground text-xs tabular-nums">
            صفحة {(page + 1).toLocaleString('ar')} من {totalPages.toLocaleString('ar')}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-background border border-border text-muted-foreground text-xs disabled:opacity-40 hover:text-foreground hover:border-primary/50 transition-all"
          >
            التالي
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
