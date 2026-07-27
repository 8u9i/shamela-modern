import { useState } from 'react';
import { Book, DbStats, ViewMode } from '../types';
import { AboutDialog } from './AboutDialog';

interface StatusBarProps {
  stats: DbStats | null;
  currentBook: Book | null;
  view: ViewMode;
}

export function StatusBar({ stats, currentBook, view }: StatusBarProps) {
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <>
      <footer className="flex items-center justify-between px-4 py-1 bg-[var(--bg-surface)] border-t-2 border-[var(--border)] text-[10px] text-[var(--text-muted)] font-pixel" style={{ lineHeight: '1.8' }}>
        <div className="flex items-center gap-4">
          {stats && (
            <>
              <span>الكتب: {stats.books.toLocaleString('ar')}</span>
              <span>المؤلفون: {stats.authors.toLocaleString('ar')}</span>
              <span>بالنص: {stats.withContent.toLocaleString('ar')}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currentBook && (
            <span className="text-[var(--accent)] truncate max-w-[300px]">
              {currentBook.title}
            </span>
          )}
          <button
            onClick={() => setAboutOpen(true)}
            className="hover:text-[var(--accent)] transition-colors"
          >
            Shamela Modern v1.0
          </button>
        </div>
      </footer>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} stats={stats} />
    </>
  );
}
