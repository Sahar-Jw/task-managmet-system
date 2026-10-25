'use client';

import { useEffect, useState } from 'react';

import './globals.css';
import ErrorScreen from '@/components/ErrorScreen';
import enMessages from '@/i18n/messages/en.json';
import arMessages from '@/i18n/messages/ar.json';
import { readLocaleCookie, toggleLocale } from '@/lib/toggle-locale';

/**
 * Last line of defence: runs when the root layout / providers themselves crash.
 * It replaces the whole document, so it must supply <html>/<body> and cannot
 * use any context (auth, branding, dictionary). Copy comes straight from the
 * bundled JSON and the locale from the cookie.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<'ar' | 'en'>('ar');

  useEffect(() => {
    setLocale(readLocaleCookie());
    console.error(error);
  }, [error]);

  const isArabic = locale === 'ar';
  const t = (isArabic ? arMessages : enMessages).errorPages;

  return (
    <html lang={locale} dir={isArabic ? 'rtl' : 'ltr'}>
      <body>
        <ErrorScreen
          tone="warning"
          isArabic={isArabic}
          badge={t.error.badge}
          title={t.error.title}
          description={t.error.description}
          header={{
            siteName: 'Task & Project Manager',
            homeHref: '/',
            languageLabel: t.actions.switchLanguage,
            onToggleLanguage: () => toggleLocale(locale),
          }}
          actions={
            <>
              <button type="button" onClick={reset} className="btn-primary min-h-[40px] px-6 text-sm">
                {t.actions.tryAgain}
              </button>
              <a href="/" className="btn-secondary min-h-[40px] px-6 text-sm">
                {t.actions.goHome}
              </a>
            </>
          }
          footer={
            error.digest ? (
              <p>
                {t.error.reference}:{' '}
                <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                  {error.digest}
                </code>
              </p>
            ) : undefined
          }
        />
      </body>
    </html>
  );
}
