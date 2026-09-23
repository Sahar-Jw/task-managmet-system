'use client';

import {
  useEffect,
  useState,
} from 'react';

import { useLocale } from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import InlineLoader from '@/components/InlineLoader';
import { ApiError } from '@/lib/api';
import { TeamsApi } from '@/lib/endpoints';
import type { Team } from '@/lib/types';
import { uiText } from '@/lib/ui-text';


function TeamContent() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);


  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await TeamsApi.my();
      setTeam(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text1232'),
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void load();

    function reloadOnFocus() {
      void load();
    }

    window.addEventListener('focus', reloadOnFocus);

    return () => {
      window.removeEventListener('focus', reloadOnFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function copyInviteLink() {
    if (!team?.inviteLink) return;

    try {
      await navigator.clipboard.writeText(team.inviteLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, non-secure context); the
      // link is still visible in the input for manual copy.
    }
  }


  async function regenerateLink() {
    setRegenerating(true);
    setError('');

    try {
      const result = await TeamsApi.regenerateInviteLink();

      setTeam((prev) =>
        prev
          ? { ...prev, inviteToken: result.inviteToken, inviteLink: result.inviteLink }
          : prev,
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text1233'),
      );
    } finally {
      setRegenerating(false);
    }
  }


  if (loading) {
    return <InlineLoader className="min-h-[40vh]" />;
  }

  if (error && !team) {
    return (
      <div className="card mt-8 p-8 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">{team.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {uiText(isArabic, 'text1234')}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-800">
          {uiText(isArabic, 'text1235')}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {uiText(isArabic, 'text1236')}
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            className="input flex-1"
            value={team.inviteLink ?? ''}
            onFocus={(event) => event.target.select()}
          />

          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => void copyInviteLink()}
          >
            {copied
              ? uiText(isArabic, 'text1237')
              : uiText(isArabic, 'text1238')}
          </button>

          <button
            type="button"
            className="btn shrink-0"
            disabled={regenerating}
            onClick={() => void regenerateLink()}
          >
            {regenerating
              ? uiText(isArabic, 'text1239')
              : uiText(isArabic, 'text1240')}
          </button>
        </div>

        <p className="mt-2 text-xs text-amber-600">
          {uiText(isArabic, 'text1241')}
        </p>
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {uiText(isArabic, 'text1242')} ({team.members.length})
          </h2>
        </div>

        {team.members.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {uiText(isArabic, 'text1243')}
          </p>
        ) : (
          team.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="font-medium text-slate-800">{member.fullName}</div>
                <div className="text-xs text-slate-500">{member.email}</div>
              </div>

              {!member.isActive && (
                <span className="badge bg-slate-100 text-slate-500">
                  {uiText(isArabic, 'text1244')}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}


export default function TeamPage() {
  return (
    <ProtectedRoute allowedRoles={['TEAM_LEADER']}>
      <TeamContent />
    </ProtectedRoute>
  );
}
