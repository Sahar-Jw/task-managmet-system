'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';

function ResetPasswordForm() {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError(uiText(isArabic, 'text0905'));
      return;
    }

    setSubmitting(true);
    try {
      await AuthApi.resetPassword(token, newPassword);
      setDone(true);
      // Give the confirmation a moment on screen before sending them to sign in.
      setTimeout(() => router.push('/?auth=login'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0906'));
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-slate-600">
          {uiText(isArabic, 'text0907')}
        </p>
        <Link href="/forgot-password" className="btn-primary inline-block">
          {uiText(isArabic, 'text0908')}
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="text-sm leading-relaxed text-slate-600">
        {uiText(isArabic, 'text0909')}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        {uiText(isArabic, 'text0910')}
      </p>

      <div>
        <label className="label" htmlFor="newPassword">
          {uiText(isArabic, 'text0911')}
        </label>
        <PasswordInput
          id="newPassword"
          required
          minLength={8}
          autoFocus
          autoComplete="new-password"
          className="input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">{uiText(isArabic, 'text0857')}</p>
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          {uiText(isArabic, 'text0912')}
        </label>
        <PasswordInput
          id="confirmPassword"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? uiText(isArabic, 'text0913') : uiText(isArabic, 'text0914')}
      </button>

      <p className="text-center text-sm text-slate-500">
        <Link href="/?auth=login" className="font-medium text-brand-600 hover:underline">
          {uiText(isArabic, 'text0899')}
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-3 py-6 sm:px-6 sm:py-12" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {uiText(isArabic, 'text0915')}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{uiText(isArabic, 'text0856')}</h1>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8">
          <Suspense fallback={<InlineLoader className="min-h-48" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
