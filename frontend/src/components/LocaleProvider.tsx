'use client';

import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import arMessages from '@/i18n/messages/ar.json';
import enMessages from '@/i18n/messages/en.json';

type Locale = 'ar' | 'en';

const messagesByLocale: Record<Locale, Record<string, unknown>> = {
  ar: arMessages,
  en: enMessages,
};

function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return 'ar';
  const match = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(ar|en)(?:;|$)/);
  return match?.[1] === 'en' ? 'en' : 'ar';
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>('ar');

  useEffect(() => {
    const detected = readLocaleCookie();
    setLocale(detected);
    document.documentElement.lang = detected;
    document.documentElement.dir = detected === 'ar' ? 'rtl' : 'ltr';
  }, []);

  return (
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {children}
    </NextIntlClientProvider>
  );
}
