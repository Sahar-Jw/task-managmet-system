'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';

export default function ReasonModal({
  open,
  title,
  description,
  minLength = 0,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  minLength?: number;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setValue('');
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;

  const trimmed = value.trim();
  const tooShort = trimmed.length < minLength;

  function handleConfirm() {
    if (tooShort) {
      setTouched(true);
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[100dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}

        <textarea
          autoFocus
          className="input mt-4 w-full"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={minLength > 0 ? uiText(isArabic, 'text0939', { value0: minLength }) : uiText(isArabic, 'text0940')}
        />
        {touched && tooShort && (
          <p className="mt-1 text-sm text-red-600">
            {minLength > 0
              ? uiText(isArabic, 'text0941', { value0: minLength, value1: trimmed.length })
              : uiText(isArabic, 'text0933')}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {uiText(isArabic, 'text0878')}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
          >
            {confirmLabel || uiText(isArabic, 'text0932')}
          </button>
        </div>
      </div>
    </div>
  );
}
