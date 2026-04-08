import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('cfo-theme') as Theme | null;
    if (stored) return stored;
    // Default to dark; fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('cfo-theme', theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return { theme, toggle, isDark: theme === 'dark' };
}
