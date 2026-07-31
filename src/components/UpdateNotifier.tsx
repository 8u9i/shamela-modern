import { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Download, CheckCircle2, AlertTriangle, RefreshCw, X } from 'lucide-react';
import type { AppUpdateStatus } from '../types';

export function UpdateNotifier() {
  const [status, setStatus] = useState<AppUpdateStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      className="fixed bottom-4 left-4 z-50 pixel-card bg-card border border-primary/40 p-4 shadow-xl"
      style={{ minWidth: 280, maxWidth: 360 }}
    >
      {status.status === 'checking' && (
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <span className="text-muted-foreground text-xs">جاري التحقق من التحديثات...</span>
        </div>
      )}

      {status.status === 'available' && (
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <Package className="w-4 h-4" />
            تحديث متوفر
          </div>
          <div className="text-foreground text-xs mb-3">
            الإصدار {status.version} متاح للتحميل
          </div>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 text-xs border border-primary/40 text-primary hover:bg-primary/10"
              onClick={handleDownload}
            >
              تحميل
            </button>
            <button
              className="pixel-btn text-xs px-2 text-muted-foreground"
              onClick={handleDismiss}
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {status.status === 'downloading' && (
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <Download className="w-4 h-4" />
            جاري التحميل...
          </div>
          <div className="w-full h-2 bg-muted rounded-full mb-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${status.percent || 0}%` }}
            />
          </div>
          <div className="text-muted-foreground text-[10px]">
            {status.percent?.toFixed(1) || 0}%
          </div>
        </div>
      )}

      {status.status === 'downloaded' && (
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-medium mb-2">
            <CheckCircle2 className="w-4 h-4" />
            التحديث جاهز
          </div>
          <div className="text-foreground text-xs mb-3">
            تم تحميل الإصدار {status.version}
          </div>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleInstall}
            >
              تثبيت وإعادة التشغيل
            </button>
            <button
              className="pixel-btn text-xs px-2 text-muted-foreground"
              onClick={handleDismiss}
            >
              لاحقاً
            </button>
          </div>
        </div>
      )}

      {status.status === 'error' && (
        <div>
          <div className="flex items-center gap-2 text-danger text-sm font-medium mb-1">
            <AlertTriangle className="w-4 h-4" />
            خطأ في التحديث
          </div>
          <div className="text-muted-foreground text-xs mb-2">
            تعذر التحقق من التحديثات
          </div>
          <div className="flex gap-2">
            <button
              className="pixel-btn flex-1 text-xs text-muted-foreground"
              onClick={handleRetry}
            >
              إعادة المحاولة
            </button>
            <button
              className="pixel-btn text-xs px-2 text-muted-foreground"
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
