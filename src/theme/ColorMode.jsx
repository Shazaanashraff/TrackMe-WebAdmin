import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { buildTheme } from '../theme';

export const COLOR_MODE_STORAGE_KEY = 'webadmin-color-mode';

const ColorModeContext = createContext({ mode: 'light', toggleColorMode: () => {} });

export function useColorMode() {
  return useContext(ColorModeContext);
}

const readStoredMode = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  // First run: honour the OS preference when we can detect it, else light.
  if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(readStoredMode);

  useEffect(() => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    // Keep Tailwind's `.dark` token scope in sync with MUI's theme mode, so a
    // single toggle drives both systems while the app is mid-migration.
    const root = document.documentElement;
    root.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  const toggleColorMode = () => setMode((prev) => (prev === 'light' ? 'dark' : 'light'));

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const contextValue = useMemo(() => ({ mode, toggleColorMode }), [mode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
