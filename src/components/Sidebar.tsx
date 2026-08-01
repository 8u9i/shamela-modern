import { useState, useMemo, useCallback, memo, lazy, Suspense } from 'react';
import { ChevronRight, BookOpen, Wrench, FolderTree, History, Bookmark, StickyNote } from 'lucide-react';
import { Category, DbStats, Book } from '../types';

// User-data panels (history/bookmarks/notes) load only when their tab opens.
// React.lazy needs a default export, so map the named exports explicitly.
const HistoryPanel = lazy(() => import('./HistoryPanel').then((m) => ({ default: m.HistoryPanel })));
const BookmarksPanel = lazy(() => import('./BookmarksPanel').then((m) => ({ default: m.BookmarksPanel })));
const NotesPanel = lazy(() => import('./NotesPanel').then((m) => ({ default: m.NotesPanel })));

function PanelFallback() {
  return (
    <div className="p-4">
      <div className="h-3 bg-border rounded w-3/4 mb-2 animate-pulse" />
      <div className="h-3 bg-border rounded w-1/2 animate-pulse" />
    </div>
  );
}

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
        className={`w-full text-start flex items-center gap-1.5 rounded-lg pixel-btn ${
          isSelected
            ? 'bg-primary/15 text-primary font-medium'
            : 'text-muted-foreground'
        } py-1.5 text-xs transition-colors`}
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
        className={`w-full text-start flex items-center gap-1.5 rounded-lg pixel-btn ${
          isSelected
            ? 'bg-primary/15 text-primary font-medium'
            : depth === 0 ? 'text-foreground' : 'text-muted-foreground'
        } ${depth === 0 ? 'px-2.5 py-1.5 text-xs font-medium' : 'py-1.5 text-xs'}`}
        style={depth > 0 ? { paddingInlineEnd: '0.75rem', paddingInlineStart: `${0.75 + depth * 0.5}rem` } : undefined}
      >
        <ChevronRight
          className={`w-3.5 h-3.5 shrink-0 text-muted-foreground/70 transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded && node.children.length > 0 && (
        <div className={depth === 0 ? '' : 'bg-card rounded-lg'}>
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

    // API-built DBs contain only flat level-0 speciality categories (no
    // 50074/50029/... hierarchy). Group them by name into a single list.
    if (!section50074) {
      const byName = new Map<string, Category>();
      for (const c of categories) {
        const key = c.name || 'غير مصنف';
        if (!byName.has(key)) byName.set(key, c);
      }
      const leaves = [...byName.values()]
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
        .map(c => ({ id: c.id, name: c.name || 'غير مصنف', children: [], leaf: true }));
      return {
        id: 0,
        name: 'كتب البرنامج',
        children: [{
          id: 50074,
          name: 'كتب الموقع الرسمي للشاملة الإباضية',
          children: leaves,
          leaf: false,
        }],
        leaf: false,
      };
    }

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

  const tabs: { key: SidebarTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'categories', label: 'التصنيفات', icon: FolderTree },
    { key: 'history', label: 'السجل', icon: History },
    { key: 'bookmarks', label: 'العلامات', icon: Bookmark },
    { key: 'notes', label: 'ملاحظات', icon: StickyNote },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border shrink-0 px-1 pt-1 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-medium rounded-t-lg transition-colors border-b-2 ${
                isActive
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent hover:text-secondary-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* key={activeTab}: panels mount fresh per tab so hook state never
            carries across different panel components. */}
        <Suspense key={activeTab} fallback={<PanelFallback />}>
          {activeTab === 'history' ? (
            <HistoryPanel onOpenBook={onOpenBook} />
          ) : activeTab === 'bookmarks' ? (
            <BookmarksPanel onOpenBook={onOpenBook} />
          ) : activeTab === 'notes' ? (
            <NotesPanel onOpenBook={onOpenBook} />
          ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            <div className="flex flex-col gap-1">
              {stats && (
                <div className="px-3 py-2.5 border border-border rounded-xl bg-card shrink-0 mb-1">
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
                className={`w-full text-start px-3 py-2 text-xs rounded-lg pixel-btn flex items-center gap-2 ${
                  selectedCategoryId === null
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>جميع الكتب</span>
              </button>

              <button
                onClick={onOpenServices}
                className="w-full text-start px-3 py-2 text-xs rounded-lg pixel-btn flex items-center gap-2 text-muted-foreground"
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span>خدمات</span>
              </button>

              <div className="mt-1">
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
          </div>
          )}
        </Suspense>
      </div>
    </div>
  );
});
