'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { TasksApi } from '@/lib/endpoints';
import type { Task, TaskPriority } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const RATINGS = [5, 4, 3, 2, 1];

function avgRating(task: Task): number | null {
  if (!task.ratings || task.ratings.length === 0) return null;
  const sum = task.ratings.reduce((acc, r) => acc + r.score, 0);
  return sum / task.ratings.length;
}

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-slate-400">Not rated</span>;
  return (
    <span className="text-amber-500" title={`${value.toFixed(1)} / 5`}>
      {'★'.repeat(Math.round(value))}
      <span className="text-slate-300">{'★'.repeat(5 - Math.round(value))}</span>
    </span>
  );
}

function isOverdue(task: Task): boolean {
  if (!task.deadlineDate) return false;
  const done = ['Completed', 'Finished', 'Archived'].includes(task.status);
  return !done && task.deadlineDate < new Date().toISOString().slice(0, 10);
}

function MyTasksContent() {
  const searchParams = useSearchParams();
  const [status] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState('');
  const [minRating, setMinRating] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [status, priority, minRating, upcomingOnly]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      page: String(page),
      sortBy: 'deadline',
      sortDir: 'asc',
    };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (minRating) params.minRating = minRating;
    if (upcomingOnly) params.upcomingOnly = 'true';

    TasksApi.mine(params)
      .then((res) => {
        setTasks(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your tasks.'))
      .finally(() => setLoading(false));
  }, [status, priority, minRating, upcomingOnly, page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">My Tasks</h1>
        <span className="text-sm text-slate-500">{loading ? '…' : `${total} task${total === 1 ? '' : 's'}`}</span>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Importance:</span>
        <button
          onClick={() => setPriority('')}
          className={`btn px-3 py-1 text-xs ${priority === '' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All
        </button>
        {PRIORITIES.map((p) => (
          <button
            key={p}
            onClick={() => setPriority(p)}
            className={`btn px-3 py-1 text-xs ${priority === p ? 'btn-primary' : 'btn-secondary'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Min rating:</span>
        <button
          onClick={() => setMinRating('')}
          className={`btn px-3 py-1 text-xs ${minRating === '' ? 'btn-primary' : 'btn-secondary'}`}
        >
          Any
        </button>
        {RATINGS.map((r) => (
          <button
            key={r}
            onClick={() => setMinRating(String(r))}
            className={`btn px-3 py-1 text-xs ${minRating === String(r) ? 'btn-primary' : 'btn-secondary'}`}
          >
            {r}★+
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
            className="rounded border-slate-300"
          />
          Upcoming deadlines only
        </label>
      </div>

      {/* Results, sorted by nearest deadline */}
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
                {task.descriptionEn && (
                  <div className="mt-0.5 truncate text-xs text-slate-500">{task.descriptionEn}</div>
                )}
                <div className={`mt-1 text-xs ${isOverdue(task) ? 'font-medium text-red-600' : 'text-slate-500'}`}>
                  {task.project?.name ? `${task.project.name} · ` : ''}
                  {task.deadlineDate ? `Due ${task.deadlineDate}` : 'No deadline'}
                  {isOverdue(task) ? ' · Overdue' : ''}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <div className="flex items-center gap-2">
                  <StatusBadge value={task.priority} />
                  <StatusBadge value={task.status} />
                </div>
                <Stars value={avgRating(task)} />
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

export default function MyTasksPage() {
  return (
    <ProtectedRoute>
      <MyTasksContent />
    </ProtectedRoute>
  );
}