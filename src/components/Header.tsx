import { useState, useRef, useEffect } from 'react';
import { Book, DbStats } from '../types';

interface HeaderProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
  onBack?: () => void;
  searchQuery: string;
  stats: DbStats | null;
  currentBook: Book | null;
}

export function Header({ onSearch, onToggleSidebar, onBack, searchQuery, stats, currentBook }: HeaderProps) {
  const [query, setQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  return (
    <header className="flex flex-col bg-[var(--bg-surface)] border-b-2 border-[var(--border)]">
      {/* Menu Bar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b-2 border-[var(--border)] text-xs">
        <button
          onClick={onToggleSidebar}
          className="px-2 py-1 pixel-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          ☰
        </button>
        {onBack && (
          <button
            onClick={onBack}
            className="px-2 py-1 pixel-btn text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            رجوع ←
          </button>
        )}
        <div className="flex-1" />
        <span className="text-[var(--text-muted)] text-[10px] font-pixel">المكتبة الشاملة الإباضية</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-2">
        {currentBook && (
          <div className="flex items-center gap-2 ps-3 border-s-2 border-[var(--border)]">
            <span className="text-[var(--accent)] text-sm font-medium font-arabic truncate max-w-[300px]">
              {currentBook.title}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex-1 max-w-xl">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="بحث في الكتب والمؤلفين... (Ctrl+K)"
              className="w-full px-3 py-1.5 ps-8 bg-[var(--bg-card)] border-2 border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-all text-sm"
              style={{ boxShadow: '2px 2px 0 0 var(--pixel-shadow)' }}
            />
            <svg
              className="absolute end-2 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {stats && (
          <div className="flex items-center gap-4 text-[10px] font-pixel text-[var(--text-muted)]" style={{ lineHeight: '1.6' }}>
            <span>{stats.books.toLocaleString('ar')}K</span>
            <span>{stats.authors.toLocaleString('ar')}A</span>
          </div>
        )}
      </div>
    </header>
  );
}
