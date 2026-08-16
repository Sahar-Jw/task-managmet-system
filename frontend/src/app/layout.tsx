import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
// @ts-ignore: side-effect CSS import declaration missing
import './globals.css';
import Shell from '@/components/Shell';
import { ThemeProvider } from '@/lib/theme-context';

export const metadata: Metadata = {
  title: 'Task & Project Manager',
  description: 'Enterprise Task & Project Management System',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value === 'ar' ? 'ar' : 'en';
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            <Shell>{children}</Shell>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}