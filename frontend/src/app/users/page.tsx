'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ApiError } from '@/lib/api';
import { BranchesApi, DepartmentsApi, UsersApi } from '@/lib/endpoints';
import type { Branch, Department, User } from '@/lib/types';

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    branchId: '',
    departmentId: '',
  });

  async function load() {
    setLoading(true);
    try {
      const res = await UsersApi.list({ limit: '100' });
      setUsers(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    UsersApi.roles().then(setRoles).catch(() => {});
    BranchesApi.list().then(setBranches).catch(() => {});
    DepartmentsApi.list().then(setDepartments).catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await UsersApi.create(form);
      setForm({ fullName: '', email: '', password: '', roleId: '', branchId: '', departmentId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the user.');
    }
  }

  async function toggleActive(u: User) {
    setError('');
    try {
      if (u.isActive) await UsersApi.deactivate(u.id);
      else await UsersApi.adminUpdate(u.id, { isActive: true } as any);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the user.');
    }
  }

  async function unlock(u: User) {
    setError('');
    try {
      await UsersApi.unlock(u.id);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not unlock the user.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Users</h1>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New user'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mt-4 space-y-3 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input
              type="password"
              className="input"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                required
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              >
                <option value="">Select…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Branch</label>
              <select
                className="input"
                required
                value={form.branchId}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              >
                <option value="">Select…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select
                className="input"
                required
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">Select…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="btn-primary">
            Create user
          </button>
        </form>
      )}

      {!showForm && error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 card divide-y divide-slate-100">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">{u.fullName}</div>
                <div className="text-xs text-slate-500">
                  {u.email} · {u.role.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!u.isActive && (
                  <span className="badge bg-slate-100 text-slate-500">Inactive</span>
                )}
                <button className="btn-secondary" onClick={() => unlock(u)}>
                  Unlock
                </button>
                <button
                  className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <ProtectedRoute adminOnly>
      <UsersContent />
    </ProtectedRoute>
  );
}