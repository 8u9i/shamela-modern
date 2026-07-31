import { useState, useEffect, useCallback } from 'react';
import { Library, Download, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { UpdateCheckResult, UpdateProgress } from '../types';

interface UpdateViewProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function UpdateView({ onComplete, onSkip }: UpdateViewProps) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'downloading' | 'done' | 'error'>('checking');
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    check();
  }, []);

  useEffect(() => {
    const cleanup = window.api.onUpdateProgress((p: UpdateProgress) => {
      setProgress(p);
    });
    return cleanup;
  }, []);

  const check = async () => {
    try {
      const result = await window.api.checkUpdates();
      if (result.error) {
        setErrorMsg(result.error);
        setStatus('error');
        return;
      }
      setCheckResult(result);
      if (result.newCount === 0 && result.updateCount === 0) {
        setStatus('done');
      } else {
        setStatus('ready');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'فشل الاتصال بالخادم');
      setStatus('error');
    }
  };

  const startUpdate = useCallback(async () => {
    setStatus('downloading');
    try {
      const result = await window.api.startUpdate();
      if (result.error) {
        setErrorMsg(result.error);
        setStatus('error');
      } else {
        setStatus('done');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'فشل التحديث');
      setStatus('error');
    }
  }, []);

  return (
    <div
      className="flex items-center justify-center h-screen relative overflow-hidden bg-background"
      style={{
        backgroundImage: 'radial-gradient(ellipse at top, hsl(var(--primary) / 0.12), transparent 55%), radial-gradient(ellipse at bottom left, hsl(var(--teal) / 0.08), transparent 50%)',
      }}
    >
      <div className="pixel-card px-8 py-10 text-center relative" style={{ minWidth: 400, maxWidth: 440 }}>
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Library className="w-6 h-6" />
          </span>
        </div>
        <div className="font-arabic text-primary text-lg font-bold mb-1">
          المكتبة الشاملة الإباضية
        </div>
        <div className="text-muted-foreground text-xs mb-6">
          مكتبة التراث الإباضي
        </div>

        {status === 'checking' && (
          <>
            <div className="text-muted-foreground text-sm mb-4 loading-pulse">
              جاري التحقق من التحديثات...
            </div>
            <div className="w-full bg-border h-1 rounded-full mt-4 overflow-hidden">
              <div className="bg-primary h-1 w-1/2 rounded-full animate-pulse" />
            </div>
          </>
        )}

        {status === 'ready' && checkResult && (
          <>
            <div className="text-foreground text-base font-medium mb-2">
              تحديثات متوفرة
            </div>
            <div className="text-muted-foreground text-sm mb-6">
              {checkResult.newCount} كتاب جديد، {checkResult.updateCount} تحديث
            </div>
            <div className="stat-block mb-6">
              <div className="stat-value text-lg">{checkResult.total.toLocaleString('ar')}</div>
              <div className="stat-label text-[10px]">إجمالي الكتب في الخادم</div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={startUpdate} className="pixel-btn-gold text-sm px-6 py-2 flex items-center gap-2">
                <Download className="w-4 h-4" />
                بدء التحديث
              </button>
              <button onClick={onSkip} className="pixel-btn text-sm px-6 py-2 border border-border bg-card text-muted-foreground hover:text-foreground">
                تخطي
              </button>
            </div>
          </>
        )}

        {status === 'downloading' && (
          <>
            <div className="text-muted-foreground text-sm mb-4 loading-pulse">
              {progress?.msg || 'جاري التحديث...'}
            </div>
            {progress && (
              <div className="text-muted-foreground text-xs mb-3">
                {progress.current} / {progress.total}
              </div>
            )}
            <div className="w-full bg-border h-2 rounded-full overflow-hidden">
              {progress && (
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              )}
            </div>
          </>
        )}

        {status === 'done' && (
          <div className="relative">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-primary" />
            <div className="text-foreground text-base font-medium mb-4">
              {checkResult && checkResult.newCount === 0
                ? 'المكتبة محدثة بالفعل'
                : 'اكتمل التحديث'}
            </div>
            <button onClick={onComplete} className="pixel-btn-gold text-sm px-6 py-2">
              فتح المكتبة
            </button>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="flex items-center justify-center gap-2 text-danger text-base font-medium mb-2">
              <AlertTriangle className="w-5 h-5" />
              خطأ
            </div>
            <div className="text-muted-foreground text-sm mb-6">{errorMsg}</div>
            <div className="flex gap-3 justify-center">
              <button onClick={check} className="pixel-btn text-sm px-6 py-2 border border-border bg-card text-muted-foreground hover:text-foreground flex items-center gap-2">
                <RefreshCw className="w-4 h-4" />
                إعادة المحاولة
              </button>
              <button onClick={onSkip} className="pixel-btn text-sm px-6 py-2 border border-border bg-card text-muted-foreground hover:text-foreground">
                تخطي
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
