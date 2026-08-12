'use client';

import { useEffect, useRef, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';
import { DepartmentsApi, UsersApi } from '@/lib/endpoints';
import type { Department } from '@/lib/types';

const MAX_AVATAR_MB = 5;

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [department, setDepartment] = useState<Department | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.departmentId) return;
    DepartmentsApi.list()
      .then((departments) => {
        setDepartment(departments.find((d) => d.id === user.departmentId) ?? null);
      })
      .catch(() => setDepartment(null));
  }, [user?.departmentId]);

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

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setAvatarError('');
    if (!file.type.startsWith('image/')) {
      setAvatarError('Please choose an image file.');
      return;
    }
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setAvatarError(`Image must be under ${MAX_AVATAR_MB}MB.`);
      return;
    }

    setAvatarUploading(true);
    try {
      await UsersApi.uploadAvatar(file);
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : 'Could not upload photo.');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarError('');
    setAvatarUploading(true);
    try {
      await UsersApi.removeAvatar();
      await refreshUser();
    } catch (err) {
      setAvatarError(err instanceof ApiError ? err.message : 'Could not remove photo.');
    } finally {
      setAvatarUploading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-xl font-semibold text-slate-800">Your profile</h1>

      <div className="card mt-4 flex items-center gap-4 p-6">
        <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size="lg" />
        <div>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={avatarUploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarUploading ? 'Uploading…' : 'Change photo'}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                disabled={avatarUploading}
                onClick={handleRemoveAvatar}
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={handleAvatarSelect}
          />
          <p className="mt-1 text-xs text-slate-400">PNG, JPG, WEBP or GIF. Up to {MAX_AVATAR_MB}MB.</p>
          {avatarError && <p className="mt-1 text-sm text-red-600">{avatarError}</p>}
        </div>
      </div>

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
            <span className="label">Department</span>
            <span className="text-slate-700">
              {department ? `${department.valueEn} (${department.codeEn})` : user.departmentId || '—'}
            </span>
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