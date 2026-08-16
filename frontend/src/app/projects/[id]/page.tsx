'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ProjectsApi, TasksApi } from '@/lib/endpoints';
import type { Project, Task } from '@/lib/types';

function ProjectDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role.name === 'ADMIN';

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Admin can see every task in the project; a regular User only ever
      // sees their own tasks, so scope "mine" down to this project instead.
      const fetchTasks = isAdmin
        ? TasksApi.list({ projectId: id, limit: '100' })
        : TasksApi.mine({ projectId: id, limit: '100' });
      const [p, t] = await Promise.all([ProjectsApi.get(id), fetchTasks]);
      setProject(p);
      setTasks(t.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this project.');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!project) return <p className="text-red-600">{error || 'Project not found.'}</p>;

  const canManage = isAdmin || project.createdById === user?.id;

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
      setEditError(err instanceof ApiError ? err.message : 'Could not update the project.');
    }
  }

  async function handleDelete() {
    setBusy(true);
    setDeleteError('');
    try {
      await ProjectsApi.remove(id);
      router.push('/projects');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete this project.');
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
      setError(err instanceof ApiError ? err.message : 'Could not update the project status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <button onClick={() => router.push('/projects')} className="text-sm text-brand-600 hover:underline">
          ← Back to projects
        </button>

        {editing ? (
          <form onSubmit={handleUpdate} className="mt-4 space-y-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Description</label>
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
                Save
              </button>
              <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
                Cancel
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
                <dt className="text-slate-400">Start date</dt>
                <dd className="text-slate-700">{project.startDate || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">End date</dt>
                <dd className="text-slate-700">{project.endDate || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Tasks</dt>
                <dd className="text-slate-700">{tasks.length}</dd>
              </div>
              {isAdmin && (
                <div>
                  <dt className="text-slate-400">Owner</dt>
                  <dd className="text-slate-700">{project.ownerName || '—'}</dd>
                </div>
              )}
            </dl>

            {(canManage || isAdmin) && project.status !== 'Archived' && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {canManage && (
                  <button className="btn-secondary" onClick={startEdit}>
                    Edit
                  </button>
                )}
                {isAdmin && (
                  <button className="btn-secondary disabled:opacity-50" disabled={busy} onClick={handleArchiveToggle}>
                    {busy ? 'Archiving…' : 'Archive'}
                  </button>
                )}
                {canManage &&
                  (confirmDelete ? (
                    <>
                      <span className="self-center text-xs text-slate-500">Are you sure?</span>
                      <button className="btn-danger disabled:opacity-50" disabled={busy} onClick={handleDelete}>
                        {busy ? 'Deleting…' : 'Confirm delete'}
                      </button>
                      <button className="btn-secondary" onClick={() => setConfirmDelete(false)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
                      Delete
                    </button>
                  ))}
              </div>
            )}

            {isAdmin && project.status === 'Archived' && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <button className="btn-secondary disabled:opacity-50" disabled={busy} onClick={handleArchiveToggle}>
                  {busy ? 'Unarchiving…' : 'Unarchive'}
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Tasks in this project
        </h2>

        <div className="mt-3 divide-y divide-slate-100">
          {tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No tasks in this project yet.
            </p>
          ) : (
            tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block px-1 py-3 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">{task.titleEn}</div>
                    {task.titleAr && (
                      <div dir="rtl" className="truncate text-xs text-slate-500">
                        {task.titleAr}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
                    <StatusBadge value={task.taskType} listType="task_type" />
                    <StatusBadge value={task.priority} listType="task_priority" />
                    <StatusBadge value={task.status} listType="task_status" />
                  </div>
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4">
                  <div>
                    <dt className="text-slate-400">For whom</dt>
                    <dd className="text-slate-600">{task.assignedTo?.fullName || 'Unassigned'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Department</dt>
                    <dd className="text-slate-600">{task.department?.valueEn || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Deadline</dt>
                    <dd className="text-slate-600">{task.deadlineDate || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Created by</dt>
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