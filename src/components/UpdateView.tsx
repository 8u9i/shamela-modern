import { useState, useEffect, useCallback } from 'react';
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
      className="flex items-center justify-center h-screen relative"
      style={{
        backgroundImage: 'url(https://i.pinimg.com/vwebp/474x/0c/7a/be/0c7abeda6b928eff2031af59716cfed9.webp)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="pixel-card bg-[var(--bg-card)] px-8 py-10 text-center relative overflow-hidden"
        style={{ minWidth: 400 }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'url(https://i.pinimg.com/vwebp/474x/0c/7a/be/0c7abeda6b928eff2031af59716cfed9.webp)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <div className="relative z-10">
        <div className="font-pixel text-[var(--accent)] text-sm mb-6" style={{ lineHeight: 2 }}>
          المكتبة الشاملة الإباضية
        </div>

        {status === 'checking' && (
          <>
            <div className="text-[var(--text-secondary)] text-xs mb-4 font-pixel loading-pulse">
              جاري التحقق من التحديثات...
            </div>
            <div className="w-full bg-[var(--bg-border)] h-1 mt-4">
              <div className="bg-[var(--accent)] h-1 w-1/2 animate-pulse" />
            </div>
          </>
        )}

        {status === 'ready' && checkResult && (
          <>
            <div className="text-[var(--text-primary)] text-sm mb-2">
              تحديثات متوفرة
            </div>
            <div className="text-[var(--text-secondary)] text-xs mb-6">
              {checkResult.newCount} كتاب جديد، {checkResult.updateCount} تحديث
            </div>
            <div className="stat-block mb-6">
              <div className="stat-value text-sm">{checkResult.total.toLocaleString('ar')}</div>
              <div className="stat-label text-[10px]">إجمالي الكتب في الخادم</div>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={startUpdate} className="pixel-btn-gold text-xs px-6 py-2">
                بدء التحديث
              </button>
              <button onClick={onSkip} className="pixel-btn text-xs px-6 py-2">
                تخطي
              </button>
            </div>
          </>
        )}

        {status === 'downloading' && (
          <>
            <div className="text-[var(--text-secondary)] text-xs mb-4 font-pixel loading-pulse">
              {progress?.msg || 'جاري التحديث...'}
            </div>
            {progress && (
              <div className="text-[var(--text-muted)] text-[10px] mb-3 font-pixel">
                {progress.current} / {progress.total}
              </div>
            )}
            <div className="w-full bg-[var(--bg-border)] h-2">
              {progress && (
                <div
                  className="bg-[var(--accent)] h-2 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              )}
            </div>
          </>
        )}

        {status === 'done' && (
          <div
            className="pixel-card bg-[var(--bg-card)] px-8 py-10 text-center relative"
            style={{ minWidth: 400 }}
          >
            <div className="relative">
              <img
                src="https://i.pinimg.com/474x/b6/7f/48/b67f4841d6493a4fb9e7dc71063e0d2a.jpg"
                alt=""
                className="w-24 h-24 mx-auto mb-4 rounded-full border-2 border-[var(--accent)]"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="text-[var(--text-primary)] text-sm mb-4">
                {checkResult && checkResult.newCount === 0
                  ? 'المكتبة محدثة بالفعل'
                  : 'اكتمل التحديث'}
              </div>
              <button onClick={onComplete} className="pixel-btn-gold text-xs px-6 py-2">
                فتح المكتبة
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <>
            <div className="text-[var(--danger)] text-sm mb-2">خطأ</div>
            <div className="text-[var(--text-secondary)] text-xs mb-6">{errorMsg}</div>
            <div className="flex gap-3 justify-center">
              <button onClick={check} className="pixel-btn text-xs px-6 py-2">
                إعادة المحاولة
              </button>
              <button onClick={onSkip} className="pixel-btn text-xs px-6 py-2">
                تخطي
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
