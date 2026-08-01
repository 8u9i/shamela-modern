import { useState, useEffect, useCallback } from 'react';
import {
  Download, Loader2, CheckCircle2, AlertTriangle, RefreshCw, BookOpen
} from 'lucide-react';
import { UpdateCheckResult, UpdateProgress } from '../types';

// Book library update manager shown in the Services tab: shows what an update
// check found, lets the user start an update right there, and renders live
// progress (book name + counter) while it runs.
export function BookUpdateManager() {
  const [checkResult, setCheckResult] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(true);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const check = useCallback(async () => {
    setChecking(true);
    setLastError(null);
    try {
      const result = await window.api.checkUpdates();
      if (result.error) {
        setLastError(result.error);
        setCheckResult(null);
      } else {
        setCheckResult(result);
      }
    } catch (e: any) {
      setLastError(e?.message || 'فشل التحقق من التحديثات');
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    const cleanup = window.api.onUpdateProgress((p: UpdateProgress) => {
      setProgress(p);
      if (p.msg === 'اكتمل التحديث') {
        setRunning(false);
      }
    });
    return cleanup;
  }, []);

  const handleStart = useCallback(async () => {
    setLastError(null);
    setLastResult(null);
    setRunning(true);
    try {
      const res = await window.api.startUpdate();
      if (res && res.error) {
        setLastError(res.error);
      } else {
        setLastResult(res?.message || 'اكتمل تحديث المكتبة');
      }
      check();
    } catch (e: any) {
      setLastError(e?.message || 'فشل بدء التحديث');
    } finally {
      setRunning(false);
    }
  }, [check]);

  const runningNow = running || (!!progress && progress.msg !== 'اكتمل التحديث' && progress.total > 0);
  const percent = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0;
  const hasPending = checkResult && (checkResult.newCount > 0 || checkResult.updateCount > 0);

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-4 h-4 text-primary shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-foreground">تحديث الكتب</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              تثبيت الكتب الجديدة وتحديث المحتوى من الخادم — يستمر في الخلفية دون إيقاف التطبيق
            </p>
          </div>
        </div>
        <button
          onClick={check}
          disabled={checking || runningNow}
          className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-40 transition-all"
          aria-label="إعادة التحقق"
          title="إعادة التحقق"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {!runningNow && checkResult && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg py-2 px-1">
            <div className="text-sm font-bold text-foreground tabular-nums">
              {checkResult.total.toLocaleString('ar')}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">في الخادم</div>
          </div>
          <div className="bg-muted/50 rounded-lg py-2 px-1">
            <div className="text-sm font-bold text-foreground tabular-nums">
              {checkResult.local.toLocaleString('ar')}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">مثبتة لديك</div>
          </div>
          <div className="bg-muted/50 rounded-lg py-2 px-1">
            <div className="text-sm font-bold text-primary tabular-nums">
              {(checkResult.newCount + checkResult.updateCount).toLocaleString('ar')}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">متاحة للتحديث</div>
          </div>
        </div>
      )}

      {runningNow && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span className="truncate">{progress?.msg || 'جاري التحديث...'}</span>
            <span className="tabular-nums shrink-0 ms-2">
              {progress ? `${progress.current.toLocaleString('ar')} / ${progress.total.toLocaleString('ar')}` : ''}
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            يستمر التثبيت في الخلفية — يمكنك متابعة التصفح، وتجنب إغلاق التطبيق حتى الاكتمال
          </p>
        </div>
      )}

      {checking && !checkResult && !runningNow && (
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          جاري التحقق من التحديثات...
        </div>
      )}

      {lastError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {lastError}
        </div>
      )}

      {lastResult && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-success">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          {lastResult}
        </div>
      )}

      {!runningNow && checkResult && (
        <div className="mt-3">
          {hasPending ? (
            <button
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              تحديث الآن ({checkResult.newCount + checkResult.updateCount})
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              المكتبة محدثة بالفعل
            </div>
          )}
        </div>
      )}
    </div>
  );
}
