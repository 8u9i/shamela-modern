import { useState, useEffect, useCallback } from 'react';
import {
  FileDown, Loader2, CheckCircle2, AlertTriangle, Square, HardDriveDownload
} from 'lucide-react';
import { PdfDownloadProgress, PdfDownloadState } from '../types';

export function PdfDownloadManager() {
  const [state, setState] = useState<PdfDownloadState>({
    running: false,
    total: 0,
    cached: 0,
    downloaded: 0,
    failed: 0,
    stopped: false,
  });
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    window.api.getPdfDownloadState().then((s: PdfDownloadState) => {
      if (!cancelled) setState(s);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const cleanup = window.api.onPdfDownloadProgress((p: PdfDownloadProgress) => {
      setCurrentFile(p.type === 'progress' ? p.current ?? null : null);
      setState((prev) => ({
        ...prev,
        running: p.type === 'start' || p.type === 'progress',
        total: p.total,
        downloaded: p.downloaded,
        failed: p.failed,
        stopped: p.type === 'stopped',
      }));
    });
    return cleanup;
  }, []);

  const handleStart = useCallback(async () => {
    setLastError(null);
    try {
      const res = await window.api.downloadAllPdfs();
      if (res && res.error) setLastError(res.error);
    } catch (e: any) {
      setLastError(e?.message || 'فشل بدء التحميل');
    }
  }, []);

  const handleStop = useCallback(() => {
    window.api.stopPdfDownloads().catch(() => {});
  }, []);

  const total = state.total;
  const ready = state.cached + state.downloaded;
  const percent = total > 0 ? Math.min(100, Math.round((ready / total) * 100)) : 0;
  const running = state.running;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <HardDriveDownload className="w-4 h-4 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-foreground">تحميل جميع ملفات PDF</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              حمّل نسخ PDF لجميع الكتب دفعة واحدة للعمل دون اتصال بالإنترنت
              {total > 0 ? ` — نحو ${total.toLocaleString('ar')} ملفاً حالياً` : ''}
              {' '}(تُستأنف تلقائياً عند تكرار التشغيل)
            </p>
          </div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 tabular-nums">
            <span>
              {running ? 'جاري التحميل...' : 'جاهز:'} {ready} من {total} ملف
              {state.failed > 0 ? ` — فشل ${state.failed}` : ''}
            </span>
            <span>{percent}%</span>
          </div>
          {running && currentFile && (
            <p className="text-[11px] text-muted-foreground mb-1.5 truncate" dir="ltr" title={currentFile}>
              {currentFile.split('/').pop()}
            </p>
          )}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {lastError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {lastError}
        </div>
      )}

      {!running && percent >= 100 && total > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          اكتمل تحميل جميع ملفات PDF
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {!running ? (
          <button
            onClick={handleStart}
            disabled={total === 0 || percent >= 100}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <FileDown className="w-3.5 h-3.5" />
            تحميل الكل
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:opacity-90 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            إيقاف
          </button>
        )}
        {running && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            يستمر التحميل في الخلفية أثناء التصفح — يرجى عدم إغلاق التطبيق حتى اكتماله
          </span>
        )}
      </div>
    </div>
  );
}
