import { useState, useEffect, useCallback, useRef } from 'react';

interface DownloadDbViewProps {
  onComplete: () => void;
}

export function DownloadDbView({ onComplete }: DownloadDbViewProps) {
  const [mode, setMode] = useState<'check' | 'prompt' | 'downloading' | 'error' | 'done'>('check');
  const [progress, setProgress] = useState({ downloaded: 0, total: 0, percent: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const [url, setUrl] = useState('https://eshamila.net/shamela.db');
  const downloading = useRef(false);

  useEffect(() => {
    let cancelled = false;
    window.api.checkDbExists().then((r) => {
      if (cancelled) return;
      if (r.exists) {
        setMode('done');
      } else {
        setMode('prompt');
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (mode === 'done') {
      onComplete();
    }
  }, [mode, onComplete]);

  useEffect(() => {
    const cleanup = window.api.onDbDownloadProgress((p) => {
      setProgress(p);
    });
    return cleanup;
  }, []);

  const handleDownload = useCallback(async () => {
    if (downloading.current) return;
    downloading.current = true;
    setMode('downloading');
    setErrorMsg('');
    try {
      const result = await window.api.downloadDbFromUrl({ url });
      if (result.success) {
        setMode('done');
      } else {
        setErrorMsg(result.error || 'فشل التحميل');
        setMode('error');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'حدث خطأ أثناء التحميل');
      setMode('error');
    } finally {
      downloading.current = false;
    }
  }, [url]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (mode === 'check') {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-page)]">
        <div className="pixel-card bg-[var(--bg-card)] px-8 py-10 text-center" style={{ minWidth: 320 }}>
          <div className="text-[var(--text-muted)] text-[10px] font-pixel">جاري التحقق من قاعدة البيانات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-[var(--bg-page)]">
      <div className="pixel-card bg-[var(--bg-card)] px-8 py-10 text-center" style={{ minWidth: 420, maxWidth: 520 }}>
        <div className="font-pixel text-[var(--accent)] text-sm mb-6" style={{ lineHeight: 2 }}>
          المكتبة الشاملة
        </div>

        {mode === 'prompt' && (
          <>
            <div className="text-[var(--text-primary)] text-xs mb-4 font-pixel" style={{ lineHeight: 1.8 }}>
              قاعدة البيانات غير موجودة
            </div>
            <div className="text-[var(--text-muted)] text-[10px] mb-4 font-pixel" style={{ lineHeight: 1.8 }}>
              يمكنك تحميل قاعدة البيانات من الرابط التالي، أو وضع الملف يدوياً في مجلد البيانات
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--bg-border)] text-[var(--text-primary)] text-xs font-pixel mb-4 text-left"
              style={{ direction: 'ltr' }}
            />
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-[var(--accent)] text-white text-xs font-pixel hover:opacity-80 transition-opacity"
            >
              تحميل قاعدة البيانات
            </button>
            <div className="text-[var(--text-muted)] text-[9px] mt-4 font-pixel">
              أو ضع ملف shamela.db في مجلد بيانات التطبيق
            </div>
          </>
        )}

        {mode === 'downloading' && (
          <>
            <div className="text-[var(--text-primary)] text-xs mb-4 font-pixel">جاري تحميل قاعدة البيانات...</div>
            <div className="w-full h-2 bg-[var(--bg-surface)] mb-2" style={{ borderRadius: 0 }}>
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progress.percent}%`, borderRadius: 0 }}
              />
            </div>
            <div className="text-[var(--text-muted)] text-[10px] font-pixel">
              {formatSize(progress.downloaded)} / {formatSize(progress.total)} ({progress.percent}%)
            </div>
          </>
        )}

        {mode === 'error' && (
          <>
            <div className="text-red-400 text-xs mb-3 font-pixel">⚠ خطأ في التحميل</div>
            <div className="text-[var(--text-muted)] text-[10px] mb-4 font-pixel">{errorMsg}</div>
            <button
              onClick={handleDownload}
              className="px-6 py-3 bg-[var(--accent)] text-white text-xs font-pixel hover:opacity-80 transition-opacity"
            >
              إعادة المحاولة
            </button>
          </>
        )}
      </div>
    </div>
  );
}
