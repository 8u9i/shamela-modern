import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@base-ui/react/scroll-area';
import type { BookmarkEntry, Book } from '../types';

interface BookmarksPanelProps {
  onOpenBook: (book: Book) => void;
}

export function BookmarksPanel({ onOpenBook }: BookmarksPanelProps) {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    try {
      const items = await window.api.getBookmarks({ limit: 100 });
      setBookmarks(items);
    } catch (e) {
      console.error('Failed to load bookmarks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const handleOpenBook = useCallback(async (entry: BookmarkEntry) => {
    const book: Book = {
      id: entry.book_id,
      title: entry.book_title,
      author_name: entry.author_name,
      author_id: null,
      category_id: null,
      category_name: null,
      description: null,
      download_url: null,
      shamela_id: null,
      author_shamela_id: null,
      pdf_path: null,
      has_content: 1,
    };
    onOpenBook(book);
  }, [onOpenBook]);

  const handleDelete = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.api.deleteBookmark(id);
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">العلامات المرجعية</h2>
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-sm px-4 text-center">
              <div className="mb-2 opacity-50">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <div>لا توجد علامات مرجعية</div>
              <div className="text-xs mt-1">يمكنك إضافة علامة أثناء قراءة كتاب</div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/50">
              {bookmarks.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleOpenBook(entry)}
                  className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-[var(--bg-border)]/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--text-primary)] truncate leading-tight">
                      {entry.book_title}
                    </div>
                    {entry.author_name && (
                      <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                        {entry.author_name}
                      </div>
                    )}
                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                      {new Date(entry.created_at + 'Z').toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="text-[var(--text-muted)] hover:text-[var(--danger)] opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0 mt-0.5"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-1.5 bg-[var(--bg-surface)] rounded-full">
          <ScrollArea.Thumb className="flex-1 bg-[var(--text-muted)] rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
