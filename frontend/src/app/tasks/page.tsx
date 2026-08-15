'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { BranchesApi, DepartmentsApi, TasksApi } from '@/lib/endpoints';
import type { Branch, Department, Task } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 9;

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

function avgRating(task: Task): number | null {
  if (!task.ratings || task.ratings.length === 0) return null;
  const sum = task.ratings.reduce((acc, r) => acc + r.score, 0);
  return sum / task.ratings.length;
}

function Stars({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <span className="text-amber-500" title={`${value.toFixed(1)} / 5`}>
      {'★'.repeat(Math.round(value))}
      <span className="text-slate-300">{'★'.repeat(5 - Math.round(value))}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function TasksContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [search, setSearch] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce the free-text search so we're not firing a request on every
  // keystroke — wait for a short pause in typing instead.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    DepartmentsApi.list().then(setDepartments).catch(() => {});
    BranchesApi.list().then(setBranches).catch(() => {});
  }, []);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [status, priority, debouncedSearch, dueDateFrom, dueDateTo, departmentId, branchId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = { limit: String(PAGE_SIZE), page: String(page) };
    if (status) params.status = status;
    if (priority) params.priority = priority;
    if (debouncedSearch) params.search = debouncedSearch;
    if (dueDateFrom) params.dueDateFrom = dueDateFrom;
    if (dueDateTo) params.dueDateTo = dueDateTo;
    if (departmentId) params.departmentId = departmentId;
    if (branchId) params.branchId = branchId;
    TasksApi.list(params)
      .then((res) => {
        setTasks(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load tasks.'))
      .finally(() => setLoading(false));
  }, [status, priority, debouncedSearch, dueDateFrom, dueDateTo, departmentId, branchId, page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
        <Link href="/tasks/new" className="btn-primary">
          + New task
        </Link>
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
            value={dueDateFrom}
            onChange={(e) => setDueDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Due to</label>
          <input
            type="date"
            className="input"
            value={dueDateTo}
            onChange={(e) => setDueDateTo(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Department</label>
          <select className="input" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.valueEn} ({d.codeEn})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Branch</label>
          <select className="input" value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.valueEn} ({b.codeEn})
              </option>
            ))}
          </select>
        </div>
        {(search || dueDateFrom || dueDateTo || departmentId || branchId) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              setDueDateFrom('');
              setDueDateTo('');
              setDepartmentId('');
              setBranchId('');
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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

      <div className="mt-4">
        {error ? (
          <div className="card p-6 text-center text-red-600">{error}</div>
        ) : loading ? (
          <div className="card p-6 text-center text-slate-500">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="card p-6 text-center text-slate-500">No tasks match this filter.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => {
              const rating = avgRating(task);
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="card flex flex-col gap-2 p-4 hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="min-w-0 truncate font-medium text-slate-800">{task.titleEn}</h3>
                    <div className="flex shrink-0 items-center gap-1">
                      <StatusBadge value={task.priority} />
                      <StatusBadge value={task.status} />
                    </div>
                  </div>

                  {task.descriptionEn && (
                    <p className="line-clamp-2 text-xs text-slate-500">{task.descriptionEn}</p>
                  )}

                  <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600">
                    <div>
                      <dt className="text-slate-400">Owner</dt>
                      <dd className="truncate">{task.createdBy?.fullName || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Created</dt>
                      <dd>{formatDate(task.createdAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Department</dt>
                      <dd className="truncate">{task.department?.valueEn || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Branch</dt>
                      <dd className="truncate">{task.branch?.valueEn || '—'}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-slate-400">Project</dt>
                      <dd className="truncate">{task.project?.name || '—'}</dd>
                    </div>
                  </dl>

                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className={task.deadlineDate ? 'text-slate-500' : 'text-slate-400'}>
                      {task.deadlineDate ? `Due ${task.deadlineDate}` : 'No deadline'}
                    </span>
                    {rating !== null && <Stars value={rating} />}
                  </div>
                </Link>
              );
            })}
          </div>
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