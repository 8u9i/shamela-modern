import { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@base-ui/react/scroll-area';
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
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <h2 className="text-sm font-medium text-[var(--text-primary)]">الملاحظات</h2>
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full">
          {notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)] text-sm px-4 text-center">
              <div className="mb-2 opacity-50">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>لا توجد ملاحظات</div>
              <div className="text-xs mt-1">حدد نصاً في كتاب واحفظه كملاحظة</div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]/50">
              {notes.map((entry) => (
                <div key={entry.id} className="group">
                  <div
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    className="px-3 py-2.5 cursor-pointer hover:bg-[var(--bg-border)]/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[var(--text-primary)] truncate leading-tight">
                          {entry.book_title}
                        </div>
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
                    {expandedId === entry.id && (
                      <div className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap border-t border-[var(--border)]/50 pt-2 max-h-40 overflow-y-auto">
                        {entry.content}
                      </div>
                    )}
                  </div>
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
