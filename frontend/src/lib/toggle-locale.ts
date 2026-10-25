/**
 * Switches between Arabic and English using the same mechanism as the Navbar
 * and landing page (NEXT_LOCALE cookie + reload). Shared by the error screens,
 * which may render outside the normal app providers.
 */
export function toggleLocale(current: 'ar' | 'en') {
  const next = current === 'en' ? 'ar' : 'en';

  document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=Lax`;

  try {
    localStorage.setItem('NEXT_LOCALE', next);
  } catch {
    // Storage may be disabled; the cookie alone is enough.
  }

  window.location.reload();
}

/** Reads the locale cookie without needing the LocaleProvider. Defaults to Arabic like the app. */
export function readLocaleCookie(): 'ar' | 'en' {
  if (typeof document === 'undefined') return 'ar';
  return /(?:^|;\s*)NEXT_LOCALE=en(?:;|$)/.test(document.cookie) ? 'en' : 'ar';
}
