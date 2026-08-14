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