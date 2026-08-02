'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const LEDGER: { label: string; note: string }[] = [
  { label: 'Branch', note: 'Headquarters · HQ' },
  { label: 'Department', note: 'Engineering · ENG' },
  { label: 'Task created', note: 'Migrate billing service' },
  { label: 'Assigned', note: 'to J. Alvarez · due Fri' },
  { label: 'Approved', note: 'signed off · logged' },
];

const FEATURES = [
  {
    title: 'Org-shaped access',
    body: 'Every account sits under a Branch and a Department, so people only ever see the work that is actually theirs.',
  },
  {
    title: 'Assign, accept, approve',
    body: 'Work moves through a real chain: assigned, accepted or rejected, completed, then signed off — never a status field with no history behind it.',
  },
  {
    title: 'An audit log that cannot be edited',
    body: 'Every create, change, and approval is written once to an append-only log. Nothing about who-did-what is ever quietly rewritten.',
  },
  {
    title: 'Reporting that matches reality',
    body: 'Task summaries, per-user performance, and branch overviews are read straight from the same records your team works in daily.',
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-serif text-lg font-semibold tracking-tight text-ink">
            Task &amp; Project Manager
          </span>
          <nav className="flex items-center gap-3">
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
            <Link href="/register" className="btn-primary">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
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
              <Link href="/register" className="btn-primary px-6 py-2.5 text-base">
                Create your account
              </Link>
              <Link href="/login" className="btn-secondary px-6 py-2.5 text-base">
                Sign in
              </Link>
            </div>
          </div>

          {/* Signature element: the ledger — a literal trace of one task's chain of custody */}
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

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold text-ink">
          Built for how organizations actually assign work
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="text-base font-semibold text-brand-700">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
          Task &amp; Project Manager — internal system of record.
        </div>
      </footer>
    </div>
  );
}
