import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = ['claude', 'gpt', 'gemini'];
const STORAGE_KEY = 'ai-arena-theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return THEMES.includes(s) ? s : 'claude';
    } catch {
      return 'claude';
    }
  });

  // Sync data-theme attribute and storage on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Set on initial render (before first effect)
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function setTheme(t) {
    if (THEMES.includes(t)) setThemeState(t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
