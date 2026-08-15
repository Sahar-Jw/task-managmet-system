'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import ReasonModal from '@/components/ReasonModal';
import { ApiError } from '@/lib/api';
import { TasksApi } from '@/lib/endpoints';
import type { Task, TaskPriority } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 9;
const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
const RATINGS = [5, 4, 3, 2, 1];

type Tab = 'assignedToMe' | 'assignedByMe';

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
  const [tab, setTab] = useState<Tab>('assignedToMe');
  const [status] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState('');
  const [minRating, setMinRating] = useState('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [deadlineFrom, setDeadlineFrom] = useState('');
  const [deadlineTo, setDeadlineTo] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  // Which Task (if any) is currently mid-action, and any confirmation modal
  // that action needs (only "Finish" requires a reason).
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [finishModalTask, setFinishModalTask] = useState<Task | null>(null);

  // Debounce the free-text search so we're not firing a request on every
  // keystroke — wait for a short pause in typing instead.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset to page 1 whenever a filter or tab changes
  useEffect(() => {
    setPage(1);
  }, [tab, status, priority, minRating, upcomingOnly, debouncedSearch, deadlineFrom, deadlineTo]);

  function reload() {
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
    if (debouncedSearch) params.search = debouncedSearch;
    if (deadlineFrom) params.deadlineFrom = deadlineFrom;
    if (deadlineTo) params.deadlineTo = deadlineTo;

    const fetcher = tab === 'assignedToMe' ? TasksApi.mine(params) : TasksApi.assignedByMe(params);
    fetcher
      .then((res) => {
        setTasks(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load tasks.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, status, priority, minRating, upcomingOnly, debouncedSearch, deadlineFrom, deadlineTo, page]);

  async function archiveTask(task: Task) {
    setActingOnId(task.id);
    setError('');
    try {
      await TasksApi.remove(task.id);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not archive this task.');
    } finally {
      setActingOnId(null);
    }
  }

  async function finishTask(task: Task, reason: string) {
    setFinishModalTask(null);
    setActingOnId(task.id);
    setError('');
    try {
      await TasksApi.changeStatus(task.id, 'Finished', reason);
      reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not finish this task.');
    } finally {
      setActingOnId(null);
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">My Tasks</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{loading ? '…' : `${total} task${total === 1 ? '' : 's'}`}</span>
          <Link href="/tasks/new" className="btn-primary">
            + New task
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('assignedToMe')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'assignedToMe'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Assigned to me
        </button>
        <button
          onClick={() => setTab('assignedByMe')}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === 'assignedByMe'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Assigned by me
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="label">Search</label>
          <input
            className="input"
            placeholder="Title or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Due from</label>
          <input
            type="date"
            className="input"
            value={deadlineFrom}
            onChange={(e) => setDeadlineFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Due to</label>
          <input
            type="date"
            className="input"
            value={deadlineTo}
            onChange={(e) => setDeadlineTo(e.target.value)}
          />
        </div>
        {(search || deadlineFrom || deadlineTo) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              setDeadlineFrom('');
              setDeadlineTo('');
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
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

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Results, sorted by nearest deadline */}
      <div className="mt-4">
        {loading ? (
          <div className="card p-6 text-center text-slate-500">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="card p-6 text-center text-slate-500">
            {tab === 'assignedToMe' ? 'No tasks match this filter.' : "You haven't assigned any tasks to others yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => {
              const canArchive = task.status !== 'Archived';
              const canFinish = task.status !== 'Archived' && task.status !== 'Finished';
              const busy = actingOnId === task.id;
              return (
                <div key={task.id} className="card flex flex-col gap-2 p-4">
                  <Link href={`/tasks/${task.id}`} className="flex items-start justify-between gap-2 hover:opacity-80">
                    <h3 className="min-w-0 truncate font-medium text-slate-800">{task.titleEn}</h3>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </Link>

                  {task.descriptionEn && (
                    <p className="line-clamp-2 text-xs text-slate-500">{task.descriptionEn}</p>
                  )}

                  {task.project?.name && (
                    <div className="text-xs text-slate-600">
                      Project: <span className="font-medium">{task.project.name}</span>
                    </div>
                  )}

                  {tab === 'assignedByMe' && (
                    <div className="text-xs text-slate-600">
                      Assigned to: <span className="font-medium">{task.assignedTo?.fullName || 'Unassigned'}</span>
                    </div>
                  )}

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className={isOverdue(task) ? 'font-medium text-red-600' : 'text-slate-500'}>
                      {task.deadlineDate ? `Due ${task.deadlineDate}` : 'No deadline'}
                      {isOverdue(task) ? ' · Overdue' : ''}
                    </span>
                    <Stars value={avgRating(task)} />
                  </div>

                  {tab === 'assignedByMe' && (
                    <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-100 pt-2">
                      <Link href={`/tasks/${task.id}`} className="btn-secondary px-3 py-1 text-xs">
                        Edit
                      </Link>
                      {canFinish && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setFinishModalTask(task)}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          Mark finished
                        </button>
                      )}
                      {canArchive && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => archiveTask(task)}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="tasks"
        />
      )}

      <ReasonModal
        open={!!finishModalTask}
        title="Finish task"
        description="This will stop the task — please explain why it's being finished."
        minLength={10}
        confirmLabel="Finish"
        onCancel={() => setFinishModalTask(null)}
        onConfirm={(reason) => finishModalTask && finishTask(finishModalTask, reason)}
      />
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