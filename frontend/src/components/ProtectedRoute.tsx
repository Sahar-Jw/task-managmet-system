'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return <div className="py-12 text-center text-slate-500">Loading…</div>;
  }
  if (!user) return null;

  if (adminOnly && user.role.name !== 'ADMIN') {
    return (
      <div className="card mt-8 p-8 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Access restricted</h2>
        <p className="mt-1 text-sm text-slate-500">This page is only available to Admins.</p>
      </div>
    );
  }

  return <>{children}</>;
}
