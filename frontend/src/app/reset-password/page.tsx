'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';

function ResetPasswordForm() {
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
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await AuthApi.resetPassword(token, newPassword);
      setDone(true);
      // Give the confirmation a moment on screen before sending them to sign in.
      setTimeout(() => router.push('/?auth=login'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password. Please try again.');
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-slate-600">
          This reset link is missing or invalid. Request a new one below.
        </p>
        <Link href="/forgot-password" className="btn-primary inline-block">
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="text-sm leading-relaxed text-slate-600">
        Your password has been reset. Redirecting you to sign in…
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm leading-relaxed text-slate-600">
        Choose a new password for your account.
      </p>

      <div>
        <label className="label" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoFocus
          className="input"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          className="input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save new password'}
      </button>

      <p className="text-center text-sm text-slate-500">
        <Link href="/?auth=login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Reset password
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Set a new password</h1>
        </div>

        <div className="px-6 py-8">
          <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
