'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { SettingsApi } from './endpoints';
import { useAuth } from './auth-context';
import type { Setting, SettingType } from './types';

type ListLabelsMap = Record<string, Record<string, Setting>>; // type -> key -> row

export const FALLBACK_LIST_LABELS: Record<string, Record<string, string>> = {
  task_status: {
    Pending: 'قيد الانتظار',
    Unassigned: 'غير مسند',
    InProgress: 'قيد التنفيذ',
    PendingApproval: 'قيد الموافقة',
    Completed: 'مكتمل',
    Reopened: 'إعادة فتح',
    Finished: 'منتهي',
    Archived: 'مؤرشف',
    Planned: 'مخطط',
    Active: 'نشط',
    PendingAcceptance: 'قيد القبول',
    Accepted: 'مقبول',
    Rejected: 'مرفوض',
    Reassigned: 'إعادة تعيين',
  },
  task_priority: {
    Low: 'منخفض',
    Medium: 'متوسط',
    High: 'عالي',
    Critical: 'حرج',
  },
  task_type: {
    General: 'عام',
    Administrative: 'إداري',
    Financial: 'مالي',
    Technical: 'تقني',
    Maintenance: 'صيانة',
    HR: 'الموارد البشرية',
    Procurement: 'المشتريات',
    Other: 'أخرى',
  },
  project_status: {
    Active: 'نشط',
    Archived: 'مؤرشف',
    Completed: 'مكتمل',
  },
};

export function getFallbackListLabel(type: SettingType, key: string, locale: string) {
  const label = FALLBACK_LIST_LABELS[type]?.[key];
  if (!label) return key;
  return locale === 'ar' ? label : key;
}

interface ListLabelsContextValue {
  /** Resolves a status/type/priority machine key to its label in the
   * current interface language. Falls back to a predefined Arabic label when
   * the list entry is not available yet or the key is a legacy enum value. */
  getLabel: (type: SettingType, key: string) => string;
  /** Call after adding/editing/deleting an entry on the Statuses & Types
   * tab so every badge/label across the app picks up the change without
   * needing a full page reload. */
  refreshListLabels: () => Promise<void>;
}

const LIST_TYPES: SettingType[] = ['task_status', 'task_type', 'task_priority', 'project_status'];

const ListLabelsContext = createContext<ListLabelsContextValue | null>(null);

export function ListLabelsProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const { user } = useAuth();
  const [map, setMap] = useState<ListLabelsMap>({});

  const refreshListLabels = useCallback(async () => {
    try {
      const results = await Promise.all(LIST_TYPES.map((type) => SettingsApi.list(type)));
      const next: ListLabelsMap = {};
      LIST_TYPES.forEach((type, i) => {
        next[type] = {};
        for (const row of results[i]) {
          if (row.key) next[type][row.key] = row;
        }
      });
      setMap(next);
    } catch {
      // Keep whatever we had — badges just keep showing raw keys/last-known
      // labels rather than breaking the page.
    }
  }, []);

  useEffect(() => {
    // GET /settings requires a logged-in User — only fetch once auth has
    // resolved, and re-fetch on login (e.g. switching accounts).
    if (user) refreshListLabels();
  }, [user, refreshListLabels]);

  const getLabel = useCallback(
    (type: SettingType, key: string) => {
      const row = map[type]?.[key];
      if (!row) return getFallbackListLabel(type, key, locale);
      const label = locale === 'ar' ? row.codeAr : row.codeEn;
      // No label in the current language (e.g. it was only ever added in
      // the other one) — fall back to the raw key rather than showing
      // nothing or the wrong language's text.
      return label || key;
    },
    [map, locale],
  );

  return (
    <ListLabelsContext.Provider value={{ getLabel, refreshListLabels }}>{children}</ListLabelsContext.Provider>
  );
}

export function useListLabels() {
  const ctx = useContext(ListLabelsContext);
  if (!ctx) throw new Error('useListLabels must be used within ListLabelsProvider');
  return ctx;
}
