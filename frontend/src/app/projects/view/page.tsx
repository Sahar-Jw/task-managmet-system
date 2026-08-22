'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ProjectsApi, TasksApi, UsersApi } from '@/lib/endpoints';
import type { Project, Task, User } from '@/lib/types';
import Avatar from '@/components/Avatar';
import AvatarSelect from '@/components/AvatarSelect';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';
import { useListLabels } from '@/lib/list-labels-context';

function ProjectDetailContent() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const { user } = useAuth();
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const isAdmin = user?.role.name === 'ADMIN';
  const { getLabel } = useListLabels();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatus, setTaskStatus] = useState('');
  const [taskPriority, setTaskPriority] = useState('');
  const [taskType, setTaskType] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Admin can see every task in the project; a regular User only ever
      // sees their own tasks, so scope "mine" down to this project instead.
      const fetchTasks = isAdmin
        ? TasksApi.list({ projectId: id, limit: '100' })
        : TasksApi.mine({ projectId: id, limit: '100' });
      const [p, t, u] = await Promise.all([
        ProjectsApi.get(id),
        fetchTasks,
        UsersApi.list({ limit: '100' }).catch(() => ({ items: [], total: 0, page: 1, limit: 100 })),
      ]);
      setProject(p);
      setTasks(t.items);
      setUsers(u.items.filter((item) => item.isActive));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0889'));
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin, isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredTasks = useMemo(() => {
    const term = taskSearch.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !term ||
        task.title.toLowerCase().includes(term) ||
        (task.description || '').toLowerCase().includes(term) ||
        (task.assignedTo?.fullName || '').toLowerCase().includes(term) ||
        (task.createdBy?.fullName || '').toLowerCase().includes(term) ||
        ((isArabic ? task.department?.valueAr : task.department?.valueEn) || '').toLowerCase().includes(term);

      return (
        matchesSearch &&
        (!taskStatus || task.status === taskStatus) &&
        (!taskPriority || task.priority === taskPriority) &&
        (!taskType || task.taskType === taskType) &&
        (!taskAssigneeId || task.assignedToId === taskAssigneeId)
      );
    });
  }, [isArabic, taskAssigneeId, taskPriority, taskSearch, taskStatus, taskType, tasks]);

  if (loading) return <InlineLoader className="min-h-[40vh]" />;
  if (!project) return <p className="text-red-600">{error || uiText(isArabic, 'text0890')}</p>;

  const canManage = isAdmin || project.createdById === user?.id;
  const taskStatuses = Array.from(new Set(tasks.map((task) => task.status))).filter(Boolean);
  const taskPriorities = Array.from(new Set(tasks.map((task) => task.priority))).filter(Boolean);
  const taskTypes = Array.from(new Set(tasks.map((task) => task.taskType))).filter(Boolean);

  function startEdit() {
    setEditForm({ name: project!.name, description: project!.description || '' });
    setEditError('');
    setEditing(true);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    try {
      const updated = await ProjectsApi.update(id, editForm);
      setProject(updated);
      setEditing(false);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0891'));
    }
  }

  async function handleDelete() {
    setBusy(true);
    setDeleteError('');
    try {
      await ProjectsApi.remove(id);
      router.push('/projects');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0892'));
      setConfirmDelete(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleArchiveToggle() {
    setBusy(true);
    setError('');
    try {
      const updated =
        project!.status === 'Archived'
          ? await ProjectsApi.unarchive(id)
          : await ProjectsApi.archive(id);
      setProject(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0893'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="card p-6">
        <button onClick={() => router.push('/projects')} className="text-sm text-brand-600 hover:underline">
          {isArabic ? '→' : '←'} {uiText(isArabic, 'text0876')}
        </button>

        {editing ? (
          <form onSubmit={handleUpdate} className="mt-4 space-y-3">
            <div>
              <label className="label">{uiText(isArabic, 'text0858')}</label>
              <input
                className="input"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{uiText(isArabic, 'text0859')}</label>
              <textarea
                className="input"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="btn-primary">
                {uiText(isArabic, 'text0877')}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                {uiText(isArabic, 'text0878')}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="mt-2 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold text-slate-800">{project.name}</h1>
                {project.description && (
                  <p className="mt-1 text-sm text-slate-600">{project.description}</p>
                )}
              </div>
              <StatusBadge value={project.status} listType="project_status" />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-slate-400">{uiText(isArabic, 'text0860')}</dt>
                <dd className="text-slate-700">{project.startDate || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">{uiText(isArabic, 'text0861')}</dt>
                <dd className="text-slate-700">{project.endDate || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">{uiText(isArabic, 'text0862')}</dt>
                <dd className="text-slate-700">{tasks.length}</dd>
              </div>
              {isAdmin && (
                <div>
                  <dt className="text-slate-400">{uiText(isArabic, 'text0863')}</dt>
                  <dd className="text-slate-700">{project.ownerName || '—'}</dd>
                </div>
              )}
            </dl>

            {(canManage || isAdmin) && project.status !== 'Archived' && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {canManage && (
                  <button className="btn-secondary" onClick={startEdit}>
                    {uiText(isArabic, 'text0879')}
                  </button>
                )}
                {canManage && (
                  <button className="btn-secondary disabled:opacity-50" disabled={busy} onClick={handleArchiveToggle}>
                    {busy ? uiText(isArabic, 'text0881') : uiText(isArabic, 'text0882')}
                  </button>
                )}
                {canManage &&
                  (confirmDelete ? (
                    <>
                      <span className="self-center text-xs text-slate-500">{uiText(isArabic, 'text0864')}</span>
                      <button className="btn-danger disabled:opacity-50" disabled={busy} onClick={handleDelete}>
                        {busy ? uiText(isArabic, 'text0883') : uiText(isArabic, 'text0884')}
                      </button>
                      <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                        {uiText(isArabic, 'text0878')}
                      </button>
                    </>
                  ) : (
                    <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                      {uiText(isArabic, 'text0880')}
                    </button>
                  ))}
              </div>
            )}

            {canManage && project.status === 'Archived' && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <button className="btn-secondary disabled:opacity-50" disabled={busy} onClick={handleArchiveToggle}>
                  {busy ? uiText(isArabic, 'text0885') : uiText(isArabic, 'text0886')}
                </button>
              </div>
            )}

            {(error || deleteError) && (
              <p className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error || deleteError}
              </p>
            )}
          </>
        )}
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {uiText(isArabic, 'text0887')}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{filteredTasks.length} / {tasks.length}</span>
            {(canManage || isAdmin) && project.status !== 'Archived' && (
              <Link href={`/tasks/new?projectId=${id}`} className="btn-primary">
                + {uiText(isArabic, 'text0016')}
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            className="input xl:col-span-2"
            placeholder={uiText(isArabic, 'text1063')}
            value={taskSearch}
            onChange={(event) => setTaskSearch(event.target.value)}
          />
          <select className="input" value={taskStatus} onChange={(event) => setTaskStatus(event.target.value)}>
            <option value="">{uiText(isArabic, 'text1064')}</option>
            {taskStatuses.map((status) => (
              <option key={status} value={status}>{getLabel('task_status', status)}</option>
            ))}
          </select>
          <select className="input" value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)}>
            <option value="">{uiText(isArabic, 'text1065')}</option>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>{getLabel('task_priority', priority)}</option>
            ))}
          </select>
          <AvatarSelect
            users={users}
            value={taskAssigneeId}
            onChange={setTaskAssigneeId}
            placeholder={uiText(isArabic, 'text1066')}
          />
          <select className="input md:col-span-2 xl:col-span-1" value={taskType} onChange={(event) => setTaskType(event.target.value)}>
            <option value="">{uiText(isArabic, 'text1067')}</option>
            {taskTypes.map((type) => (
              <option key={type} value={type}>{getLabel('task_type', type)}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {uiText(isArabic, 'text0888')}
            </p>
          ) : (
            filteredTasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/view?id=${task.id}`}
                className="block px-1 py-3 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{task.title}</div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <StatusBadge value={task.taskType} listType="task_type" />
                    <StatusBadge value={task.priority} listType="task_priority" />
                    <StatusBadge value={task.status} listType="task_status" />
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-400">{uiText(isArabic, 'text0865')}</dt>
                    <dd className="text-slate-600">
                      {task.assignedTo ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={task.assignedTo.fullName} avatarUrl={task.assignedTo.avatarUrl} size="sm" className="shrink-0" />
                          <span className="truncate">{task.assignedTo.fullName}</span>
                        </span>
                      ) : (
                        uiText(isArabic, 'text0014')
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{uiText(isArabic, 'text0866')}</dt>
                    <dd className="text-slate-600">{(isArabic ? task.department?.valueAr : task.department?.valueEn) || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{uiText(isArabic, 'text0867')}</dt>
                    <dd className="text-slate-600">{task.deadlineDate || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">{uiText(isArabic, 'text0868')}</dt>
                    <dd className="text-slate-600">{task.createdBy?.fullName || '—'}</dd>
                  </div>
                </dl>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetailPage() {
  return (
    <ProtectedRoute>
      <ProjectDetailContent />
    </ProtectedRoute>
  );
}