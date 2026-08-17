'use client';

import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  confirmDisabled = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  if (!open) return null;

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

        <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel || uiText(isArabic, 'text0878')}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={confirmDisabled}
          >
            {confirmLabel || uiText(isArabic, 'text0932')}
          </button>
        </div>
      </div>
    </div>
  );
}
