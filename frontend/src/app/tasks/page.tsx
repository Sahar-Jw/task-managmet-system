'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { ApiError } from '@/lib/api';
import { BranchesApi, DepartmentsApi, ProjectsApi, TasksApi, UsersApi } from '@/lib/endpoints';
import type { Branch, Department, Project, Task, TaskType, User } from '@/lib/types';
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
];

const PRIORITIES = ['', 'Low', 'Medium', 'High', 'Critical'];
const TASK_TYPES: TaskType[] = [
  'General', 'Administrative', 'Financial', 'Technical',
  'Maintenance', 'HR', 'Procurement', 'Other',
];

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
  const startsInArchive = searchParams.get('status') === 'Archived';
  const [view, setView] = useState<'tasks' | 'archived'>(startsInArchive ? 'archived' : 'tasks');
  const [status, setStatus] = useState(startsInArchive ? '' : searchParams.get('status') || '');
  const [taskType, setTaskType] = useState(searchParams.get('taskType') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [search, setSearch] = useState('');
  const [dueDateFrom, setDueDateFrom] = useState('');
  const [dueDateTo, setDueDateTo] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [owners, setOwners] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

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
    ProjectsApi.list({ limit: '100', excludeArchived: 'true' }).then((res) => setProjects(res.items)).catch(() => {});
    UsersApi.list({ limit: '100' }).then((res) => setOwners(res.items)).catch(() => {});
  }, []);

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    setPage(1);
  }, [view, status, taskType, priority, debouncedSearch, dueDateFrom, dueDateTo, departmentId, branchId, projectId, ownerId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params: Record<string, string> = { limit: String(PAGE_SIZE), page: String(page) };
    if (view === 'archived') params.status = 'Archived';
    else {
      params.excludeArchived = 'true';
      if (status) params.status = status;
    }
    if (taskType) params.taskType = taskType;
    if (priority) params.priority = priority;
    if (debouncedSearch) params.search = debouncedSearch;
    if (dueDateFrom) params.dueDateFrom = dueDateFrom;
    if (dueDateTo) params.dueDateTo = dueDateTo;
    if (departmentId) params.departmentId = departmentId;
    if (branchId) params.branchId = branchId;
    if (projectId) params.projectId = projectId;
    if (ownerId) params.createdById = ownerId;
    TasksApi.list(params)
      .then((res) => {
        setTasks(res.items);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load tasks.'))
      .finally(() => setLoading(false));
  }, [view, status, taskType, priority, debouncedSearch, dueDateFrom, dueDateTo, departmentId, branchId, projectId, ownerId, page]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  async function unarchiveTask(id: string) {
    setBusyId(id);
    setError('');
    try {
      await TasksApi.unarchive(id);
      setTasks((current) => current.filter((task) => task.id !== id));
      setTotal((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unarchive this task.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Tasks</h1>
        <Link href="/tasks/new" className="btn-primary">
          + New task
        </Link>
      </div>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        <button
          className={`px-3 py-2 text-sm font-medium ${view === 'tasks' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setView('tasks')}
        >
          Tasks
        </button>
        <button
          className={`px-3 py-2 text-sm font-medium ${view === 'archived' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setView('archived')}
        >
          Archived
        </button>
      </div>

      {view === 'tasks' && <>
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
        <div>
          <label className="label">Project</label>
          <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">All</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Owner</label>
          <select className="input" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">All</option>
            {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.fullName}</option>)}
          </select>
        </div>
        {(search || dueDateFrom || dueDateTo || departmentId || branchId || projectId || ownerId) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setSearch('');
              setDueDateFrom('');
              setDueDateTo('');
              setDepartmentId('');
              setBranchId('');
              setProjectId('');
              setOwnerId('');
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
        <span className="text-xs font-medium text-slate-500">Type:</span>
        <button
          onClick={() => setTaskType('')}
          className={`btn px-3 py-1 text-xs ${taskType === '' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All
        </button>
        {TASK_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setTaskType(type)}
            className={`btn px-3 py-1 text-xs ${taskType === type ? 'btn-primary' : 'btn-secondary'}`}
          >
            {type}
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
      </>}

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
                <div
                  key={task.id}
                  className="card flex flex-col gap-2 p-4"
                >
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

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Type:</span>
                    <StatusBadge value={task.taskType} />
                  </div>

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
                  {view === 'archived' && (
                    <button
                      type="button"
                      onClick={() => unarchiveTask(task.id)}
                      disabled={busyId === task.id}
                      className="btn-secondary self-end px-3 py-1 text-xs disabled:opacity-50"
                    >
                      {busyId === task.id ? 'Unarchiving...' : 'Unarchive'}
                    </button>
                  )}
                </div>
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
