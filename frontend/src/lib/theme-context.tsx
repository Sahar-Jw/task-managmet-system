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

const STORAGE_KEY = 'task-manager-theme';

type ThemeContextValue = {
  colors: ThemeColors;
  setColors: (colors: ThemeColors) => void;
  updateColor: (key: keyof ThemeColors, value: string) => void;
  resetTheme: () => void;
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

function applyTheme(colors: ThemeColors) {
  const root = document.documentElement;

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [colors, setColorsState] = useState<ThemeColors>(DEFAULT_THEME);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        applyTheme(DEFAULT_THEME);
        return;
      }

      const parsed = JSON.parse(stored) as Partial<ThemeColors>;

      /*
       * This also cleans up themes saved by the previous version.
       * For example, the old "secondary" property is simply ignored.
       */
      const savedColors: ThemeColors = {
        primary:
          typeof parsed.primary === 'string'
            ? parsed.primary
            : DEFAULT_THEME.primary,

        primaryText:
          typeof parsed.primaryText === 'string'
            ? parsed.primaryText
            : DEFAULT_THEME.primaryText,

        pageBackground:
          typeof parsed.pageBackground === 'string'
            ? parsed.pageBackground
            : DEFAULT_THEME.pageBackground,

        surface:
          typeof parsed.surface === 'string'
            ? parsed.surface
            : DEFAULT_THEME.surface,

        bodyText:
          typeof parsed.bodyText === 'string'
            ? parsed.bodyText
            : DEFAULT_THEME.bodyText,
      };

      setColorsState(savedColors);
      applyTheme(savedColors);

      /*
       * Rewrite localStorage using the new clean structure.
       */
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedColors),
      );
    } catch {
      applyTheme(DEFAULT_THEME);
    }
  }, []);

  function setColors(nextColors: ThemeColors) {
    setColorsState(nextColors);
    applyTheme(nextColors);

    try {
      localStorage.setItem(
        STORAGE_KEY,
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
    setColorsState((currentColors) => {
      const nextColors: ThemeColors = {
        ...currentColors,
        [key]: value,
      };

      applyTheme(nextColors);

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(nextColors),
        );
      } catch {
        // Ignore storage failure.
      }

      return nextColors;
    });
  }

  function resetTheme() {
    setColors(DEFAULT_THEME);
  }

  const value = useMemo(
    () => ({
      colors,
      setColors,
      updateColor,
      resetTheme,
    }),
    [colors],
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