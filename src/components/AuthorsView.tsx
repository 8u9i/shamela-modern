import { useState, useEffect, useCallback } from 'react';
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

export function AuthorsView({ onOpenAuthor, onOpenBook }: AuthorsViewProps) {
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
      {/* Header */}
      <div className="px-5 py-3 border-b-2 border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between mb-2">
          <div className="font-pixel text-[var(--accent)] text-[10px]" style={{ lineHeight: 2 }}>
            المؤلفون
          </div>
          <div className="text-[var(--text-muted)] text-[10px] font-pixel">
            {total.toLocaleString('ar')} مؤلف
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="بحث عن مؤلف..."
            className="flex-1 bg-[var(--bg-card)] border-2 border-[var(--bg-border)] text-[var(--text-primary)] text-sm px-3 py-1.5 outline-none focus:border-[var(--accent)] transition-colors"
            style={{ borderRadius: 0 }}
          />
          <button
            type="submit"
            className="pixel-btn text-xs px-3 py-1.5"
          >
            بحث
          </button>
        </form>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse px-4 py-3">
                <div className="h-4 bg-[var(--bg-border)] w-3/4 mb-2" />
                <div className="h-3 bg-[var(--bg-border)] w-1/3" />
              </div>
            ))}
          </div>
        ) : authors.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] py-16 text-sm font-pixel">
            {search ? 'لا توجد نتائج' : 'لا يوجد مؤلفون'}
          </div>
        ) : (
          <div className="divide-y-2 divide-[var(--bg-border)]">
            {authors.map((author) => (
              <button
                key={author.id}
                onClick={() => onOpenAuthor(author.id)}
                className="w-full text-start px-5 py-4 hover:bg-[var(--bg-surface)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[var(--text-primary)] text-sm font-medium leading-relaxed group-hover:text-[var(--accent)] transition-colors">
                      {author.name || 'بدون اسم'}
                    </div>
                    {author.death_year && (
                      <div className="text-[var(--text-muted)] text-[11px] mt-0.5">
                        توفي {author.death_year}
                      </div>
                    )}
                  </div>
                  <div className="text-[var(--text-muted)] text-[10px] font-pixel whitespace-nowrap mr-3">
                    {author.book_count.toLocaleString('ar')} كتاب
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-2 border-t-2 border-[var(--border)] bg-[var(--bg-surface)] flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="pixel-btn text-xs px-3 py-1 disabled:opacity-40"
          >
            السابق
          </button>
          <span className="text-[var(--text-muted)] text-[10px] font-pixel">
            صفحة {page + 1} من {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="pixel-btn text-xs px-3 py-1 disabled:opacity-40"
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
