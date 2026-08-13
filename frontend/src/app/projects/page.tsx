'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { ProjectsApi } from '@/lib/endpoints';
import type { Project } from '@/lib/types';

function ProjectsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role.name === 'ADMIN';

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });

  // Editing an existing project (id === project being edited, or null)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [editError, setEditError] = useState('');

  // Row-level busy/error state for delete & archive actions
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Backend already scopes this: a regular User only gets back their
      // own Projects, Admin gets everything.
      const res = await ProjectsApi.list({ limit: '100' });
      setProjects(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await ProjectsApi.create(form);
      setForm({ name: '', description: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the project.');
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setEditForm({ name: project.name, description: project.description || '' });
    setEditError('');
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError('');
  }

  async function handleUpdate(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditError('');
    try {
      const updated = await ProjectsApi.update(id, editForm);
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
      setEditingId(null);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Could not update the project.');
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    setRowError(null);
    try {
      await ProjectsApi.remove(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setConfirmDeleteId(null);
    } catch (err) {
      setRowError({
        id,
        message: err instanceof ApiError ? err.message : 'Could not delete this project.',
      });
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(id: string) {
    setBusyId(id);
    setRowError(null);
    try {
      const updated = await ProjectsApi.archive(id);
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    } catch (err) {
      setRowError({
        id,
        message: err instanceof ApiError ? err.message : 'Could not archive this project.',
      });
    } finally {
      setBusyId(null);
    }
  }

  function canManage(project: Project) {
    return isAdmin || project.createdById === user?.id;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? 'All projects across the organization.' : 'Projects you created.'}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mt-4 space-y-3 p-6">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary">
            Create project
          </button>
        </form>
      )}

      {error && !showForm && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-4 card divide-y divide-slate-100">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : projects.length === 0 ? (
          <p className="p-6 text-center text-slate-500">No projects yet.</p>
        ) : (
          projects.map((p) => (
            <div key={p.id} className="px-4 py-3">
              {editingId === p.id ? (
                <form onSubmit={(e) => handleUpdate(e, p.id)} className="space-y-3">
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
                      rows={2}
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                  {editError && <p className="text-sm text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary px-3 py-1 text-xs">
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-secondary px-3 py-1 text-xs"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <Link href={`/projects/${p.id}`} className="min-w-0 flex-1 hover:underline">
                    <div className="truncate font-medium text-slate-800">{p.name}</div>
                    {p.description && (
                      <div className="truncate text-xs text-slate-500">{p.description}</div>
                    )}
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge value={p.status} />
                    {canManage(p) && p.status !== 'Archived' && (
                      <button
                        className="btn-secondary px-3 py-1 text-xs"
                        onClick={() => startEdit(p)}
                      >
                        Edit
                      </button>
                    )}
                    {isAdmin && p.status !== 'Archived' && (
                      <button
                        className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
                        disabled={busyId === p.id}
                        onClick={() => handleArchive(p.id)}
                      >
                        {busyId === p.id ? 'Archiving…' : 'Archive'}
                      </button>
                    )}
                    {canManage(p) &&
                      (confirmDeleteId === p.id ? (
                        <>
                          <span className="text-xs text-slate-500">Delete?</span>
                          <button
                            className="btn-danger px-3 py-1 text-xs disabled:opacity-50"
                            disabled={busyId === p.id}
                            onClick={() => handleDelete(p.id)}
                          >
                            {busyId === p.id ? 'Deleting…' : 'Confirm'}
                          </button>
                          <button
                            className="btn-secondary px-3 py-1 text-xs"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn-danger px-3 py-1 text-xs"
                          onClick={() => setConfirmDeleteId(p.id)}
                        >
                          Delete
                        </button>
                      ))}
                  </div>
                </div>
              )}
              {rowError?.id === p.id && (
                <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-600">
                  {rowError.message}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}