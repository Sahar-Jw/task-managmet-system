'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ApiError } from '@/lib/api';
import { BranchesApi, DepartmentsApi, UsersApi } from '@/lib/endpoints';
import type { Branch, Department, User } from '@/lib/types';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M13.5 3.5a1.5 1.5 0 0 1 2.12 0l.88.88a1.5 1.5 0 0 1 0 2.12l-8.5 8.5-3.5.88.88-3.5 8.12-8.88Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
      <path
        d="M4 6h12M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6m-6.5 0 .6 9.02A1.5 1.5 0 0 0 7.6 16.5h4.8a1.5 1.5 0 0 0 1.5-1.48L14.5 6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ---- Edit ----
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    roleId: '',
    branchId: '',
    departmentId: '',
  });
  const [editError, setEditError] = useState('');

  // ---- Delete confirm toast ----
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await UsersApi.list({ limit: String(PAGE_SIZE), page: String(page) });
      setUsers(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    UsersApi.roles().then(setRoles).catch(() => {});
    BranchesApi.list().then(setBranches).catch(() => {});
    DepartmentsApi.list().then(setDepartments).catch(() => {});
  }, []);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

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

  function openEdit(u: User) {
    setEditError('');
    setEditingUser(u);
    setEditForm({
      fullName: u.fullName,
      email: u.email,
      roleId: u.roleId ?? u.role?.id ?? '',
      branchId: u.branchId ?? '',
      departmentId: u.departmentId ?? '',
    });
  }

  function closeEdit() {
    setEditingUser(null);
    setEditError('');
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');
    try {
      await UsersApi.adminUpdate(editingUser.id, editForm);
      closeEdit();
      load();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Could not update the user.');
    }
  }

  function askDelete(u: User) {
    setDeleteError('');
    setPendingDelete(u);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteError('');
    try {
      await UsersApi.remove(pendingDelete.id);
      setPendingDelete(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Could not delete the user.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Users</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Accounts are created via self-registration. Admins can edit, deactivate, or remove
        existing accounts below.
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {editingUser && (
        <form onSubmit={handleEditSave} className="card mt-4 space-y-3 p-6">
          <h2 className="text-sm font-semibold text-slate-800">Edit {editingUser.fullName}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full name</label>
              <input
                className="input"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                required
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Role</label>
              <select
                className="input"
                required
                value={editForm.roleId}
                onChange={(e) => setEditForm({ ...editForm, roleId: e.target.value })}
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
                value={editForm.branchId}
                onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value })}
              >
                <option value="">Select…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.valueEn} ({b.codeEn})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Department</label>
              <select
                className="input"
                required
                value={editForm.departmentId}
                onChange={(e) => setEditForm({ ...editForm, departmentId: e.target.value })}
              >
                <option value="">Select…</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.valueEn} ({d.codeEn})
                  </option>
                ))}
              </select>
            </div>
          </div>
          {editError && <p className="text-sm text-red-600">{editError}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              Save changes
            </button>
            <button type="button" className="btn-secondary" onClick={closeEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

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
                <button
                  className={`btn ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleActive(u)}
                >
                  {u.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  className="icon-btn"
                  title="Edit user"
                  aria-label={`Edit ${u.fullName}`}
                  onClick={() => openEdit(u)}
                >
                  <PencilIcon />
                </button>
                <button
                  className="icon-btn-danger"
                  title="Delete user"
                  aria-label={`Delete ${u.fullName}`}
                  onClick={() => askDelete(u)}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel="users"
        />
      )}

      {pendingDelete && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          <p className="text-sm font-medium text-slate-800">
            Permanently delete {pendingDelete.fullName}?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            This removes the account from the database and can&apos;t be undone.
          </p>
          {deleteError && <p className="mt-2 text-xs text-red-600">{deleteError}</p>}
          <div className="mt-3 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setPendingDelete(null)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={confirmDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
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