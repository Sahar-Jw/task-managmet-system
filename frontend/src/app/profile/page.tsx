'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { UsersApi } from '@/lib/endpoints';

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await UsersApi.updateOwnProfile({ fullName, phone });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your profile.');
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-slate-800">Your profile</h1>

      <form onSubmit={handleSubmit} className="card mt-4 space-y-4 p-6">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-slate-50" value={user.email} disabled />
          <p className="mt-1 text-xs text-slate-400">
            Email and role changes require Admin action.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="label">Role</span>
            <span className="text-slate-700">{user.role.name}</span>
          </div>
          <div>
            <span className="label">Department ID</span>
            <span className="text-slate-700">{user.departmentId}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Saved.</p>}

        <button type="submit" className="btn-primary">
          Save changes
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
