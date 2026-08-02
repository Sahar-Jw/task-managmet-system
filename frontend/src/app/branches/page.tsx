'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { ApiError } from '@/lib/api';
import { BranchesApi, DepartmentsApi } from '@/lib/endpoints';
import type { Branch, Department } from '@/lib/types';

function BranchesContent() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [branchForm, setBranchForm] = useState({ name: '', code: '', address: '' });
  const [deptForm, setDeptForm] = useState({ name: '', code: '' });

  async function load() {
    setLoading(true);
    const [b, d] = await Promise.all([BranchesApi.list(), DepartmentsApi.list()]);
    setBranches(b);
    setDepartments(d);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await BranchesApi.create(branchForm);
      setBranchForm({ name: '', code: '', address: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the branch.');
    }
  }

  async function createDepartment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await DepartmentsApi.create(deptForm);
      setDeptForm({ name: '', code: '' });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the department.');
    }
  }

  async function toggleBranchActive(branch: Branch) {
    setError('');
    try {
      await BranchesApi.update(branch.id, { isActive: !branch.isActive });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update the branch.');
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Branches</h1>

        <form onSubmit={createBranch} className="card mt-4 space-y-3 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                required
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Code</label>
              <input
                className="input"
                required
                value={branchForm.code}
                onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Address (optional)</label>
            <input
              className="input"
              value={branchForm.address}
              onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
            />
          </div>
          <button type="submit" className="btn-primary">
            Add branch
          </button>
        </form>

        <div className="mt-4 card divide-y divide-slate-100">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : (
            branches.map((b) => (
              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="font-medium text-slate-800">
                    {b.name} <span className="text-xs text-slate-400">({b.code})</span>
                  </div>
                  {b.address && <div className="text-xs text-slate-500">{b.address}</div>}
                </div>
                <button
                  className={`btn ${b.isActive ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => toggleBranchActive(b)}
                >
                  {b.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-800">Departments</h1>

        <form onSubmit={createDepartment} className="card mt-4 space-y-3 p-6">
          <p className="text-xs text-slate-400">
            Departments are a standalone list — not tied to a specific Branch.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input
                className="input"
                required
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Code</label>
              <input
                className="input"
                required
                value={deptForm.code}
                onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Add department
          </button>
        </form>

        <div className="mt-4 card divide-y divide-slate-100">
          {loading ? (
            <p className="p-6 text-center text-slate-500">Loading…</p>
          ) : (
            departments.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-4 py-3">
                <div className="font-medium text-slate-800">
                  {d.name} <span className="text-xs text-slate-400">({d.code})</span>
                </div>
                {!d.isActive && <span className="badge bg-slate-100 text-slate-500">Inactive</span>}
              </div>
            ))
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600 lg:col-span-2">{error}</p>}
    </div>
  );
}

export default function BranchesPage() {
  return (
    <ProtectedRoute adminOnly>
      <BranchesContent />
    </ProtectedRoute>
  );
}