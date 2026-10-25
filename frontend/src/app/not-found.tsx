'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

import ErrorScreen from '@/components/ErrorScreen';
import { resolveBrandingAssetUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useBranding } from '@/lib/branding-context';
import { useDictionary } from '@/lib/dictionary-context';
import { toggleLocale } from '@/lib/toggle-locale';

const DEFAULT_SITE_NAME = 'Task & Project Manager';

export default function NotFound() {
  const router = useRouter();
  const locale = useLocale() as 'ar' | 'en';
  const { text } = useDictionary();
  const { user, loading } = useAuth();
  const { branding } = useBranding();

  const isArabic = locale === 'ar';
  const signedIn = !loading && !!user;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push(signedIn ? '/dashboard' : '/');
  }

  const quickLinks = [
    { href: '/dashboard', label: text('nav.dashboard') },
    { href: '/tasks/mine', label: text('nav.myTasks') },
    { href: '/notifications', label: text('nav.notifications') },
  ];

  return (
    <ErrorScreen
      code="404"
      isArabic={isArabic}
      badge={text('errorPages.notFound.badge')}
      title={text('errorPages.notFound.title')}
      description={text('errorPages.notFound.description')}
      /* Signed-in users already have the app Navbar; visitors get a slim bar of their own. */
      header={
        loading || user
          ? undefined
          : {
              siteName: branding?.siteName || DEFAULT_SITE_NAME,
              logoUrl: resolveBrandingAssetUrl(branding?.logoUrl) ?? null,
              homeHref: '/',
              languageLabel: text('errorPages.actions.switchLanguage'),
              onToggleLanguage: () => toggleLocale(locale),
            }
      }
      actions={
        <>
          <Link
            href={signedIn ? '/dashboard' : '/'}
            className="btn-primary min-h-[40px] px-6 text-sm"
          >
            {signedIn ? text('errorPages.actions.goDashboard') : text('errorPages.actions.goHome')}
          </Link>

          {signedIn ? (
            <button type="button" onClick={goBack} className="btn-secondary min-h-[40px] px-6 text-sm">
              {text('errorPages.actions.goBack')}
            </button>
          ) : (
            <Link href="/?auth=login#auth" className="btn-secondary min-h-[40px] px-6 text-sm">
              {text('errorPages.actions.signIn')}
            </Link>
          )}
        </>
      }
      footer={
        signedIn ? (
          <nav aria-label={text('errorPages.actions.quickLinks')} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span>{text('errorPages.actions.quickLinks')}</span>
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href} className="font-medium text-brand-600 hover:text-brand-700 hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        ) : undefined
      }
    />
  );
}
