import { useState, useRef, useEffect } from 'react';
import { Menu, Search, ArrowRight, Sun, Moon, Library } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
  onBack?: () => void;
  searchQuery: string;
}

export function Header({ onSearch, onToggleSidebar, onBack, searchQuery }: HeaderProps) {
  const [query, setQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    setQuery(searchQuery);
  }, [searchQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  return (
    <header className="flex items-center gap-2 px-3 py-2.5 bg-card border-b border-border shrink-0">
      <button
        onClick={onToggleSidebar}
        className="p-2 -ms-1 rounded-lg pixel-btn text-muted-foreground hover:text-foreground shrink-0"
        aria-label="تبديل القائمة الجانبية"
      >
        <Menu className="w-4 h-4" />
      </button>

      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg pixel-btn text-muted-foreground hover:text-foreground shrink-0 text-xs"
        >
          <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
          رجوع
        </button>
      )}

      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary items-center justify-center hidden sm:flex shrink-0">
          <Library className="w-4 h-4" />
        </span>
        <span className="text-muted-foreground text-xs font-medium truncate max-w-[180px]">
          المكتبة الشاملة الإباضية
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 min-w-0">
        <div className="relative">
          <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="بحث في الكتب والمؤلفين... (Ctrl+K)"
            className="w-full px-3 py-2 ps-8 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-all text-sm"
          />
        </div>
      </form>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg pixel-btn text-muted-foreground hover:text-foreground shrink-0"
        aria-label={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    </header>
  );
}
