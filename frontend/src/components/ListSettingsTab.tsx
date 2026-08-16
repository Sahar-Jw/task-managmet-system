'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { ApiError } from '@/lib/api';
import { SettingsApi } from '@/lib/endpoints';
import { useListLabels } from '@/lib/list-labels-context';
import type { Setting, SettingType } from '@/lib/types';

const CATEGORIES: { value: SettingType; labelEn: string; labelAr: string }[] = [
  { value: 'task_status', labelEn: 'Task Status', labelAr: 'حالة المهمة' },
  { value: 'task_type', labelEn: 'Task Type', labelAr: 'نوع المهمة' },
  { value: 'task_priority', labelEn: 'Task Priority', labelAr: 'أولوية المهمة' },
  { value: 'project_status', labelEn: 'Project Status', labelAr: 'حالة المشروع' },
];

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
      setError(err instanceof ApiError ? err.message : 'Could not save.');
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
      setError(err instanceof ApiError ? err.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2 border-b border-slate-100 py-2 last:border-0">
      <input
        className="input flex-1"
        dir={locale === 'ar' ? 'rtl' : 'ltr'}
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
      />
      {!row.isActive && (
        <span className="badge shrink-0 bg-slate-100 text-slate-500">
          {locale === 'ar' ? 'محذوف' : 'Deleted'}
        </span>
      )}
      <button
        type="button"
        className="btn-secondary shrink-0"
        disabled={busy || !dirty}
        onClick={save}
      >
        {locale === 'ar' ? 'حفظ' : 'Save'}
      </button>
      {row.isSystem ? (
        <span
          className="shrink-0 text-xs text-slate-400"
          title={
            locale === 'ar'
              ? 'قيمة أساسية يعتمد عليها النظام — يمكن تعديل النص فقط'
              : "Built-in — used by the app's workflow, text only can be edited"
          }
        >
          {locale === 'ar' ? 'أساسي' : 'Built-in'}
        </span>
      ) : row.isActive ? (
        <button type="button" className="btn-secondary shrink-0 text-red-600" disabled={busy} onClick={remove}>
          {locale === 'ar' ? 'حذف' : 'Delete'}
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
              setError(err instanceof ApiError ? err.message : 'Could not restore.');
            } finally {
              setBusy(false);
            }
          }}
        >
          {locale === 'ar' ? 'استعادة' : 'Restore'}
        </button>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
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
      setError(err instanceof ApiError ? err.message : 'Could not load.');
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
      setError(err instanceof ApiError ? err.message : 'Could not add.');
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
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
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
            {isAr ? c.labelAr : c.labelEn}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {isAr
          ? 'يتم عرض وتعديل النص بلغة الواجهة الحالية فقط. القيم الأساسية (المستخدمة في سير العمل) يمكن تعديل نصها لكن لا يمكن حذفها.'
          : "Text is shown and edited in the interface's current language only. Built-in values (used by the app's workflow) can be relabeled but not deleted."}
      </p>

      <form onSubmit={addRow} className="card flex items-center gap-2 p-4">
        <input
          className="input flex-1"
          dir={isAr ? 'rtl' : 'ltr'}
          placeholder={isAr ? 'أضف قيمة جديدة…' : 'Add a new value…'}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          disabled={adding}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={adding || !newLabel.trim()}>
          {isAr ? 'إضافة' : 'Add'}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card p-4">
        {loading ? (
          <p className="p-6 text-center text-slate-500">{isAr ? 'جارٍ التحميل…' : 'Loading…'}</p>
        ) : visibleRows.length === 0 ? (
          <p className="p-6 text-center text-slate-500">{isAr ? 'لا توجد عناصر بعد.' : 'No entries yet.'}</p>
        ) : (
          visibleRows.map((row) => (
            <ListRow key={row.id} row={row} locale={locale} onSaved={load} onDeleted={load} />
          ))
        )}
      </div>
    </div>
  );
}
