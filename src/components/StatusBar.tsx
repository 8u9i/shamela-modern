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
      <footer className="flex items-center justify-between px-4 py-1.5 bg-card border-t border-border text-[11px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          {stats && (
            <>
              <span>الكتب: <bdi className="text-secondary-foreground font-medium">{stats.books.toLocaleString('ar')}</bdi></span>
              <span>المؤلفون: <bdi className="text-secondary-foreground font-medium">{stats.authors.toLocaleString('ar')}</bdi></span>
              <span>بالنص: <bdi className="text-secondary-foreground font-medium">{stats.withContent.toLocaleString('ar')}</bdi></span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currentBook && (
            <span className="text-primary truncate max-w-[300px]">
              {currentBook.title}
            </span>
          )}
          <button
            onClick={() => setAboutOpen(true)}
            className="hover:text-primary transition-colors"
          >
            Shamela Modern v1.0
          </button>
        </div>
      </footer>
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} stats={stats} />
    </>
  );
}
