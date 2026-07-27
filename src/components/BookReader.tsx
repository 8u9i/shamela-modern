import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Book } from '../types';

interface BookReaderProps {
  book: Book;
  onBack: () => void;
  onOpenAuthor: (authorId: number) => void;
  onOpenPdf?: (book: Book) => void;
}

function highlightText(text: string, query: string): (string | { text: string; isMatch: boolean })[] {
  if (!query.trim()) return [{ text, isMatch: false }];
  const parts: (string | { text: string; isMatch: boolean })[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery, lastIndex);
  while (index !== -1) {
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), isMatch: false });
    }
    parts.push({ text: text.slice(index, index + query.length), isMatch: true });
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false });
  }
  if (parts.length === 0) parts.push({ text, isMatch: false });
  return parts;
}

export function BookReader({ book, onBack, onOpenAuthor, onOpenPdf }: BookReaderProps) {
  const [content, setContent] = useState<any[]>([]);
  const [toc, setToc] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookPages, setTotalBookPages] = useState(0);
  const [fontSize, setFontSize] = useState(1.35);
  const [showToc, setShowToc] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<(HTMLElement | null)[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [matchIndex, setMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [bookmarked, setBookmarked] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionPos, setSelectionPos] = useState<{ top: number; left: number } | null>(null);
  const [noteSaved, setNoteSaved] = useState(false);

  const [bookSearchOpen, setBookSearchOpen] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<any[]>([]);
  const [bookSearchLoading, setBookSearchLoading] = useState(false);
  const bookSearchRef = useRef<HTMLInputElement>(null);

  const [showInfo, setShowInfo] = useState(false);
  const [readerTheme, setReaderTheme] = useState(() => localStorage.getItem('readerTheme') || 'sepia');

  const themes: { key: string; label: string }[] = [
    { key: 'dark', label: 'داكن' },
    { key: 'light', label: 'فاتح' },
    { key: 'sepia', label: 'بني' },
    { key: 'green', label: 'أخضر' },
  ];

  const handleThemeChange = (theme: string) => {
    setReaderTheme(theme);
    localStorage.setItem('readerTheme', theme);
  };

  const loadPage = useCallback(async (bookPage: number) => {
    setLoading(true);
    setSearchQuery('');
    setMatchIndex(0);
    try {
      const result = await window.api.getBookContent({ bookId: book.id, page: bookPage });
      setContent(result.content);
      setTotalBookPages(result.totalPages);
      setCurrentPage(result.currentPage);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [book.id]);

  const loadPageByNumber = useCallback(async (bookPage: number) => {
    setLoading(true);
    setSearchQuery('');
    setMatchIndex(0);
    try {
      const result = await window.api.getBookContentByPage({ bookId: book.id, shamelaPage: bookPage });
      setContent(result.content);
      setTotalBookPages(result.totalPages);
      setCurrentPage(result.currentPage);
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [book.id]);

  const loadToc = useCallback(async () => {
    try {
      const items = await window.api.getBookToc(book.id);
      setToc(items);
    } catch (e) {
      console.error(e);
    }
  }, [book.id]);

  useEffect(() => {
    loadPage(1);
    loadToc();
    checkBookmark();
  }, [book.id]);

  useEffect(() => {
    matchRefs.current = [];
  }, [content]);

  const checkBookmark = async () => {
    try {
      const marks = await window.api.getBookmarksForBook(book.id);
      setBookmarked(marks.length > 0);
    } catch {
      setBookmarked(false);
    }
  };

  const toggleBookmark = async () => {
    try {
      if (bookmarked) {
        const marks = await window.api.getBookmarksForBook(book.id);
        if (marks.length > 0) {
          await window.api.deleteBookmark(marks[0].id);
        }
        setBookmarked(false);
      } else {
        await window.api.addBookmark({
          bookId: book.id,
          bookTitle: book.title,
          authorName: book.author_name,
          page: currentPage,
        });
        setBookmarked(true);
      }
    } catch (e) {
      console.error('Failed to toggle bookmark:', e);
    }
  };

  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setSelectedText('');
      setSelectionPos(null);
      return;
    }
    const text = sel.toString().trim();
    if (text.length > 1000) {
      setSelectedText(text.slice(0, 1000) + '...');
    } else {
      setSelectedText(text);
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const container = contentRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      setSelectionPos({
        top: rect.bottom - containerRect.top + 8,
        left: rect.left + rect.width / 2 - containerRect.left,
      });
    }
    setNoteSaved(false);
  }, []);

  const handleSaveSelection = useCallback(async () => {
    if (!selectedText) return;
    try {
      await window.api.addNote({
        bookId: book.id,
        bookTitle: book.title,
        page: currentPage,
        content: selectedText,
      });
      setNoteSaved(true);
      setSelectedText('');
      setSelectionPos(null);
    } catch (e) {
      console.error('Failed to save note:', e);
    }
  }, [selectedText, book.id, book.title, currentPage]);

  const handleBookSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setBookSearchResults([]);
      return;
    }
    setBookSearchLoading(true);
    try {
      const results = await window.api.searchContent({ query, bookId: book.id, limit: 100 });
      setBookSearchResults(results);
    } catch (e) {
      console.error('Book search failed:', e);
    } finally {
      setBookSearchLoading(false);
    }
  }, [book.id]);

  const navigateToSearchResult = useCallback(async (item: any) => {
    await loadPageByNumber(item.page || 1);
    setBookSearchOpen(false);
    setBookSearchQuery('');
    setBookSearchResults([]);
  }, [loadPageByNumber]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(prev => {
          if (!prev) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
            setSearchQuery('');
            setMatchIndex(0);
          }
          return !prev;
        });
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
        setMatchIndex(0);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    let count = 0;
    for (const c of content) {
      const lower = c.content.toLowerCase();
      const q = searchQuery.toLowerCase();
      let idx = lower.indexOf(q);
      while (idx !== -1) {
        count++;
        idx = lower.indexOf(q, idx + 1);
      }
    }
    return count;
  }, [content, searchQuery]);

  const handleSearchNext = useCallback(() => {
    if (matchCount === 0) return;
    const nextIndex = (matchIndex + 1) % matchCount;
    setMatchIndex(nextIndex);
    const el = matchRefs.current[nextIndex];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchCount, matchIndex]);

  const handleSearchPrev = useCallback(() => {
    if (matchCount === 0) return;
    const prevIndex = (matchIndex - 1 + matchCount) % matchCount;
    setMatchIndex(prevIndex);
    const el = matchRefs.current[prevIndex];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [matchCount, matchIndex]);

  const highlightedContent = useMemo(() => {
    if (!searchQuery.trim()) return content;
    return content.map((c, ci) => {
      const parts = highlightText(c.content, searchQuery);
      const matchStarts = parts.filter(p => typeof p !== 'string' && p.isMatch).length;
      let globalMatchIdx = 0;
      for (let i = 0; i < ci; i++) {
        const lower = content[i].content.toLowerCase();
        const q = searchQuery.toLowerCase();
        let idx = lower.indexOf(q);
        while (idx !== -1) {
          globalMatchIdx++;
          idx = lower.indexOf(q, idx + 1);
        }
      }
      return { ...c, _parts: parts, _matchOffset: globalMatchIdx };
    });
  }, [content, searchQuery]);

  return (
    <div className="flex h-full">
      {showToc && toc.length > 0 && (
        <div className="w-64 bg-[var(--bg-surface)] border-e border-[var(--border)] flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
            <h3 className="text-[var(--text-secondary)] text-xs font-medium">فهرس الكتاب</h3>
            <button
              onClick={() => setShowToc(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {toc.map((item) => (
              <button
                key={item.id}
                onClick={() => loadPageByNumber(item.page || 1)}
                className={`w-full text-start px-3 py-1.5 text-sm transition-colors hover:bg-[var(--bg-border)] ${
                  item.level === 1
                    ? 'text-[var(--text-primary)] font-medium'
                    : item.level === 2
                    ? 'text-[var(--text-secondary)] ps-6'
                    : 'text-[var(--text-muted)] text-xs ps-10'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        <div className="px-4 py-1.5 bg-[var(--bg-surface)] border-b-2 border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-1 pixel-btn text-[var(--text-secondary)] shrink-0"
            >
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="font-arabic text-sm text-[var(--text-primary)] font-medium leading-relaxed truncate">
                {book.title}
              </h1>
              {book.author_name && (
                <button
                  onClick={() => book.author_id && onOpenAuthor(book.author_id)}
                  className="text-[var(--text-muted)] text-[11px] hover:text-[var(--accent)] transition-colors"
                >
                  {book.author_name}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            {toc.length > 0 && (
              <button
                onClick={() => setShowToc(!showToc)}
                className={`px-2.5 py-1.5 text-xs pixel-btn ${
                   showToc ? 'bg-[var(--accent)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
                }`}
              >
                فهرس
              </button>
            )}

            <div className="w-px h-5 bg-[var(--bg-border)] mx-1" />

            <button
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className={`px-2.5 py-1.5 text-xs pixel-btn ${
                 searchOpen ? 'bg-[var(--accent)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              بحث في الصفحة
            </button>

            <button
              onClick={() => {
                setBookSearchOpen(!bookSearchOpen);
                if (!bookSearchOpen) {
                  setTimeout(() => bookSearchRef.current?.focus(), 50);
                } else {
                  setBookSearchQuery('');
                  setBookSearchResults([]);
                }
              }}
              className={`px-2.5 py-1.5 text-xs pixel-btn ${
                 bookSearchOpen ? 'bg-[var(--accent)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              بحث في الكتاب
            </button>

            <div className="w-px h-5 bg-[var(--bg-border)] mx-1" />

            <button
              onClick={toggleBookmark}
              className={`px-2.5 py-1.5 text-xs pixel-btn flex items-center gap-1 ${
                 bookmarked ? 'bg-[var(--accent)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              <svg className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              علامة
            </button>

            <button
              onClick={() => setShowInfo(!showInfo)}
              className={`px-2.5 py-1.5 text-xs pixel-btn ${
                 showInfo ? 'bg-[var(--accent)] text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]'
              }`}
            >
              معلومات
            </button>

            {book.pdf_path && onOpenPdf && (
              <button
                onClick={() => onOpenPdf(book)}
                className="px-2.5 py-1.5 text-xs pixel-btn text-[var(--text-secondary)]"
              >
                PDF
              </button>
            )}

            <div className="w-px h-5 bg-[var(--bg-border)] mx-1" />

            {content.length > 0 && (
              <>
                <button
                  onClick={async () => {
                    const text = content.map((c: any) => c.content).join('\n\n');
                    await window.api.exportText({
                      content: text,
                      defaultName: `${book.title}.txt`,
                    });
                  }}
                  className="px-2.5 py-1.5 text-xs pixel-btn text-[var(--text-secondary)]"
                >
                  تصدير
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 text-xs pixel-btn text-[var(--text-secondary)]"
                >
                  طباعة
                </button>
              </>
            )}

            <div className="w-px h-5 bg-[var(--bg-border)] mx-1" />

            <div className="flex items-center gap-1 bg-[var(--bg-card)] pixel-card-sm p-0.5">
              <button
                onClick={() => setFontSize(Math.max(0.8, fontSize - 0.1))}
                className="px-1.5 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)] transition-all text-xs pixel-btn"
              >
                أ-
              </button>
              <span className="text-[var(--text-muted)] text-[10px] px-1 min-w-[2.5em] text-center font-pixel">{Math.round(fontSize * 100)}</span>
              <button
                onClick={() => setFontSize(Math.min(2.5, fontSize + 0.1))}
                className="px-1.5 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)] transition-all text-sm pixel-btn"
              >
                أ+
              </button>
            </div>

            <div className="flex items-center gap-0.5 bg-[var(--bg-card)] pixel-card-sm p-0.5">
              {themes.map((t) => (
                <button
                  key={t.key}
                  onClick={() => handleThemeChange(t.key)}
                  className={`px-1.5 py-0.5 text-[10px] pixel-btn transition-all ${
                    readerTheme === t.key
                       ? 'bg-[var(--accent)] text-[var(--text-primary)] font-medium'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {searchOpen && (
          <div className="px-4 py-2 bg-[var(--bg-card)] border-b-2 border-[var(--border)] flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey) handleSearchPrev();
                  else handleSearchNext();
                }
              }}
              placeholder="ابحث في الصفحة..."
              className="flex-1 bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm px-3 py-1.5 rounded border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] placeholder-[var(--text-muted)]"
              dir="auto"
            />
            {matchCount > 0 && (
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                {matchIndex + 1} / {matchCount}
              </span>
            )}
            {searchQuery && matchCount === 0 && (
              <span className="text-xs text-[var(--danger)] whitespace-nowrap">
                لا توجد نتائج
              </span>
            )}
            <button
              onClick={handleSearchPrev}
              disabled={matchCount === 0}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)] disabled:opacity-30 transition-all"
            >
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={handleSearchNext}
              disabled={matchCount === 0}
              className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)] disabled:opacity-30 transition-all"
            >
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
                setMatchIndex(0);
              }}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)] transition-all text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {bookSearchOpen && (
          <div className="bg-[var(--bg-card)] border-b border-[var(--border)]">
            <div className="px-4 py-2 flex items-center gap-2">
              <input
                ref={bookSearchRef}
                type="text"
                value={bookSearchQuery}
                onChange={(e) => {
                  setBookSearchQuery(e.target.value);
                  handleBookSearch(e.target.value);
                }}
                placeholder="ابحث في الكتاب كاملاً..."
              className="flex-1 bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm px-3 py-1.5 rounded border border-[var(--border)] focus:outline-none focus:border-[var(--accent)] placeholder-[var(--text-muted)]"
                dir="auto"
              />
              <button
                onClick={() => {
                  setBookSearchOpen(false);
                  setBookSearchQuery('');
                  setBookSearchResults([]);
                }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-border)] transition-all text-xs"
              >
                ✕
              </button>
            </div>
            {bookSearchQuery && (
              <div className="max-h-48 overflow-y-auto border-t border-[var(--border)]">
                {bookSearchLoading ? (
                  <div className="px-4 py-3 text-[var(--text-muted)] text-xs">جاري البحث...</div>
                ) : bookSearchResults.length === 0 ? (
                  <div className="px-4 py-3 text-[var(--text-muted)] text-xs">لا توجد نتائج</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]/50">
                    {bookSearchResults.slice(0, 20).map((item, i) => (
                      <button
                        key={item.id || i}
                        onClick={() => navigateToSearchResult(item)}
                        className="w-full text-start px-4 py-2 hover:bg-[var(--bg-border)]/50 transition-colors"
                      >
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2"
                          dangerouslySetInnerHTML={{
                            __html: item.content
                              .replace(new RegExp(bookSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
                                (m: string) => `<mark class="bg-[var(--accent)]/40 text-[var(--text-primary)] rounded-sm">${m}</mark>`)
                              .slice(0, 300)
                          }}
                        />
                        <div className="text-[10px] text-[var(--text-muted)] mt-1">صفحة {item.page}</div>
                      </button>
                    ))}
                    {bookSearchResults.length > 20 && (
                      <div className="px-4 py-2 text-[var(--text-muted)] text-[10px] text-center">
                        و {bookSearchResults.length - 20} نتيجة أخرى...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showInfo && (
          <div className="w-72 bg-[var(--bg-surface)] border-e border-[var(--border)] flex flex-col overflow-hidden shrink-0">
            <div className="px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card)] flex items-center justify-between">
              <h3 className="text-[var(--text-secondary)] text-xs font-medium">معلومات الكتاب</h3>
              <button
                onClick={() => setShowInfo(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div>
                <div className="text-[var(--text-muted)] text-[10px] mb-0.5">العنوان</div>
                <div className="text-[var(--text-primary)] text-sm leading-relaxed">{book.title}</div>
              </div>
              {book.author_name && (
                <div>
                  <div className="text-[var(--text-muted)] text-[10px] mb-0.5">المؤلف</div>
                  <button
                    onClick={() => book.author_id && onOpenAuthor(book.author_id)}
                    className="text-[var(--accent)] text-sm hover:text-[var(--accent-hover)] transition-colors text-start"
                  >
                    {book.author_name}
                  </button>
                </div>
              )}
              {book.category_name && (
                <div>
                  <div className="text-[var(--text-muted)] text-[10px] mb-0.5">التصنيف</div>
                  <div className="text-[var(--text-secondary)] text-sm">{book.category_name}</div>
                </div>
              )}
              {book.description && (
                <div>
                  <div className="text-[var(--text-muted)] text-[10px] mb-0.5">الوصف</div>
                  <div className="text-[var(--text-secondary)] text-xs leading-relaxed whitespace-pre-line">{book.description}</div>
                </div>
              )}
              {book.pdf_path && (
                <div>
                  <div className="text-[var(--text-muted)] text-[10px] mb-0.5">ملف PDF</div>
                  <button
                    onClick={() => onOpenPdf?.(book)}
                    className="text-[var(--accent)] text-xs hover:text-[var(--accent-hover)] transition-colors"
                  >
                    عرض PDF
                  </button>
                </div>
              )}
              <div>
                <div className="text-[var(--text-muted)] text-[10px] mb-0.5">محتوى</div>
                <div className="text-[var(--text-secondary)] text-xs">
                  {totalBookPages.toLocaleString('ar')} صفحة
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={contentRef} className="flex-1 overflow-y-auto p-6 lg:p-8 relative reader-area" onMouseUp={handleTextSelection}>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-[var(--bg-border)] rounded w-full mb-2" />
                  <div className="h-4 bg-[var(--bg-border)] rounded w-11/12 mb-2" />
                  <div className="h-4 bg-[var(--bg-border)] rounded w-4/5" />
                </div>
              ))}
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-[var(--text-muted)] mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              {book.pdf_path ? (
                <div>
                  <p className="text-[var(--text-secondary)] mb-3">هذا الكتاب متوفر بصيغة PDF</p>
                  <button
                    className="px-6 py-2.5 bg-[var(--accent)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-all"
                    onClick={() => onOpenPdf?.(book)}
                  >
                    عرض PDF
                  </button>
                </div>
              ) : (
                <p className="text-[var(--text-secondary)]">هذا الكتاب غير متوفر للنص الكامل</p>
              )}
            </div>
          ) : (
            <div className={`arabic-text reader-${readerTheme}`} style={{ fontSize: `${fontSize}rem` }}>
              {highlightedContent.map((c, ci) => (
                <div key={c.id} className="mb-6 leading-relaxed whitespace-pre-line">
                  {c._parts ? (
                    c._parts.map((part: any, pi: number) => {
                      if (typeof part === 'string') return part;
                      if (part.isMatch) {
                        const globalIdx = c._matchOffset + c._parts.slice(0, pi + 1).filter((p: any) => typeof p !== 'string' && p.isMatch).length - 1;
                        const isActive = globalIdx === matchIndex;
                        return (
                          <mark
                            ref={(el) => { matchRefs.current[globalIdx] = el; }}
                            key={pi}
                            className={`rounded-sm ${
                              isActive
                                ? 'bg-[var(--accent)] text-[var(--text-primary)]'
                                : 'bg-[var(--accent)]/40 text-[var(--text-primary)]'
                            }`}
                            data-match-index={globalIdx}
                          >
                            {part.text}
                          </mark>
                        );
                      }
                      return <span key={pi}>{part.text}</span>;
                    })
                  ) : (
                    c.content
                  )}
                </div>
              ))}
            </div>
          )}

          {selectionPos && selectedText && (
            <div
              className="absolute z-50"
              style={{ top: selectionPos.top, left: selectionPos.left, transform: 'translateX(-50%)' }}
            >
              <button
                onClick={handleSaveSelection}
                className="bg-[var(--accent)] text-[var(--text-primary)] text-xs px-3 py-1.5 rounded-lg shadow-lg hover:bg-[var(--accent-hover)] transition-all whitespace-nowrap"
              >
                حفظ كملاحظة
              </button>
            </div>
          )}
        </div>

        {totalBookPages > 0 && (
          <div className="px-4 py-2 bg-[var(--bg-surface)] border-t border-[var(--border)] flex items-center justify-center gap-4">
            <button
              onClick={() => loadPage(currentPage + 1)}
              disabled={currentPage >= totalBookPages}
              className="px-3 py-1 rounded bg-[var(--bg-border)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--text-muted)] transition-all text-sm"
            >
              التالي
            </button>
            <span className="text-[var(--text-secondary)] text-sm">
              صفحة {currentPage} من {totalBookPages}
            </span>
            <button
              onClick={() => loadPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 rounded bg-[var(--bg-border)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--text-muted)] transition-all text-sm"
            >
              السابق
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
