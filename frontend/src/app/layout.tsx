// @ts-ignore: side-effect CSS import declaration missing
import './globals.css';
import Shell from '@/components/Shell';
import { ThemeProvider } from '@/lib/theme-context';
import LocaleProvider from '@/components/LocaleProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <ThemeProvider>
            <Shell>{children}</Shell>
          </ThemeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
