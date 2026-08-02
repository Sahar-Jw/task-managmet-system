'use client';

import { useEffect, useState } from 'react';
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

  async function load() {
    setLoading(true);
    try {
      const res = await ProjectsApi.list({ limit: '100' });
      setProjects(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load projects.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Projects</h1>
        
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
            <div key={p.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">{p.name}</div>
                {p.description && <div className="text-xs text-slate-500">{p.description}</div>}
              </div>
              <StatusBadge value={p.status} />
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