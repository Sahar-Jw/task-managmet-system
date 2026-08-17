'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // The backend always returns the same generic message whether or not
      // the email exists, so we don't need to branch on the response here.
      await AuthApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0897'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-3 py-6 sm:px-6 sm:py-12" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-5 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {uiText(isArabic, 'text0896')}
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">{uiText(isArabic, 'text0855')}</h1>
        </div>

        <div className="px-4 py-6 sm:px-6 sm:py-8">
          {sent ? (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-slate-600">
                {uiText(isArabic, 'text0898', { value0: email })}
              </p>
              <Link href="/?auth=login" className="btn-secondary inline-block">
                {uiText(isArabic, 'text0899')}
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm leading-relaxed text-slate-600">
                {uiText(isArabic, 'text0900')}
              </p>

              <div>
                <label className="label" htmlFor="email">
                  {uiText(isArabic, 'text0901')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoFocus
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? uiText(isArabic, 'text0902') : uiText(isArabic, 'text0903')}
              </button>

              <p className="text-center text-sm text-slate-500">
                <Link href="/?auth=login" className="font-medium text-brand-600 hover:underline">
                  {uiText(isArabic, 'text0899')}
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
