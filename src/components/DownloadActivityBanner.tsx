import { useState, useEffect, useRef } from 'react';
import { Download, FileDown, X } from 'lucide-react';
import { UpdateProgress, PdfDownloadProgress } from '../types';

const HIDE_DELAY_MS = 5000;

// Floating banner that shows book updates / bulk-PDF downloads running in the
// background so the user can keep browsing while they complete.
export function DownloadActivityBanner() {
  const [books, setBooks] = useState<UpdateProgress | null>(null);
  const [pdf, setPdf] = useState<PdfDownloadProgress | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const scheduleHide = () => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setDismissed(true), HIDE_DELAY_MS);
  };

  useEffect(() => {
    const cleanupBooks = window.api.onUpdateProgress((p: UpdateProgress) => {
      setBooks(p);
      setDismissed(false);
      clearTimeout(hideTimer.current);
      if (p.msg === 'اكتمل التحديث') scheduleHide();
    });
    const cleanupPdf = window.api.onPdfDownloadProgress((p: PdfDownloadProgress) => {
      setPdf(p);
      setDismissed(false);
      clearTimeout(hideTimer.current);
      if (p.type === 'done' || p.type === 'stopped') scheduleHide();
    });
    return () => {
      cleanupBooks();
      cleanupPdf();
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (dismissed || (!books && !pdf)) return null;

  const booksDone = books?.msg === 'اكتمل التحديث';
  const booksRunning = !!books && !booksDone;
  const pdfDone = pdf?.type === 'done' || pdf?.type === 'stopped';
  const pdfRunning = !!pdf && !pdfDone;
  const anythingRunning = booksRunning || pdfRunning;

  if (!anythingRunning && !booksDone && !pdfDone) return null;

  const booksPercent = books && books.total > 0 ? Math.min(100, Math.round((books.current / books.total) * 100)) : 0;
  const pdfPercent = pdf && pdf.total > 0 ? Math.min(100, Math.round((pdf.downloaded / pdf.total) * 100)) : 0;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 pixel-card bg-card border border-primary/30 p-3 shadow-xl"
      style={{ minWidth: 260, maxWidth: 340 }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-primary text-xs font-medium">
          <Download className="w-3.5 h-3.5 shrink-0" />
          التحميل في الخلفية
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground p-0.5"
          aria-label="إخفاء"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {booksRunning && (
        <div className="mb-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span className="truncate">{books!.msg}</span>
            <span className="tabular-nums shrink-0 ms-2">{books!.current} / {books!.total}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${booksPercent}%` }} />
          </div>
        </div>
      )}

      {pdfRunning && (
        <div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5 truncate">
              <FileDown className="w-3 h-3 shrink-0" />
              تحميل ملفات PDF — {pdf!.downloaded} من {pdf!.total}
              {pdf!.failed > 0 ? ` (فشل ${pdf!.failed})` : ''}
            </span>
            <span className="tabular-nums shrink-0 ms-2">{pdfPercent}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pdfPercent}%` }} />
          </div>
        </div>
      )}

      {!anythingRunning && (booksDone || pdfDone) && (
        <div className="text-[11px] text-success">
          {booksDone && 'اكتمل تحديث الكتب. '}
          {pdfDone && 'اكتمل تحميل ملفات PDF.'}
        </div>
      )}
    </div>
  );
}
