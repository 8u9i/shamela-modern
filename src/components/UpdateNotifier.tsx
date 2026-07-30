import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppUpdateStatus } from '../types';

export function UpdateNotifier() {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const cleanup = window.api.onAppUpdateStatus((data: AppUpdateStatus) => {
      setStatus(data);
      setDismissed(false);
      if (data.status === 'not-available') {
        setDismissed(true);
      }
      if (data.status === 'error') {
        clearTimeout(errorTimer.current);
        errorTimer.current = setTimeout(() => setDismissed(true), 8000);
      }
    });
    window.api.checkForAppUpdates();
    return () => {
      cleanup();
      clearTimeout(errorTimer.current);
    };
  }, []);

  const handleDownload = useCallback(() => {
    window.api.downloadAppUpdate();
    setStatus((prev) => prev ? { ...prev, status: 'downloading', percent: 0 } : prev);
  }, []);

  const handleInstall = useCallback(() => {
    window.api.quitAndInstallApp();
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const handleRetry = useCallback(() => {
    setDismissed(false);
    setStatus({ status: 'checking' });
    window.api.checkForAppUpdates();
  }, []);

  if (!status || dismissed) return null;

  return (
    <div
      className="fixed bottom-4 left-4 z-50 pixel-card bg-[var(--bg-surface)] border border-[var(--accent)] p-3 shadow-xl"
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      {status.status === 'checking' && (
        <div className="flex items-center gap-2">
          <span className="loading-pulse text-[var(--accent)] text-[10px] font-pixel">◉</span>
          <span className="text-[var(--text-muted)] text-[10px] font-pixel">جاري التحقق من التحديثات...</span>
        </div>
      )}

      {status.status === 'available' && (
        <div>
          <div className="text-[var(--accent)] text-[11px] font-pixel mb-2">📦 تحديث متوفر</div>
          <div className="text-[var(--text-primary)] text-[10px] font-pixel mb-3">
            الإصدار {status.version} متاح للتحميل
          </div>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 text-[10px]"
              onClick={handleDownload}
            >
              تحميل
            </button>
            <button
              className="pixel-btn text-[10px] px-2"
              onClick={handleDismiss}
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {status.status === 'downloading' && (
        <div>
          <div className="text-[var(--accent)] text-[11px] font-pixel mb-2">⬇ جاري التحميل...</div>
          <div className="w-full h-2 bg-[var(--bg-card)] mb-1" style={{ borderRadius: 0 }}>
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${status.percent || 0}%` }}
            />
          </div>
          <div className="text-[var(--text-muted)] text-[9px] font-pixel">
            {status.percent?.toFixed(1) || 0}%
          </div>
        </div>
      )}

      {status.status === 'downloaded' && (
        <div>
          <div className="text-[var(--accent)] text-[11px] font-pixel mb-2">✅ التحديث جاهز</div>
          <div className="text-[var(--text-primary)] text-[10px] font-pixel mb-3">
            تم تحميل الإصدار {status.version}
          </div>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 text-[10px] bg-[var(--accent)] text-[var(--bg-page)]"
              onClick={handleInstall}
            >
              تثبيت وإعادة التشغيل
            </button>
            <button
              className="pixel-btn text-[10px] px-2"
              onClick={handleDismiss}
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {status.status === 'error' && (
        <div>
          <div className="text-red-400 text-[11px] font-pixel mb-1">⚠ خطأ في التحديث</div>
          <div className="text-[var(--text-muted)] text-[9px] font-pixel mb-2">
            تعذر التحقق من التحديثات
          </div>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 text-[10px]"
              onClick={handleRetry}
            >
              إعادة المحاولة
            </button>
            <button
              className="pixel-btn text-[10px] px-2"
              onClick={handleDismiss}
            >
              إخفاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
