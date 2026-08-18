'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemeColors = {
  primary: string;
  primaryText: string;
  pageBackground: string;
  surface: string;
  bodyText: string;
};

export const DEFAULT_THEME: ThemeColors = {
  primary: '#3364b8',
  primaryText: '#ffffff',
  pageBackground: '#f8fafc',
  surface: '#ffffff',
  bodyText: '#0f172a',
};

export const DEFAULT_DARK_THEME: ThemeColors = {
  primary: '#4f83db',
  primaryText: '#ffffff',
  pageBackground: '#0f172a',
  surface: '#1e293b',
  bodyText: '#e2e8f0',
};

const STORAGE_KEY = 'task-manager-theme';
const DARK_STORAGE_KEY = 'task-manager-theme-dark';
const MODE_STORAGE_KEY = 'task-manager-color-mode';

export type ColorMode = 'light' | 'dark';

type ThemeContextValue = {
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetTheme: () => void;
  mode: ColorMode;
  setMode: (mode: ColorMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function hexToRgb(hex: string) {
  const cleanHex = hex.replace('#', '');

  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixColor(hex: string, target: string, amount: number) {
  const source = hexToRgb(hex);
  const targetRgb = hexToRgb(target);

  return rgbToHex(
    source.r + (targetRgb.r - source.r) * amount,
    source.g + (targetRgb.g - source.g) * amount,
    source.b + (targetRgb.b - source.b) * amount,
  );
}

function applyTheme(colors: ThemeColors, mode: ColorMode) {
  const root = document.documentElement;

  root.dataset.colorMode = mode;
  root.style.colorScheme = mode;

  root.style.setProperty('--theme-primary', colors.primary);
  root.style.setProperty('--theme-primary-text', colors.primaryText);
  root.style.setProperty('--theme-page-background', colors.pageBackground);
  root.style.setProperty('--theme-surface', colors.surface);
  root.style.setProperty('--theme-body-text', colors.bodyText);

  /*
   * Your website already uses Tailwind classes such as:
   *
   * bg-brand-50
   * bg-brand-100
   * border-brand-200
   * bg-brand-500
   * hover:bg-brand-600
   * text-brand-700
   * text-brand-900
   *
   * Only one primary color is exposed in Settings.
   * These variants are generated automatically.
   */

  root.style.setProperty(
    '--theme-primary-lightest',
    mixColor(colors.primary, '#ffffff', 0.93),
  );

  root.style.setProperty(
    '--theme-primary-lighter',
    mixColor(colors.primary, '#ffffff', 0.82),
  );

  root.style.setProperty(
    '--theme-primary-light',
    mixColor(colors.primary, '#ffffff', 0.62),
  );

  root.style.setProperty(
    '--theme-primary-dark',
    mixColor(colors.primary, '#000000', 0.18),
  );

  root.style.setProperty(
    '--theme-primary-darker',
    mixColor(colors.primary, '#000000', 0.32),
  );

  root.style.setProperty(
    '--theme-primary-darkest',
    mixColor(colors.primary, '#000000', 0.55),
  );
}

function normalizeColors(value: string | null, fallback: ThemeColors): ThemeColors {
  if (!value) return { ...fallback };

  const parsed = JSON.parse(value) as Partial<ThemeColors>;
  return {
    primary: typeof parsed.primary === 'string' ? parsed.primary : fallback.primary,
    primaryText: typeof parsed.primaryText === 'string' ? parsed.primaryText : fallback.primaryText,
    pageBackground: typeof parsed.pageBackground === 'string' ? parsed.pageBackground : fallback.pageBackground,
    surface: typeof parsed.surface === 'string' ? parsed.surface : fallback.surface,
    bodyText: typeof parsed.bodyText === 'string' ? parsed.bodyText : fallback.bodyText,
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [lightColors, setLightColors] = useState<ThemeColors>(DEFAULT_THEME);
  const [darkColors, setDarkColors] = useState<ThemeColors>(DEFAULT_DARK_THEME);
  const [mode, setModeState] = useState<ColorMode>('light');
  const colors = mode === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    try {
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
      const savedLightColors = normalizeColors(localStorage.getItem(STORAGE_KEY), DEFAULT_THEME);
      const savedDarkColors = normalizeColors(localStorage.getItem(DARK_STORAGE_KEY), DEFAULT_DARK_THEME);

      setLightColors(savedLightColors);
      setDarkColors(savedDarkColors);
      setModeState(storedMode);
      applyTheme(storedMode === 'dark' ? savedDarkColors : savedLightColors, storedMode);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedLightColors));
      localStorage.setItem(DARK_STORAGE_KEY, JSON.stringify(savedDarkColors));
    } catch {
      applyTheme(DEFAULT_THEME, 'light');
    }
  }, []);

  function setColors(nextColors: ThemeColors) {
    if (mode === 'dark') {
      setDarkColors(nextColors);
    } else {
      setLightColors(nextColors);
    }
    applyTheme(nextColors, mode);

    try {
      localStorage.setItem(
        mode === 'dark' ? DARK_STORAGE_KEY : STORAGE_KEY,
        JSON.stringify(nextColors),
      );
    } catch {
      /*
       * The theme still works for the current session even if
       * localStorage is unavailable.
       */
    }
  }

  function updateColor(
    key: keyof ThemeColors,
    value: string,
  ) {
    setColors({ ...colors, [key]: value });
  }

  function resetTheme() {
    setColors(mode === 'dark' ? DEFAULT_DARK_THEME : DEFAULT_THEME);
  }

  function setMode(nextMode: ColorMode) {
    setModeState(nextMode);
    applyTheme(nextMode === 'dark' ? darkColors : lightColors, nextMode);
    try {
      localStorage.setItem(MODE_STORAGE_KEY, nextMode);
    } catch {
      // The selected mode still works for the current session.
    }
  }

  function toggleMode() {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }

  const value = useMemo(
    () => ({
      colors,
      setColors,
      updateColor,
      resetTheme,
      mode,
      setMode,
      toggleMode,
    }),
    [colors, mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider',
    );
  }

  return context;
}
