import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@base-ui/react/scroll-area';
import { StickyNote, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { NoteEntry, Book } from '../types';

interface NotesPanelProps {
  onOpenBook: (book: Book) => void;
}

export function NotesPanel({ onOpenBook }: NotesPanelProps) {
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(async () => {
    try {
      if (!window.api.getNotes) {
        console.warn('getNotes IPC not available — restart the app');
        setLoading(false);
        return;
      }
      const items = await window.api.getNotes({ limit: 100 });
      setNotes(items);
    } catch (e) {
      console.error('Failed to load notes:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleOpenBook = useCallback(async (entry: NoteEntry) => {
    const book: Book = {
      id: entry.book_id,
      title: entry.book_title,
      author_name: null,
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
    await window.api.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    if (expandedId === id) setExpandedId(null);
  }, [expandedId]);

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
          <StickyNote className="w-3.5 h-3.5 text-primary" />
          الملاحظات
        </h2>
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm px-4 text-center">
              <div className="mb-2 opacity-50">
                <StickyNote className="w-8 h-8 mx-auto" />
              </div>
              <div>لا توجد ملاحظات</div>
              <div className="text-xs mt-1">حدد نصاً في كتاب واحفظه كملاحظة</div>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notes.map((entry) => (
                <div key={entry.id} className="group">
                  <div
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedId(expandedId === entry.id ? null : entry.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="px-3 py-2.5 cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate leading-relaxed">
                          {entry.book_title}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                          {new Date(entry.created_at + 'Z').toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {expandedId === entry.id ? (
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <button
                          onClick={(e) => handleDelete(entry.id, e)}
                          aria-label="حذف الملاحظة"
                          className="text-muted-foreground hover:text-danger opacity-0 group-hover:opacity-100 transition-all text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {expandedId === entry.id && (
                      <div className="mt-2 text-xs text-secondary-foreground leading-relaxed whitespace-pre-wrap border-t border-border/50 pt-2 max-h-40 overflow-y-auto">
                        {entry.content}
                      </div>
                    )}
                  </div>
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
