'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { PublicApi } from '@/lib/endpoints';
import { ApiError } from '@/lib/api';

interface Option {
  id: string;
  name: string;
  code: string;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const [branches, setBranches] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Branch and Department are independent, standalone lists (neither
  // references the other), so both load in parallel — no cascading.
  useEffect(() => {
    PublicApi.branches()
      .then(setBranches)
      .catch(() => setError('Could not load branches. Please refresh and try again.'))
      .finally(() => setLoadingBranches(false));

    PublicApi.departments()
      .then(setDepartments)
      .catch(() => setError('Could not load departments. Please refresh and try again.'))
      .finally(() => setLoadingDepartments(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register({
        fullName,
        email,
        password,
        branchId,
        departmentId,
        phone: phone || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <h1 className="font-serif text-xl font-semibold text-brand-700">Create your account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Join your organization&apos;s workspace as a standard user.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="fullName">Full name</label>
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
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>

          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              type="tel"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="branch">Branch</label>
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
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="department">Department</label>
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
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
