'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';

export default function ProtectedRoute({
  children,
  adminOnly = false,
  allowedRoles,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
  /** When set, only these role names may view this route (ADMIN always allowed unless adminOnly excludes it explicitly via a role list that omits it). */
  allowedRoles?: Array<'ADMIN' | 'TEAM_LEADER' | 'USER'>;
}) {
  const { user, loading } = useAuth();
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return <InlineLoader className="min-h-[40vh]" />;
  }
  if (!user) return null;

  const forbidden =
    (adminOnly && user.role.name !== 'ADMIN') ||
    (allowedRoles && !allowedRoles.includes(user.role.name));

  if (forbidden) {
    return (
      <div className="card mt-8 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-800">{uiText(isArabic, 'text0851')}</h2>
        <p className="mt-1 text-sm text-slate-500">{uiText(isArabic, 'text0852')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
