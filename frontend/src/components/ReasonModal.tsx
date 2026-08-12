'use client';

import { useEffect, useState } from 'react';

export default function ReasonModal({
  open,
  title,
  description,
  minLength = 0,
  confirmLabel = 'Confirm',
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
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
          placeholder={minLength > 0 ? `At least ${minLength} characters…` : 'Optional…'}
        />
        {touched && tooShort && (
          <p className="mt-1 text-sm text-red-600">
            {minLength > 0
              ? `Please enter at least ${minLength} characters (currently ${trimmed.length}).`
              : 'This field is required.'}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
