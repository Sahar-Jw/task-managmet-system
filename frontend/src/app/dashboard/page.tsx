'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { TasksApi } from '@/lib/endpoints';
import type { Task, TaskStatus } from '@/lib/types';

const STATUS_ORDER: TaskStatus[] = [
  'Pending',
  'Unassigned',
  'InProgress',
  'PendingApproval',
  'Completed',
  'Cancelled',
];

function DashboardContent() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    TasksApi.list({ limit: '100' })
      .then((res) => setTasks(res.items))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your tasks.'))
      .finally(() => setLoading(false));
  }, []);

  const counts = STATUS_ORDER.map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));

  const upcoming = tasks
    .filter((t) => t.deadlineDate && !['Completed', 'Cancelled', 'Archived'].includes(t.status))
    .sort((a, b) => (a.deadlineDate! < b.deadlineDate! ? -1 : 1))
    .slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Welcome back, {user?.fullName?.split(' ')[0]}</h1>
        <Link href="/tasks/new" className="btn-primary">
          + New task
        </Link>
      </div>

      {error ? (
        <p className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
      ) : loading ? (
        <p className="mt-6 text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {counts.map((c) => (
              <Link
                key={c.status}
                href={`/tasks?status=${c.status}`}
                className="card p-4 text-center hover:border-brand-500"
              >
                <div className="text-2xl font-semibold text-slate-800">{c.count}</div>
                <div className="mt-1">
                  <StatusBadge value={c.status} />
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Upcoming due dates
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing due soon — you're all caught up.</p>
            ) : (
              <div className="mt-3 card divide-y divide-slate-100">
                {upcoming.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{task.titleEn}</div>
                      <div className="text-xs text-slate-500">Due {task.deadlineDate}</div>
                    </div>
                    <StatusBadge value={task.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}