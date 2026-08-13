'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { TasksApi } from '@/lib/endpoints';
import type { Task } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;

const STATUSES = [
  '',
  'Pending',
  'Unassigned',
  'InProgress',
  'PendingApproval',
  'Completed',
  'Reopened',
  'Finished',
  'Archived',
];

const PRIORITIES = ['', 'Low', 'Medium', 'High', 'Critical'];

function TasksContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Reset to page 1 whenever the filters change
  useEffect(() => {
    setPage(1);
  }, [status, priority]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = { limit: String(PAGE_SIZE), page: String(page) };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    TasksApi.list(params)
      .then((res) => {
        setTasks(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load tasks.'))
      .finally(() => setLoading(false));
  }, [status, priority, page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
        <Link href="/tasks/new" className="btn-primary">
          + New task
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`btn ${status === s ? 'btn-primary' : 'btn-secondary'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Priority:</span>
        {PRIORITIES.map((p) => (
          <button
            key={p || 'all'}
            onClick={() => setPriority(p)}
            className={`btn px-3 py-1 text-xs ${
              priority === p ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            {p || 'All'}
          </button>
        ))}
      </div>

      <div className="mt-4 card divide-y divide-slate-100">
        {error ? (
          <p className="p-6 text-center text-red-600">{error}</p>
        ) : loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No tasks match this filter.</p>
        ) : (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-800">{task.titleEn}</div>
                <div className="text-xs text-slate-500">
                  {task.project?.name ? `${task.project.name} · ` : ''}
                  {task.deadlineDate ? `Due ${task.deadlineDate}` : 'No deadline'}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge value={task.priority} />
                <StatusBadge value={task.status} />
              </div>
            </Link>
          ))
        )}
      </div>

      {!loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="tasks"
        />
      )}
    </div>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute adminOnly>
      <TasksContent />
    </ProtectedRoute>
  );
}