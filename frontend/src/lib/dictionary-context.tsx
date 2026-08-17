'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useLocale } from 'next-intl';
import enMessages from '@/i18n/messages/en.json';
import arMessages from '@/i18n/messages/ar.json';
import { DictionaryApi } from '@/lib/endpoints';
import { setUiTextOverrides } from '@/lib/ui-text';
import type { DictionaryEntry } from '@/lib/types';

interface MessageTree {
  [key: string]: string | MessageTree;
}

function flattenMessages(
  tree: MessageTree,
  prefix = '',
  result: Record<string, string> = {},
) {
  Object.entries(tree).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      result[path] = value;
    } else {
      flattenMessages(value, path, result);
    }
  });
  return result;
}

export const DEFAULT_EN_DICTIONARY = flattenMessages(
  enMessages as MessageTree,
);
export const DEFAULT_AR_DICTIONARY = flattenMessages(
  arMessages as MessageTree,
);

type DictionaryContextValue = {
  entries: DictionaryEntry[];
  loading: boolean;
  reload: () => Promise<void>;
  text: (
    key: string,
    values?: Record<string, string | number>,
  ) => string;
};

const DictionaryContext = createContext<DictionaryContextValue | null>(null);

export function DictionaryProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const applyEntries = useCallback((rows: DictionaryEntry[]) => {
    const overrides = Object.fromEntries(
      rows.map((row) => [row.key, { textEn: row.textEn, textAr: row.textAr }]),
    );
    setUiTextOverrides(overrides);
    setEntries(rows);
  }, []);

  const reload = useCallback(async () => {
    try {
      applyEntries(await DictionaryApi.getAll());
    } catch {
      applyEntries([]);
    } finally {
      setLoading(false);
    }
  }, [applyEntries]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const overrides = useMemo(
    () => new Map(entries.map((entry) => [entry.key, entry])),
    [entries],
  );

  const text = useCallback(
    (key: string, values: Record<string, string | number> = {}) => {
      const override = overrides.get(key);
      const defaults = locale === 'ar'
        ? DEFAULT_AR_DICTIONARY
        : DEFAULT_EN_DICTIONARY;
      const template =
        (locale === 'ar' ? override?.textAr : override?.textEn) ||
        defaults[key] ||
        DEFAULT_EN_DICTIONARY[key] ||
        key;
      return Object.entries(values).reduce(
        (value, [name, replacement]) =>
          value.replaceAll(`{${name}}`, String(replacement)),
        template,
      );
    },
    [locale, overrides],
  );

  return (
    <DictionaryContext.Provider value={{ entries, loading, reload, text }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useDictionary() {
  const context = useContext(DictionaryContext);
  if (!context) {
    throw new Error('useDictionary must be used inside DictionaryProvider');
  }
  return context;
}
