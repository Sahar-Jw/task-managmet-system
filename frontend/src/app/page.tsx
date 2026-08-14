'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { isValidPhone, PHONE_VALIDATION_MESSAGE } from '@/lib/validation';
import PasswordInput from '@/components/PasswordInput';

const LEDGER: { label: string; note: string }[] = [
  { label: 'Branch', note: 'Headquarters · HQ' },
  { label: 'Department', note: 'Engineering · ENG' },
  { label: 'Task created', note: 'Migrate billing service' },
  { label: 'Assigned', note: 'to J. Alvarez · due Fri' },
  { label: 'Approved', note: 'signed off · logged' },
];

const getFeatures = (t: (key: string) => string) => [
  {
    title: t('orgAccess'),
    body: 'Every account sits under a Branch and a Department, so people only ever see the work that is actually theirs.',
  },
  {
    title: t('assignApprove'),
    body: 'Work moves through a real chain: assigned, accepted or rejected, completed, then signed off — never a status field with no history behind it.',
  },
  {
    title: t('auditLogLabel'),
    body: 'Every create, change, and approval is written once to an append-only log. Nothing about who-did-what is ever quietly rewritten.',
  },
  {
    title: t('reporting'),
    body: 'Task summaries, per-user performance, and branch overviews are read straight from the same records your team works in daily.',
  },
];

type AuthMode = 'login' | 'register' | null;

