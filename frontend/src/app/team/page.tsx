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


function t(isArabic: boolean, en: string, ar: string) {
  return isArabic ? ar : en;
}


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
          : t(isArabic, 'Could not load your team.', 'تعذر تحميل فريقك.'),
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
          : t(isArabic, 'Could not regenerate the invite link.', 'تعذر تجديد رابط الدعوة.'),
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
          {t(
            isArabic,
            'Employees who register through your invite link land here. Tasks and projects in this group stay between you and them.',
            'الموظفون الذين يسجّلون عبر رابط الدعوة الخاص بك يظهرون هنا. تبقى المهام والمشاريع في هذه المجموعة بينك وبينهم فقط.',
          )}
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-sm font-semibold text-slate-800">
          {t(isArabic, 'Invite link', 'رابط الدعوة')}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {t(
            isArabic,
            'Share this link with employees you want on your team. They register through it and are linked to you automatically.',
            'شارك هذا الرابط مع الموظفين الذين تريدهم في فريقك. يسجّلون من خلاله ويُربطون بك تلقائياً.',
          )}
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
              ? t(isArabic, 'Copied!', 'تم النسخ!')
              : t(isArabic, 'Copy', 'نسخ')}
          </button>

          <button
            type="button"
            className="btn shrink-0"
            disabled={regenerating}
            onClick={() => void regenerateLink()}
          >
            {regenerating
              ? t(isArabic, 'Regenerating\u2026', 'جارٍ التجديد\u2026')
              : t(isArabic, 'Regenerate link', 'تجديد الرابط')}
          </button>
        </div>

        <p className="mt-2 text-xs text-amber-600">
          {t(
            isArabic,
            'Regenerating invalidates the old link immediately.',
            'تجديد الرابط يلغي الرابط القديم فوراً.',
          )}
        </p>
      </div>

      <div className="card divide-y divide-slate-100">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">
            {t(isArabic, 'Members', 'الأعضاء')} ({team.members.length})
          </h2>
        </div>

        {team.members.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {t(
              isArabic,
              'No employees yet. Share your invite link above.',
              'لا يوجد موظفون بعد. شارك رابط الدعوة أعلاه.',
            )}
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
                  {t(isArabic, 'Inactive', 'غير نشط')}
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
