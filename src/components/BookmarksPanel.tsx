import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { Bookmark, X } from 'lucide-react';
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
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Bookmark className="w-3.5 h-3.5 text-primary" />
          العلامات المرجعية
        </h2>
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
              <div className="mb-2 opacity-50">
                <Bookmark className="w-8 h-8 mx-auto" />
              </div>
              <div>لا توجد علامات مرجعية</div>
              <div className="text-xs mt-1">يمكنك إضافة علامة أثناء قراءة كتاب</div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {bookmarks.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleOpenBook(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenBook(entry);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate leading-relaxed">
                      {entry.book_title}
                    </div>
                    {entry.author_name && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {entry.author_name}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                      {new Date(entry.created_at + 'Z').toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
                    aria-label="حذف العلامة المرجعية"
                    className="text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 transition-all text-xs shrink-0 mt-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar className="flex w-1.5 bg-muted rounded-full">
          <ScrollArea.Thumb className="flex-1 bg-muted-foreground/30 rounded-full" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
    </div>
  );
}
