import { useState, useEffect } from 'react';

interface PdfViewerProps {
  relativePath: string;
  bookTitle: string;
  onBack: () => void;
}

export function PdfViewer({ relativePath, bookTitle, onBack }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadPdf();
  }, [relativePath]);

  const loadPdf = async () => {
    try {
      const fullPath = await window.api.getPdfPath(relativePath);
      if (fullPath) {
        // Normalize Windows path to a proper URL with forward slashes
        const parts = fullPath.split(/[\\/]/);
        const encoded = parts.map((s, i) => i === 0 ? s : encodeURIComponent(s)).join('/');
        setPdfUrl(`shamela-pdf:///${encoded}`);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1 rounded hover:bg-[var(--bg-border)] transition-colors text-[var(--text-secondary)]"
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-arabic text-sm text-[var(--text-primary)] font-medium leading-relaxed line-clamp-1">
            {bookTitle}
          </h1>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            download
            className="px-2 py-1 rounded text-xs bg-[var(--bg-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            تحميل
          </a>
        )}
      </div>

      <div className="flex-1 bg-[#0f172a]">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-secondary)]">
            <p className="mb-4">تعذر فتح ملف PDF</p>
            <button
              onClick={onBack}
              className="px-6 py-2.5 bg-[var(--accent)] text-[var(--text-primary)] rounded-xl font-medium hover:bg-[var(--accent-hover)] transition-all"
            >
              العودة
            </button>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none"
            title={bookTitle}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
            جاري التحميل...
          </div>
        )}
      </div>
    </div>
  );
}
