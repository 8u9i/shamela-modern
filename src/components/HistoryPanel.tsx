import { useState, useEffect, useCallback } from 'react';
import { Tooltip } from '@base-ui/react/tooltip';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { History, Trash2, X } from 'lucide-react';
import type { HistoryEntry, Book } from '../types';

interface HistoryPanelProps {
  onOpenBook: (book: Book) => void;
}

export function HistoryPanel({ onOpenBook }: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const items = await window.api.getHistory({ limit: 50 });
      setHistory(items);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleOpenBook = useCallback(async (entry: HistoryEntry) => {
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

  const handleDeleteItem = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await window.api.deleteHistoryItem(id);
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const handleClearAll = useCallback(async () => {
    await window.api.clearHistory();
    setHistory([]);
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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <History className="w-3.5 h-3.5 text-primary" />
          تاريخ التصفح
        </h2>
        {history.length > 0 && (
          <Tooltip.Root>
            <Tooltip.Trigger render={<span />}>
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-danger hover:text-danger transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                مسح الكل
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Positioner>
                <Tooltip.Popup className="bg-card text-foreground text-xs px-2 py-1 rounded-lg border border-border shadow-lg">
                  حذف كل سجل التصفح
                </Tooltip.Popup>
              </Tooltip.Positioner>
            </Tooltip.Portal>
          </Tooltip.Root>
        )}
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
              <div className="mb-2 opacity-50">
                <History className="w-8 h-8 mx-auto" />
              </div>
              <div>لا يوجد سجل تصفح بعد</div>
              <div className="text-xs mt-1">سيتم تسجيل الكتب التي تفتحها هنا</div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {history.map((entry) => (
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
                      {new Date(entry.visited_at + 'Z').toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteItem(entry.id, e)}
                    aria-label="حذف من السجل"
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
