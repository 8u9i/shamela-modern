import { useState, useEffect } from 'react';
import { ArrowRight, Download, FileText, Loader2, AlertTriangle } from 'lucide-react';

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
        const rel = relativePath.replace(/\\/g, '/').replace(/^Rel:/, '').replace(/^pdf\//, '');
        const encoded = rel.split('/').map(encodeURIComponent).join('/');
        setPdfUrl(`shamela-pdf://local/${encoded}`);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-card border-b border-border flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-secondary-foreground"
          >
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <h1 className="font-arabic text-sm text-foreground font-medium leading-relaxed line-clamp-1">
            {bookTitle}
          </h1>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-secondary-foreground text-xs hover:text-primary transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            تحميل
          </a>
        )}
      </div>

      <div className="flex-1 bg-background">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-secondary-foreground">
            <AlertTriangle className="w-8 h-8 text-warning mb-3" />
            <p className="mb-4">تعذر فتح ملف PDF</p>
            <button
              onClick={onBack}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-all"
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
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التحميل...
          </div>
        )}
      </div>
    </div>
  );
}
