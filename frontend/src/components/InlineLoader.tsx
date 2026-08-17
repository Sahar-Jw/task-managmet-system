'use client';

import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';

export default function InlineLoader({ className = '' }: { className?: string }) {
  const isArabic = useLocale() === 'ar';

  return (
    <div
      className={`flex min-h-24 items-center justify-center gap-3 text-sm text-slate-500 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span
        className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-brand-600"
        aria-hidden="true"
      />
      <span>{uiText(isArabic, 'text0105')}</span>
    </div>
  );
}
