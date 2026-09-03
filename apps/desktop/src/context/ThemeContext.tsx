import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  applyTheme,
  DEFAULT_THEME,
  loadTheme,
  persistTheme,
  type ThemeSettings,
} from '../lib/theme';

interface ThemeContextValue {
  theme: ThemeSettings;
  update: (patch: Partial<ThemeSettings>) => void;
  reset: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeSettings>(() => loadTheme());

  // Apply to <html> + persist whenever the settings change.
  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const update = useCallback((patch: Partial<ThemeSettings>) => {
    setTheme((cur) => ({ ...cur, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setTheme(DEFAULT_THEME);
  }, []);

  const value = useMemo(() => ({ theme, update, reset }), [theme, update, reset]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
