import { useState, useEffect, useCallback } from 'react';
import {
  Wrench, Star, Trash2, Loader2, CheckCircle2, AlertTriangle, CheckSquare, Square
} from 'lucide-react';
import { DuplicateAuthorGroup } from '../types';
import { PdfDownloadManager } from './PdfDownloadManager';
import { BookUpdateManager } from './BookUpdateManager';

export function ServicesView() {
  const [dupGroups, setDupGroups] = useState<DuplicateAuthorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    loadDups();
  }, []);

  const loadDups = async () => {
    setLoading(true);
    try {
      const groups = await window.api.findDuplicateAuthors();
      setDupGroups(groups);
    } catch (e) {
      console.error('Failed to load duplicates:', e);
    } finally {
      setLoading(false);
    }
  };

  const getGroupKey = useCallback((g: DuplicateAuthorGroup, m: typeof g.members[0]) => `${g.name}|${m.id}`, []);

  const isMemberSelected = useCallback((g: DuplicateAuthorGroup, m: typeof g.members[0]) => {
    return selected.has(getGroupKey(g, m));
  }, [selected, getGroupKey]);

  const toggleMember = useCallback((g: DuplicateAuthorGroup, m: typeof g.members[0]) => {
    const key = getGroupKey(g, m);
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, [getGroupKey]);

  const handleMerge = useCallback(async () => {
    if (selected.size === 0) return;
    setMerging(true);
    setResult(null);
    try {
      const selectedMap = new Map<string, { primaryId: number; duplicateIds: Set<number> }>();
      for (const g of dupGroups) {
        const prim = g.members.find(m => m.is_primary);
        if (!prim) continue;
        const dups = g.members.filter(m => m.id !== prim.id && isMemberSelected(g, m));
        if (dups.length === 0) continue;
        const key = String(prim.id);
        if (!selectedMap.has(key)) {
          selectedMap.set(key, { primaryId: prim.id, duplicateIds: new Set() });
        }
        for (const d of dups) selectedMap.get(key)!.duplicateIds.add(d.id);
      }
      const primaries = Array.from(selectedMap.values()).map(s => ({
        primaryId: s.primaryId,
        duplicateIds: Array.from(s.duplicateIds),
      }));
      const res = await window.api.mergeDuplicateAuthors({ primaries });
      if (res.success) {
        setResult(`تم دمج ${res.merged} كتاب وحذف ${res.deleted} مؤلف`);
        setSelected(new Set());
        loadDups();
      } else {
        setResult(`خطأ: ${res.error}`);
      }
    } catch (e: any) {
      setResult(`خطأ: ${e.message}`);
    } finally {
      setMerging(false);
    }
  }, [selected, dupGroups, isMemberSelected]);

  const selectAllDuplicates = useCallback(() => {
    const next = new Set<string>();
    for (const g of dupGroups) {
      const prim = g.members.find(m => m.is_primary);
      if (!prim) continue;
      for (const m of g.members) {
        if (m.id !== prim.id) next.add(getGroupKey(g, m));
      }
    }
    setSelected(next);
  }, [dupGroups, getGroupKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto fade-in" dir="rtl">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Wrench className="w-4 h-4 text-primary" />
          خدمات
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          تحديث الكتب وتحميل ملفات PDF وإصلاح المؤلفين المكررين وتوحيد الكتب
        </p>
      </div>

      <BookUpdateManager />

      <PdfDownloadManager />

      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          دمج المؤلفين المكررين
        </h3>
        <p className="text-sm text-muted-foreground mt-0.5 mb-3">
          ابحث عن المؤلفين المكررين ووحّد كتبهم تحت سجل واحد
        </p>
      </div>

      {result && (
        <div
          className={`mb-3 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
            result.includes('خطأ')
              ? 'text-danger bg-danger/10 border border-danger/30'
              : 'text-success bg-success/10 border border-success/30'
          }`}
        >
          {result.includes('خطأ') ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          {result}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={selectAllDuplicates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-secondary-foreground hover:border-primary/50 transition-all"
        >
          <CheckSquare className="w-3.5 h-3.5 text-primary" />
          اختر الكل
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-secondary-foreground hover:border-primary/50 transition-all"
        >
          <Square className="w-3.5 h-3.5" />
          إلغاء الكل
        </button>
        <button
          onClick={handleMerge}
          disabled={selected.size === 0 || merging}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all"
        >
          {merging ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
          {merging ? 'جاري الدمج...' : `دمج المحدد (${selected.size})`}
        </button>
      </div>

      <div className="text-sm text-muted-foreground mb-3 tabular-nums">
        إجمالي المجموعات المكررة: {dupGroups.length}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {dupGroups.map((g) => {
          const prim = g.members.find(m => m.is_primary);
          const dups = g.members.filter(m => m.id !== prim?.id);
          return (
            <div key={g.name} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-muted border-b border-border">
                <div className="font-arabic text-sm font-medium text-foreground">{g.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{g.count} نسخة</div>
              </div>
              {g.members.map((m) => {
                const key = getGroupKey(g, m);
                const isChecked = selected.has(key);
                const isPrimary = m.is_primary;
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer hover:bg-muted transition-colors ${
                      isPrimary ? 'bg-success/5' : ''
                    } ${isPrimary ? '' : 'border-t border-border'}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMember(g, m)}
                      disabled={isPrimary}
                      className="accent-[hsl(var(--primary))] w-4 h-4 rounded"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      {isPrimary ? (
                        <span className="flex items-center gap-1 text-success text-xs font-medium">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          أصلي
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground text-xs">
                          <Trash2 className="w-3.5 h-3.5" />
                          مكرر
                        </span>
                      )}
                      <span className="text-muted-foreground text-xs tabular-nums">رقم {m.id}</span>
                      <span className="text-muted-foreground text-xs tabular-nums">({m.book_count} كتب)</span>
                    </div>
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
