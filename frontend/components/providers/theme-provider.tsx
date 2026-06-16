'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { Moon, Sun } from 'lucide-react';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}

export function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-gray-700" />
      )}
    </button>
  );
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemIsDark = useSyncExternalStore(
    subscribeToColorScheme,
    getColorSchemeSnapshot,
    getServerColorSchemeSnapshot
  );
  const [themeOverride, setThemeOverride] = useState<boolean | null>(null);
  const isDark = themeOverride ?? systemIsDark;


  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const toggleTheme = () => setThemeOverride((current) => !(current ?? isDark));

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function getColorSchemeSnapshot() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getServerColorSchemeSnapshot() {
  return false;
}

function subscribeToColorScheme(callback: () => void) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', callback);

  return () => mediaQuery.removeEventListener('change', callback);
}
