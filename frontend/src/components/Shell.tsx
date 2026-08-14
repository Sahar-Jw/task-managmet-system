'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import { NotificationsProvider } from '@/lib/notifications-context';
import Navbar from '@/components/Navbar';
import { BrandingProvider } from '@/lib/branding-context';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register';

  return (
    // Branding (logo/name/favicon/metadata) is public and needed on every
    // page — including the login screen — so it sits outside AuthProvider.
    <BrandingProvider>
      <AuthProvider>
        <NotificationsProvider>
          {!isPublicPage && <Navbar />}
          <main className={isPublicPage ? '' : 'mx-auto max-w-6xl px-4 py-6'}>{children}</main>
        </NotificationsProvider>
      </AuthProvider>
    </BrandingProvider>
  );
}