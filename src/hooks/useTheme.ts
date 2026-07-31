import { useState, useCallback } from 'react';

export type Theme = 'dark' | 'light';

function readTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('shamela-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    setTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}
