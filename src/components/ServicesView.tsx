import { useState, useEffect, useCallback } from 'react';
import { DuplicateAuthorGroup } from '../types';

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
      // Group selections by primary
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
        <div className="text-[var(--text-muted)] text-xs font-pixel">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto" dir="rtl">
      <div className="mb-4">
        <h2 className="text-sm font-bold text-[var(--accent)] font-pixel" style={{ lineHeight: 2 }}>خدمات</h2>
        <p className="text-[10px] text-[var(--text-muted)] font-pixel">إصلاح المؤالفين المكررين وتوحيد الكتب</p>
      </div>

      {result && (
        <div className={`mb-3 px-3 py-2 text-[10px] font-pixel ${result.includes('خطأ') ? 'text-red-400 bg-red-900/30' : 'text-green-400 bg-green-900/30'}`}>
          {result}
        </div>
      )}

      <div className="flex gap-2 mb-3">
        <button
          onClick={selectAllDuplicates}
          className="px-3 py-1.5 text-[10px] font-pixel pixel-btn bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
        >
          اختر الكل
        </button>
        <button
          onClick={() => setSelected(new Set())}
          className="px-3 py-1.5 text-[10px] font-pixel pixel-btn bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--border)]"
        >
          إلغاء الكل
        </button>
        <button
          onClick={handleMerge}
          disabled={selected.size === 0 || merging}
          className="px-3 py-1.5 text-[10px] font-pixel pixel-btn bg-[var(--accent)] text-black disabled:opacity-40"
        >
          {merging ? 'جاري الدمج...' : `دمج المحدد (${selected.size})`}
        </button>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] font-pixel mb-2">
        إجمالي المجموعات المكررة: {dupGroups.length}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {dupGroups.map((g) => {
          const prim = g.members.find(m => m.is_primary);
          const dups = g.members.filter(m => m.id !== prim?.id);
          return (
            <div key={g.name} className="bg-[var(--bg-surface)] border border-[var(--border)]">
              <div className="px-3 py-2 bg-[var(--bg-card)] border-b border-[var(--border)]">
                <div className="text-xs font-medium text-[var(--text-primary)]">{g.name}</div>
                <div className="text-[9px] text-[var(--text-muted)] font-pixel">{g.count} نسخة</div>
              </div>
              {g.members.map((m) => {
                const key = getGroupKey(g, m);
                const isChecked = selected.has(key);
                const isPrimary = m.is_primary;
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2 px-3 py-1.5 text-[10px] font-pixel cursor-pointer hover:bg-[var(--bg-card)] ${isPrimary ? 'bg-green-900/20' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleMember(g, m)}
                      disabled={isPrimary}
                      className="accent-[var(--accent)]"
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className={`${isPrimary ? 'text-green-400' : 'text-[var(--text-secondary)]'}`}>
                        {isPrimary ? '⭐ أصلي' : '🗑️ مكرر'}
                      </span>
                      <span className="text-[var(--text-muted)]">رقم {m.id}</span>
                      <span className="text-[var(--text-muted)]">({m.book_count} كتب)</span>
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
