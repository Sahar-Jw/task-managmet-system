'use client';

import { uiText } from '@/lib/ui-text';


import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ApiError } from '@/lib/api';
import { SettingsApi } from '@/lib/endpoints';
import { useListLabels } from '@/lib/list-labels-context';
import type { Setting, SettingType } from '@/lib/types';

const CATEGORIES: { value: SettingType; labelEn: string; labelAr: string }[] = [
  { value: 'task_status', labelEn: uiText(false, 'text0141'), labelAr: uiText(true, 'text0141') },
  { value: 'task_type', labelEn: uiText(false, 'text0722'), labelAr: uiText(true, 'text0722') },
  { value: 'task_priority', labelEn: uiText(false, 'text0723'), labelAr: uiText(true, 'text0723') },
  { value: 'project_status', labelEn: uiText(false, 'text0724'), labelAr: uiText(true, 'text0724') },
];

const CATEGORY_LABEL_KEYS: Record<string, Parameters<typeof uiText>[1]> = {
  task_status: 'text0141',
  task_type: 'text0722',
  task_priority: 'text0723',
  project_status: 'text0724',
};

/** One row: a single input matching the active locale, plus Save/Delete. */
function ListRow({
  row,
  locale,
  onSaved,
  onDeleted,
}: {
  row: Setting;
  locale: string;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const currentLabel = locale === 'ar' ? row.codeAr : row.codeEn;
  const [value, setValue] = useState(currentLabel);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dirty = value.trim() !== currentLabel;

  async function save() {
    if (!value.trim() || !dirty) return;
    setBusy(true);
    setError('');
    try {
      await SettingsApi.update(row.id, locale === 'ar' ? { codeAr: value.trim() } : { codeEn: value.trim() });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(locale === 'ar', 'text0919'));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    try {
      await SettingsApi.remove(row.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(locale === 'ar', 'text0920'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        className="input flex-1"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
      {!row.isActive && (
        <span className="badge shrink-0 bg-slate-100 text-slate-500">
          {uiText(locale === 'ar', 'text0230')}
        </span>
      )}
      <button
        type="button"
        className="btn-secondary shrink-0"
        disabled={busy || !dirty}
        onClick={save}
      >
        {uiText(locale === 'ar', 'text0231')}
      </button>
      {row.isSystem ? (
        <span
          className="shrink-0 text-xs text-slate-400"
          title={
            uiText(locale === 'ar', 'text0634')
          }
        >
          {uiText(locale === 'ar', 'text0232')}
        </span>
      ) : row.isActive ? (
        <button type="button" className="btn-secondary shrink-0 text-red-600" disabled={busy} onClick={remove}>
          {uiText(locale === 'ar', 'text0038')}
        </button>
      ) : (
        <button
          type="button"
          className="btn-secondary shrink-0"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError('');
            try {
              await SettingsApi.update(row.id, { isActive: true });
              onSaved();
            } catch (err) {
              setError(err instanceof ApiError ? err.message : uiText(locale === 'ar', 'text0921'));
            } finally {
              setBusy(false);
            }
          }}
        >
          {uiText(locale === 'ar', 'text0403')}
        </button>
      )}
      </div>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function ListSettingsTab() {
  const locale = useLocale();
  const isAr = locale === 'ar';
  const { refreshListLabels } = useListLabels();
  const [category, setCategory] = useState<SettingType>('task_status');
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await SettingsApi.list(category);
      setRows(data);
      // Keep every badge/dropdown across the app in sync with whatever
      // just changed here, without needing a full page reload.
      refreshListLabels();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isAr, 'text0922'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  async function addRow(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    setAdding(true);
    setError('');
    try {
      // Only the active language gets saved — the other stays blank, so
      // this entry won't appear at all while the app is in that language,
      // until it's edited from there later to add that translation.
      await SettingsApi.create({
        type: category,
        codeAr: isAr ? newLabel.trim() : undefined,
        codeEn: isAr ? undefined : newLabel.trim(),
      });
      setNewLabel('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isAr, 'text0923'));
    } finally {
      setAdding(false);
    }
  }

  // Only show entries that actually have a label in the language the app
  // is currently in — an Arabic-only entry stays invisible while in
  // English, and vice versa.
  const visibleRows = rows.filter((r) => (isAr ? r.codeAr : r.codeEn));

  return (
    <div className="space-y-6" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="flex max-w-full gap-1 overflow-x-auto border-b border-slate-200">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              category === c.value
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {uiText(isAr, CATEGORY_LABEL_KEYS[c.value])}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {uiText(isAr, 'text0635')}
      </p>

      <form onSubmit={addRow} className="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:p-4">
        <input
          className="input flex-1"
          dir={isAr ? 'rtl' : 'ltr'}
          placeholder={uiText(isAr, 'text0233')}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          disabled={adding}
        />
        <button type="submit" className="btn-primary w-full shrink-0 sm:w-auto" disabled={adding || !newLabel.trim()}>
          {uiText(isAr, 'text0169')}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card p-4">
        {loading ? (
          <p className="p-6 text-center text-slate-500">{uiText(isAr, 'text0234')}</p>
        ) : visibleRows.length === 0 ? (
          <p className="p-6 text-center text-slate-500">{uiText(isAr, 'text0636')}</p>
        ) : (
          visibleRows.map((row) => (
            <ListRow key={row.id} row={row} locale={locale} onSaved={load} onDeleted={load} />
          ))
        )}
      </div>
    </div>
  );
}
