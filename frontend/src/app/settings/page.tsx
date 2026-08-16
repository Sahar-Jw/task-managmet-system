'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ApiError } from '@/lib/api';
import { SettingsApi, type CreateSettingPayload } from '@/lib/endpoints';
import type { Setting, SettingType, SettingValueType } from '@/lib/types';
import Pagination from '@/components/Pagination';
import BrandingTab from '@/components/BrandingTab';
import ListSettingsTab from '@/components/ListSettingsTab';

const PAGE_SIZE = 10;

const TYPE_OPTIONS: { value: SettingType; label: string }[] = [
  { value: 'department', label: 'Department' },
  { value: 'branch', label: 'Branch' },
  { value: 'project_setting', label: 'Project Setting' },
];

const EMPTY_FORM = {
  codeAr: '',
  codeEn: '',
  valueType: 'string' as SettingValueType,
  valueAr: '',
  valueEn: '',
  valueNumber: '',
  address: '',
  isAdminDepartment: false,
};

function SettingsContent() {
  const [type, setType] = useState<SettingType>('department');
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [page, setPage] = useState(1);

  async function load(forType: SettingType) {
    setLoading(true);
    setError('');
    try {
      const data = await SettingsApi.list(forType);
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(type);
    setForm(EMPTY_FORM);
    setPage(1);
  }, [type]);

  const totalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1);
  const pagedRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Keep the current page in range if rows shrink (e.g. after a delete)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  async function createRow(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload: CreateSettingPayload = {
      type,
      codeAr: form.codeAr,
      codeEn: form.codeEn,
      valueType: form.valueType,
      ...(form.valueType === 'string'
        ? { valueAr: form.valueAr, valueEn: form.valueEn }
        : { valueNumber: Number(form.valueNumber) }),
      ...(type === 'branch' ? { address: form.address || undefined } : {}),
      ...(type === 'department' ? { isAdminDepartment: form.isAdminDepartment } : {}),
    };

    try {
      await SettingsApi.create(payload);
      setForm(EMPTY_FORM);
      load(type);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the row.');
    }
  }

  async function toggleActive(row: Setting) {
    setError('');
    try {
      await SettingsApi.update(row.id, { isActive: !row.isActive });
      load(type);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the row.');
    }
  }

  async function remove(row: Setting) {
    setError('');
    try {
      await SettingsApi.remove(row.id);
      load(type);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the row.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="label mb-0">Table</label>
          <select
            className="input w-56"
            value={type}
            onChange={(e) => setType(e.target.value as SettingType)}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={createRow} className="card space-y-3 p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Code (Arabic)</label>
            <input
              className="input"
              required
              dir="rtl"
              value={form.codeAr}
              onChange={(e) => setForm({ ...form, codeAr: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Code (English)</label>
            <input
              className="input"
              required
              value={form.codeEn}
              onChange={(e) => setForm({ ...form, codeEn: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">Value type</label>
          <select
            className="input w-48"
            value={form.valueType}
            onChange={(e) => setForm({ ...form, valueType: e.target.value as SettingValueType })}
          >
            <option value="string">Text (bilingual)</option>
            <option value="number">Number</option>
          </select>
        </div>

        {form.valueType === 'string' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Value (Arabic)</label>
              <input
                className="input"
                required
                dir="rtl"
                value={form.valueAr}
                onChange={(e) => setForm({ ...form, valueAr: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Value (English)</label>
              <input
                className="input"
                required
                value={form.valueEn}
                onChange={(e) => setForm({ ...form, valueEn: e.target.value })}
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="label">Value (number)</label>
            <input
              type="number"
              className="input w-48"
              required
              value={form.valueNumber}
              onChange={(e) => setForm({ ...form, valueNumber: e.target.value })}
            />
          </div>
        )}

        {type === 'branch' && (
          <div>
            <label className="label">Address (optional)</label>
            <input
              className="input"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        )}

        {type === 'department' && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.isAdminDepartment}
              onChange={(e) => setForm({ ...form, isAdminDepartment: e.target.checked })}
            />
            Admin department
          </label>
        )}

        <button type="submit" className="btn-primary">
          Add row
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No rows yet for this table.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Code (AR)</th>
                <th className="px-4 py-2">Code (EN)</th>
                <th className="px-4 py-2">Value (AR)</th>
                <th className="px-4 py-2">Value (EN)</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2" dir="rtl">
                    {row.codeAr}
                  </td>
                  <td className="px-4 py-2">{row.codeEn}</td>
                  <td className="px-4 py-2" dir="rtl">
                    {row.valueType === 'number' ? row.valueNumber : row.valueAr}
                  </td>
                  <td className="px-4 py-2">
                    {row.valueType === 'number' ? row.valueNumber : row.valueEn}
                  </td>
                  <td className="px-4 py-2">
                    {row.isActive ? (
                      <span className="badge bg-green-100 text-green-700">Active</span>
                    ) : (
                      <span className="badge bg-slate-100 text-slate-500">Inactive</span>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-2 text-right">
                    <button className="btn-secondary" onClick={() => toggleActive(row)}>
                      {row.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn-secondary text-red-600" onClick={() => remove(row)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={rows.length}
          onPageChange={setPage}
          itemLabel="rows"
        />
      )}
    </div>
  );
}

const PAGE_TABS = [
  { value: 'data', label: 'Data' },
  { value: 'branding', label: 'Branding' },
  { value: 'lists', label: 'Statuses & Types' },
] as const;
type PageTab = (typeof PAGE_TABS)[number]['value'];

function SettingsPageContent() {
  const [tab, setTab] = useState<PageTab>('data');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Settings</h1>

      <div className="flex gap-1 border-b border-slate-200">
        {PAGE_TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.value
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'data' ? <SettingsContent /> : tab === 'branding' ? <BrandingTab /> : <ListSettingsTab />}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute adminOnly>
      <SettingsPageContent />
    </ProtectedRoute>
  );
}
