'use client';

import { useEffect, useState } from 'react';
import { ApiError, resolveBrandingAssetUrl } from '@/lib/api';
import { BrandingApi } from '@/lib/endpoints';
import type { BrandingSettings } from '@/lib/types';
import FileInput from '@/components/FileInput';
import { useBranding } from '@/lib/branding-context';

const EMPTY_FORM = {
  siteName: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
};

/** One image slot (logo or favicon): preview + choose + upload + remove. */
function AssetField({
  label,
  hint,
  currentUrl,
  onUpload,
  onRemove,
  accept,
}: {
  label: string;
  hint: string;
  currentUrl?: string;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  accept: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await onUpload(file);
      setFile(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError('');
    try {
      await onRemove();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove.');
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = resolveBrandingAssetUrl(currentUrl);

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
          {previewUrl ? (
            // Logos/favicons are user-uploaded files served from the API's
            // own origin, not a domain Next's image optimizer is configured
            // for — a plain <img> avoids needing per-deploy config for that.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-slate-400">None</span>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs text-slate-500">{hint}</p>
          <FileInput file={file} onSelect={setFile} accept={accept} disabled={busy} />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleUpload}
              disabled={!file || busy}
            >
              {busy ? 'Uploading…' : 'Upload'}
            </button>
            {currentUrl && (
              <button
                type="button"
                className="btn-secondary text-red-600"
                onClick={handleRemove}
                disabled={busy}
              >
                Remove
              </button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default function BrandingTab() {
  const { refreshBranding } = useBranding();
  const [settings, setSettings] = useState<BrandingSettings | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await BrandingApi.get();
      setSettings(data);
      setForm({
        siteName: data.siteName ?? '',
        metaTitle: data.metaTitle ?? '',
        metaDescription: data.metaDescription ?? '',
        metaKeywords: data.metaKeywords ?? '',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load branding settings.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const updated = await BrandingApi.update(form);
      setSettings(updated);
      await refreshBranding();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save branding settings.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-6 text-center text-slate-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-800">Logo &amp; favicon</h2>
        <AssetField
          label="Site logo"
          hint="Shown in the navigation bar. PNG, JPG, WEBP, GIF, or SVG."
          currentUrl={settings?.logoUrl}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          onUpload={async (file) => {
            setSettings(await BrandingApi.uploadLogo(file));
            await refreshBranding();
          }}
          onRemove={async () => {
            setSettings(await BrandingApi.removeLogo());
            await refreshBranding();
          }}
        />
        <AssetField
          label="Favicon"
          hint="Shown as the browser tab icon. ICO or PNG works best."
          currentUrl={settings?.faviconUrl}
          accept="image/x-icon,image/png,.ico"
          onUpload={async (file) => {
            setSettings(await BrandingApi.uploadFavicon(file));
            await refreshBranding();
          }}
          onRemove={async () => {
            setSettings(await BrandingApi.removeFavicon());
            await refreshBranding();
          }}
        />
      </div>

      <form onSubmit={saveDetails} className="card space-y-4 p-6">
        <h2 className="text-sm font-semibold text-slate-800">Site name &amp; metadata</h2>

        <div>
          <label className="label">Site name</label>
          <input
            className="input"
            required
            maxLength={150}
            value={form.siteName}
            onChange={(e) => setForm({ ...form, siteName: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">
            Shown in the navigation bar next to the logo.
          </p>
        </div>

        <div>
          <label className="label">Page title (optional)</label>
          <input
            className="input"
            maxLength={150}
            value={form.metaTitle}
            onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">
            Browser tab title. Falls back to the site name when left blank.
          </p>
        </div>

        <div>
          <label className="label">Meta description (optional)</label>
          <textarea
            className="input"
            rows={3}
            maxLength={300}
            value={form.metaDescription}
            onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Meta keywords (optional)</label>
          <input
            className="input"
            maxLength={300}
            placeholder="e.g. tasks, projects, teams"
            value={form.metaKeywords}
            onChange={(e) => setForm({ ...form, metaKeywords: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">Comma-separated.</p>
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved.</span>}
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
