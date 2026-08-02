'use client';

import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/' || pathname === '/login' || pathname === '/register';

  return (
    <AuthProvider>
      {!isPublicPage && <Navbar />}
      <main className={isPublicPage ? '' : 'mx-auto max-w-6xl px-4 py-6'}>{children}</main>
    </AuthProvider>
  );
}
