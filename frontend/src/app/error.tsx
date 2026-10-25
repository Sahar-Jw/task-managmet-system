'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import ErrorScreen from '@/components/ErrorScreen';
import { resolveBrandingAssetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranding } from '@/lib/branding-context';
import { useDictionary } from '@/lib/dictionary-context';
import { toggleLocale } from '@/lib/toggle-locale';

/**
 * After a new deploy, a tab that is still open asks for JS chunks whose hashed
 * file names no longer exist. That surfaces as a ChunkLoadError — not a bug the
 * user can "retry" their way out of, but a simple reload fixes it.
 */
function isStaleDeployError(error: Error) {
  return (
    error.name === 'ChunkLoadError' ||
    /Loading (CSS )?chunk [\w-]+ failed|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      error.message || '',
    )
  );
}

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const { text } = useDictionary();
  const { user, loading } = useAuth();
  const { branding } = useBranding();

  const isArabic = locale === 'ar';
  const signedIn = !loading && !!user;
  const stale = isStaleDeployError(error);
  const showDetails = process.env.NODE_ENV !== 'production';

  useEffect(() => {
    // Keep the original error visible in the browser console / monitoring hook.
    console.error(error);
  }, [error]);

  return (
    <ErrorScreen
      tone="warning"
      isArabic={isArabic}
      header={
        loading || user
          ? undefined
          : {
              siteName: branding?.siteName || 'Task & Project Manager',
              logoUrl: resolveBrandingAssetUrl(branding?.logoUrl) ?? null,
              homeHref: '/',
              languageLabel: text('errorPages.actions.switchLanguage'),
              onToggleLanguage: () => toggleLocale(locale as 'ar' | 'en'),
            }
      }
      badge={stale ? text('errorPages.update.badge') : text('errorPages.error.badge')}
      title={stale ? text('errorPages.update.title') : text('errorPages.error.title')}
      description={stale ? text('errorPages.update.description') : text('errorPages.error.description')}
      actions={
        <>
          {stale ? (
            <button type="button" onClick={() => window.location.reload()} className="btn-primary min-h-[40px] px-6 text-sm">
              {text('errorPages.update.reload')}
            </button>
          ) : (
            <button type="button" onClick={reset} className="btn-primary min-h-[40px] px-6 text-sm">
              {text('errorPages.actions.tryAgain')}
            </button>
          )}

          <Link href={signedIn ? '/dashboard' : '/'} className="btn-secondary min-h-[40px] px-6 text-sm">
            {signedIn ? text('errorPages.actions.goDashboard') : text('errorPages.actions.goHome')}
          </Link>
        </>
      }
      footer={
        <div className="space-y-3">
          {error.digest && (
            <p>
              {text('errorPages.error.reference')}:{' '}
              <code dir="ltr" className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
                {error.digest}
              </code>
            </p>
          )}

          {showDetails && (
            <details className="mx-auto max-w-full text-start">
              <summary className="cursor-pointer text-center font-medium text-slate-600">
                {text('errorPages.error.details')}
              </summary>
              <pre dir="ltr" className="mt-2 max-h-48 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-[11px] leading-5 text-slate-700">
                {error.stack || error.message}
              </pre>
            </details>
          )}
        </div>
      }
    />
  );
}