export default function Home() {
  const { user, loading, login, register } = useAuth();
  const router = useRouter();
  const t = useTranslations('home');
  const features = getFeatures(t);
  const authRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<AuthMode>(null);
  const [authError, setAuthError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branches, setBranches] = useState<
    { id: string; codeAr: string; codeEn: string; valueAr?: string; valueEn?: string }[]
  >([]);
  const [departments, setDepartments] = useState<
    { id: string; codeAr: string; codeEn: string; valueAr?: string; valueEn?: string }[]
  >([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const auth = searchParams.get('auth');
    const requestedMode = auth === 'register' ? 'register' : auth === 'login' ? 'login' : null;
    setMode(requestedMode);
  }, []);

  useEffect(() => {
    if (!mode) return;
    if (authRef.current) {
      authRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [mode]);

  useEffect(() => {
    async function loadPublicData() {
      try {
        const [branchesResponse, departmentsResponse] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/public/branches`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/public/departments`),
        ]);

        if (!branchesResponse.ok || !departmentsResponse.ok) {
          throw new Error('Failed to load branch or department lists.');
        }

        const branchesJson = await branchesResponse.json();
        const departmentsJson = await departmentsResponse.json();
        setBranches(branchesJson.data ?? branchesJson);
        setDepartments(departmentsJson.data ?? departmentsJson);
      } catch {
        setAuthError('Could not load branch or department data. Please refresh.');
      } finally {
        setLoadingBranches(false);
        setLoadingDepartments(false);
      }
    }

    loadPublicData();
  }, []);

  const openAuth = (selectedMode: AuthMode) => {
    if (!selectedMode) return;
    setMode(selectedMode);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('auth', selectedMode);
      url.hash = 'auth';
      window.history.replaceState({}, '', url.toString());
    }
  };

  const resetForm = () => {
    setAuthError('');
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setPhoneError('');
    setBranchId('');
    setDepartmentId('');
  };

  const handleModeChange = (selectedMode: AuthMode) => {
    resetForm();
    openAuth(selectedMode);
  };

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Digits only, capped at 10 as they type — catches most mistakes before
    // they ever hit "Create account", instead of only after a round trip
    // to the server.
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(digitsOnly);
    if (phoneError) setPhoneError('');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthError('');
    setSubmitting(true);

    if (mode === 'register' && phone && !isValidPhone(phone)) {
      setPhoneError(PHONE_VALIDATION_MESSAGE);
      setSubmitting(false);
      return;
    }

    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await register({
          fullName,
          email,
          password,
          phone: phone || undefined,
          branchId,
          departmentId,
        });
      }
      router.push('/dashboard');
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : 'Unable to submit. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-serif text-lg font-semibold tracking-tight text-ink hover:text-brand-700"
          >
            Task &amp; Project Manager
          </Link>
          <nav className="flex items-center gap-3">
            <button type="button" onClick={() => handleModeChange('login')} className="btn-secondary">
              {t('signIn')}
            </button>
            <button type="button" onClick={() => handleModeChange('register')} className="btn-primary">
              {t('createAccount')}
            </button>
          </nav>
        </div>
      </header>

      {mode && (
        <section id="auth" ref={authRef} className="bg-slate-50 py-12">
          <div className="mx-auto max-w-4xl px-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    {mode === 'login' ? 'Sign in' : 'Register'}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">
                    {mode === 'login'
                      ? 'Welcome back — sign in to your workspace.'
                      : 'Create your account and join your team.'}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange('login')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      mode === 'login' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('register')}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      mode === 'register' ? 'bg-brand-600 text-white' : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    Create account
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8">
                {mode === 'register' && (
                  <>
                    <div>
                      <label className="label" htmlFor="fullName">
                        Full name
                      </label>
                      <input
                        id="fullName"
                        type="text"
                        required
                        maxLength={150}
                        className="input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="phone">
                        Phone (optional)
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        placeholder="0912345678"
                        className="input"
                        value={phone}
                        onChange={handlePhoneChange}
                      />
                      {phoneError ? (
                        <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">10 digits, starting with 09.</p>
                      )}
                    </div>
                  </>
                )}

                <div>
                  <label className="label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus={mode === 'login'}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <PasswordInput
                    id="password"
                    required
                    minLength={8}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {mode === 'register' && (
                    <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
                  )}
                  {mode === 'login' && (
                    <p className="mt-1 text-right text-xs">
                      <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
                        Forgot password?
                      </Link>
                    </p>
                  )}
                </div>

                {mode === 'register' && (
                  <>
                    <div>
                      <label className="label" htmlFor="branch">
                        Branch
                      </label>
                      <select
                        id="branch"
                        required
                        className="input"
                        value={branchId}
                        onChange={(e) => setBranchId(e.target.value)}
                        disabled={loadingBranches}
                      >
                        <option value="" disabled>
                          {loadingBranches ? 'Loading branches…' : 'Select a branch'}
                        </option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.valueEn} ({branch.codeEn})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label" htmlFor="department">
                        Department
                      </label>
                      <select
                        id="department"
                        required
                        className="input"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        disabled={loadingDepartments}
                      >
                        <option value="" disabled>
                          {loadingDepartments ? 'Loading departments…' : 'Select a department'}
                        </option>
                        {departments.map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.valueEn} ({department.codeEn})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {authError && <p className="text-sm text-red-600">{authError}</p>}

                <button type="submit" className="btn-primary w-full" disabled={submitting}>
                  {submitting
                    ? mode === 'login'
                      ? 'Signing in…'
                      : 'Creating account…'
                    : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      <section className="bg-brand-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-brand-600">
              Enterprise task &amp; project management
            </p>
            <h1 className="font-serif text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
              Every task, traced from assignment to sign-off.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-600">
              One system of record for branches, departments, and the people in
              them — where work is assigned, accepted, rated, and approved, and
              every step is written to a log nobody can quietly edit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => handleModeChange('register')} className="btn-primary px-6 py-2.5 text-base">
                Create your account
              </button>
              <button type="button" onClick={() => handleModeChange('login')} className="btn-secondary px-6 py-2.5 text-base">
                Sign in
              </button>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <p className="mb-5 text-xs font-medium uppercase tracking-widest text-slate-400">
              One task, start to finish
            </p>
            <ol className="relative border-l border-slate-200 pl-6">
              {LEDGER.map((entry, i) => (
                <li key={entry.label} className={i === 0 ? '' : 'mt-6'}>
                  <span
                    className={`absolute -left-[7px] h-3 w-3 rounded-full ring-4 ring-white ${
                      i === LEDGER.length - 1 ? 'bg-ledger-500' : 'bg-brand-500'
                    }`}
                  />
                  <p className="text-sm font-semibold text-ink">{entry.label}</p>
                  <p className="font-mono text-xs text-slate-500">{entry.note}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold text-ink">
          Built for how organizations actually assign work
        </h2>
        {/* <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="text-base font-semibold text-brand-700">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div> */}
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
          Task &amp; Project Manager — internal system of record.
        </div>
      </footer>
    </div>
  );
}