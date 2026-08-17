'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';
import {
  DEFAULT_AR_DICTIONARY,
  DEFAULT_EN_DICTIONARY,
  useDictionary,
} from '@/lib/dictionary-context';
import { DictionaryApi } from '@/lib/endpoints';
import { uiText } from '@/lib/ui-text';
import type { DictionaryEntry } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 40;

function placeholders(value: string) {
  return [...value.matchAll(/\{([A-Za-z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort()
    .join('|');
}

function defaultRows(): DictionaryEntry[] {
  const keys = Array.from(
    new Set([
      ...Object.keys(DEFAULT_EN_DICTIONARY),
      ...Object.keys(DEFAULT_AR_DICTIONARY),
    ]),
  ).sort();

  return keys.map((key) => ({
    key,
    textEn: DEFAULT_EN_DICTIONARY[key] || '',
    textAr: DEFAULT_AR_DICTIONARY[key] || '',
  }));
}

export default function DictionarySettingsTab() {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const { entries, loading, reload } = useDictionary();
  const [rows, setRows] = useState<DictionaryEntry[]>(defaultRows);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (dirty) return;
    const overrides = new Map(entries.map((entry) => [entry.key, entry]));
    setRows(
      defaultRows().map((row) => ({
        ...row,
        textEn: overrides.get(row.key)?.textEn || row.textEn,
        textAr: overrides.get(row.key)?.textAr || row.textAr,
      })),
    );
  }, [entries, dirty]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(locale);
    if (!query) return rows;
    return rows.filter((row) =>
      [row.key, row.textEn, row.textAr].some((value) =>
        value.toLocaleLowerCase(locale).includes(query),
      ),
    );
  }, [locale, rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage((current) => Math.min(current, pageCount));
  }, [pageCount]);

  function update(key: string, language: 'textEn' | 'textAr', value: string) {
    setRows((current) =>
      current.map((row) => row.key === key ? { ...row, [language]: value } : row),
    );
    setDirty(true);
    setNotice('');
  }

  async function save() {
    setError('');
    setNotice('');

    const invalid = rows.find((row) =>
      !row.textEn.trim() ||
      !row.textAr.trim() ||
      placeholders(row.textEn) !== placeholders(DEFAULT_EN_DICTIONARY[row.key] || '') ||
      placeholders(row.textAr) !== placeholders(DEFAULT_AR_DICTIONARY[row.key] || ''),
    );

    if (invalid) {
      setError(uiText(isArabic, 'text0836', { value0: invalid.key }));
      return;
    }

    setSaving(true);
    try {
      await DictionaryApi.replaceAll(rows);
      setDirty(false);
      await reload();
      setNotice(uiText(isArabic, 'text0834'));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : uiText(isArabic, 'text0835'));
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setRows(defaultRows());
    setDirty(true);
    setNotice('');
    setError('');
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {uiText(isArabic, 'text0825')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {uiText(isArabic, 'text0826')}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={resetDefaults}>
              {uiText(isArabic, 'text0837')}
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saving}>
              {saving ? uiText(isArabic, 'text0833') : uiText(isArabic, 'text0832')}
            </button>
          </div>
        </div>

        <input
          className="input mt-5 max-w-xl"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder={uiText(isArabic, 'text0827')}
          aria-label={uiText(isArabic, 'text0827')}
        />

        <div className="mt-3 text-xs text-slate-400">
          {uiText(isArabic, 'text0838', { value0: filtered.length, value1: rows.length })}
          {dirty && <span className="ms-3 font-medium text-amber-600">{uiText(isArabic, 'text0839')}</span>}
        </div>
      </div>

      {error && <div className="m-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="m-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {loading ? (
        <div className="p-10 text-center text-sm text-slate-500">{uiText(isArabic, 'text0105')}</div>
      ) : visible.length === 0 ? (
        <div className="p-10 text-center text-sm text-slate-500">{uiText(isArabic, 'text0840')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full border-collapse">
            <thead className="bg-slate-50 text-start text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[28%] px-5 py-3 text-start">{uiText(isArabic, 'text0828')}</th>
                <th className="w-[36%] px-5 py-3 text-start">{uiText(isArabic, 'text0829')}</th>
                <th className="w-[36%] px-5 py-3 text-start">{uiText(isArabic, 'text0830')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.key} className="border-t border-slate-100 align-top hover:bg-slate-50/50">
                  <td className="px-5 py-4"><code className="break-all text-xs text-slate-600" dir="ltr">{row.key}</code></td>
                  <td className="px-5 py-4">
                    <textarea className="input min-h-20 resize-y" dir="ltr" lang="en" value={row.textEn} onChange={(event) => update(row.key, 'textEn', event.target.value)} />
                  </td>
                  <td className="px-5 py-4">
                    <textarea className="input min-h-20 resize-y text-right" dir="rtl" lang="ar" value={row.textAr} onChange={(event) => update(row.key, 'textAr', event.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <div className="border-t border-slate-100 px-5 pb-5">
          <Pagination
            page={page}
            totalPages={pageCount}
            total={filtered.length}
            onPageChange={setPage}
            itemLabel={uiText(isArabic, 'text1017')}
          />
        </div>
      )}
    </section>
  );
}
