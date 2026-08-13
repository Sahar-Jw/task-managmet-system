'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
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
      setError(err instanceof ApiError ? err.message : 'Unable to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Forgot password
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Reset your password</h1>
        </div>

        <div className="px-6 py-8">
          {sent ? (
            <div className="space-y-6">
              <p className="text-sm leading-relaxed text-slate-600">
                If an account with that email exists, we&apos;ve sent a link to{' '}
                <span className="font-medium text-ink">{email}</span> to reset your password.
                The link expires in 30 minutes.
              </p>
              <Link href="/?auth=login" className="btn-secondary inline-block">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <p className="text-sm leading-relaxed text-slate-600">
                Enter the email address for your account and we&apos;ll send you a link to
                reset your password.
              </p>

              <div>
                <label className="label" htmlFor="email">
                  Email
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
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>

              <p className="text-center text-sm text-slate-500">
                <Link href="/?auth=login" className="font-medium text-brand-600 hover:underline">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
