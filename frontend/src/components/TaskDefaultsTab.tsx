'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { SettingsApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import type { Setting } from '@/lib/types';
import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';

const DEFAULT_DEADLINE_DAYS_KEY = 'DEFAULT_DEADLINE_DAYS';
const MAX_ATTACHMENT_SIZE_KEY = 'MAX_ATTACHMENT_SIZE_MB';

type NumberSettingRowProps = {
  setting: Setting;
  isArabic: boolean;
  unit: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberSettingRow({
  setting,
  isArabic,
  unit,
  value,
  onChange,
}: NumberSettingRowProps) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <label className="text-sm font-medium text-slate-700">
        {isArabic ? setting.codeAr || setting.codeEn : setting.codeEn || setting.codeAr}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          step={1}
          className="input w-28"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-sm text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

export default function TaskDefaultsTab() {
  const isArabic = useLocale() === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [deadlineSetting, setDeadlineSetting] = useState<Setting | null>(null);
  const [attachmentSetting, setAttachmentSetting] = useState<Setting | null>(null);

  const [deadlineDays, setDeadlineDays] = useState('3');
  const [attachmentSizeMb, setAttachmentSizeMb] = useState('25');

  async function load() {
    setLoading(true);
    setError('');

    try {
      const rows = await SettingsApi.list('project_setting', true);

      const deadline = rows.find((row) => row.key === DEFAULT_DEADLINE_DAYS_KEY) || null;
      const attachment = rows.find((row) => row.key === MAX_ATTACHMENT_SIZE_KEY) || null;

      setDeadlineSetting(deadline);
      setAttachmentSetting(attachment);

      if (deadline?.valueNumber !== undefined && deadline?.valueNumber !== null) {
        setDeadlineDays(String(Number(deadline.valueNumber)));
      }

      if (attachment?.valueNumber !== undefined && attachment?.valueNumber !== null) {
        setAttachmentSizeMb(String(Number(attachment.valueNumber)));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text1080'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isValidWholeNumber(value: string) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1;
  }

  const deadlineValid = isValidWholeNumber(deadlineDays);
  const attachmentValid = isValidWholeNumber(attachmentSizeMb);

  async function save() {
    setError('');
    setNotice('');

    if (!deadlineValid || !attachmentValid) {
      setError(uiText(isArabic, 'text1079'));
      return;
    }

    if (!deadlineSetting || !attachmentSetting) {
      return;
    }

    setSaving(true);

    try {
      await Promise.all([
        SettingsApi.update(deadlineSetting.id, {
          valueType: 'number',
          valueNumber: Number(deadlineDays),
        }),

        SettingsApi.update(attachmentSetting.id, {
          valueType: 'number',
          valueNumber: Number(attachmentSizeMb),
        }),
      ]);

      setNotice(uiText(isArabic, 'text0228'));

      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text1080'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <InlineLoader />;
  }

  return (
    <div className="card max-w-2xl p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {uiText(isArabic, 'text1077')}
      </h2>

      <p className="mt-1 text-xs text-slate-400">{uiText(isArabic, 'text1078')}</p>

      <div className="mt-4">
        {deadlineSetting && (
          <NumberSettingRow
            setting={deadlineSetting}
            isArabic={isArabic}
            unit={uiText(isArabic, 'text1081')}
            value={deadlineDays}
            onChange={setDeadlineDays}
          />
        )}

        {attachmentSetting && (
          <NumberSettingRow
            setting={attachmentSetting}
            isArabic={isArabic}
            unit={uiText(isArabic, 'text1082')}
            value={attachmentSizeMb}
            onChange={setAttachmentSizeMb}
          />
        )}
      </div>

      {error && <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {notice && !error && (
        <p className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-600">{notice}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="btn-primary disabled:opacity-50"
          disabled={saving || !deadlineValid || !attachmentValid}
          onClick={save}
        >
          {uiText(isArabic, 'text0231')}
        </button>
      </div>
    </div>
  );
}
