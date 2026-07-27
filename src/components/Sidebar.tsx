import { useState, useMemo, useCallback, memo } from 'react';
import { Category, DbStats, Book } from '../types';
import { HistoryPanel } from './HistoryPanel';
import { BookmarksPanel } from './BookmarksPanel';
import { NotesPanel } from './NotesPanel';

interface SidebarProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  onOpenBook: (book: Book) => void;
  onOpenServices: () => void;
  stats: DbStats | null;
}

type SidebarTab = 'categories' | 'history' | 'bookmarks' | 'notes';

interface TreeNode {
  id: number;
  name: string;
  children: TreeNode[];
  leaf?: boolean;
}

function getSectionChildren(sectionId: number, allCats: Category[]): Category[] {
  const sec = allCats.find(c => c.id === sectionId);
  if (!sec) return [];
  const siblings = allCats.filter(c => c.level === sec.level).sort((a, b) => a.order_num - b.order_num);
  const idx = siblings.findIndex(c => c.id === sectionId);
  const startOrder = sec.order_num;
  const endOrder = (idx >= 0 && idx + 1 < siblings.length) ? siblings[idx + 1].order_num + 1 : 999999;
  return allCats
    .filter(c => c.level === sec.level + 1 && c.id !== sectionId && c.order_num >= startOrder && c.order_num < endOrder)
    .sort((a, b) => a.order_num - b.order_num);
}

interface TreeNodeItemProps {
  node: TreeNode;
  depth: number;
  selectedCategoryId: number | null;
  expanded: ReadonlySet<number>;
  onSelectCategory: (id: number | null) => void;
  onToggle: (id: number) => void;
}

const TreeNodeItem = memo(function TreeNodeItem({
  node,
  depth,
  selectedCategoryId,
  expanded,
  onSelectCategory,
  onToggle,
}: TreeNodeItemProps) {
  if (node.leaf) {
    const isSelected = selectedCategoryId === node.id;
    return (
      <button
        key={node.id}
        onClick={() => onSelectCategory(node.id)}
        className={`w-full text-start flex items-center gap-1 pixel-btn ${
          isSelected
            ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
            : 'text-[var(--text-secondary)]'
        } py-1 text-xs`}
        style={{ paddingInlineEnd: '0.75rem', paddingInlineStart: `${0.75 + depth * 0.5}rem` }}
      >
        <span className="w-3 shrink-0" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  const isExpanded = expanded.has(node.id);
  const isSelected = node.id !== 0 && selectedCategoryId === node.id;
  const isProgramRoot = node.id === 0;

  return (
    <div key={node.id}>
      <button
        onClick={() => {
          if (!isProgramRoot) onSelectCategory(node.id);
          onToggle(node.id);
        }}
        className={`w-full text-start flex items-center gap-1 pixel-btn ${
          isSelected
            ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
            : depth === 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
        } ${depth === 0 ? 'px-3 py-1.5 text-xs' : 'py-1 text-xs'}`}
        style={depth > 0 ? { paddingInlineEnd: '0.75rem', paddingInlineStart: `${0.75 + depth * 0.5}rem` } : undefined}
      >
        <span className={`text-[10px] shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <span className={`truncate ${depth === 0 ? 'font-medium' : ''}`}>{node.name}</span>
      </button>
      {isExpanded && node.children.length > 0 && (
        <div className={depth === 0 ? '' : 'bg-[var(--bg-card)]'}>
          {node.children.map(child => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedCategoryId={selectedCategoryId}
              expanded={expanded}
              onSelectCategory={onSelectCategory}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export const Sidebar = memo(function Sidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onOpenBook,
  onOpenServices,
  stats,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<SidebarTab>('categories');

  const programTree = useMemo((): TreeNode => {
    const section50074 = categories.find(c => c.id === 50074);
    const subIds = [50029, 50044, 50028];

    const siteSubs = subIds.map(sid => {
      const sub = categories.find(c => c.id === sid);
      const subChildren = getSectionChildren(sid, categories);
      return {
        id: sid,
        name: sub?.name || '',
        children: subChildren.map(c => ({ id: c.id, name: c.name || '', children: [], leaf: true })),
        leaf: false,
      };
    }).filter(s => s.name);

    return {
      id: 0,
      name: 'كتب البرنامج',
      children: [{
        id: 50074,
        name: section50074?.name || 'كتب الموقع الرسمي للشاملة الإباضية',
        children: siteSubs,
        leaf: false,
      }],
      leaf: false,
    };
  }, [categories]);

  const toggle = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectCategory = useCallback((id: number | null) => {
    onSelectCategory(id);
  }, [onSelectCategory]);

  const tabs: { key: SidebarTab; label: string }[] = [
    { key: 'categories', label: 'التصنيفات' },
    { key: 'history', label: 'السجل' },
    { key: 'bookmarks', label: 'العلامات' },
    { key: 'notes', label: 'ملاحظات' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b-2 border-[var(--border)] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-[10px] font-pixel transition-colors ${
              activeTab === tab.key
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
            style={{ lineHeight: '1.8' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'history' ? (
          <HistoryPanel onOpenBook={onOpenBook} />
        ) : activeTab === 'bookmarks' ? (
          <BookmarksPanel onOpenBook={onOpenBook} />
        ) : activeTab === 'notes' ? (
          <NotesPanel onOpenBook={onOpenBook} />
        ) : (
          <div className="flex flex-col">
            {stats && (
              <div className="px-3 py-2 border-b-2 border-[var(--border)] bg-[var(--bg-card-alt)] shrink-0">
                <div className="flex justify-around text-center">
                  <div className="stat-block">
                    <div className="stat-value">{stats.books.toLocaleString('ar')}</div>
                    <div className="stat-label">كتاب</div>
                  </div>
                  <div className="stat-block">
                    <div className="stat-value">{stats.authors.toLocaleString('ar')}</div>
                    <div className="stat-label">مؤلف</div>
                  </div>
                  <div className="stat-block">
                    <div className="stat-value">{stats.withContent.toLocaleString('ar')}</div>
                    <div className="stat-label">نص</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => onSelectCategory(null)}
              className={`w-full text-start px-3 py-2 text-xs pixel-btn border-b-2 border-[var(--border)] shrink-0 ${
                selectedCategoryId === null
                  ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-medium'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <span className="ms-1">📚</span>
              <span>جميع الكتب</span>
            </button>

            <button
              onClick={onOpenServices}
              className="w-full text-start px-3 py-2 text-xs pixel-btn border-b-2 border-[var(--border)] shrink-0 text-[var(--text-secondary)]"
            >
              <span className="ms-1">🛠️</span>
              <span>خدمات</span>
            </button>

            <div className="border-b-2 border-[var(--border)]">
              <TreeNodeItem
                node={programTree}
                depth={0}
                selectedCategoryId={selectedCategoryId}
                expanded={expanded}
                onSelectCategory={handleSelectCategory}
                onToggle={toggle}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
