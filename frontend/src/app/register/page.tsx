'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function RegisterRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Carry every query param (crucially ?inviteToken=...) over to the
    // home page's auth panel. Dropping inviteToken here is what made an
    // invite link register the person as a brand-new Team Leader
    // instead of joining the team they were invited to.
    const params = new URLSearchParams(searchParams.toString());
    params.set('auth', 'register');

    router.replace(`/?${params.toString()}#auth`);
  }, [router, searchParams]);

  return null;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterRedirect />
    </Suspense>
  );
}
