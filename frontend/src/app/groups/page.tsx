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
import Pagination from '@/components/Pagination';


function t(isArabic: boolean, en: string, ar: string) {
  return isArabic ? ar : en;
}

function displayTeamName(name: string, isArabic: boolean) {
  if (!isArabic) return name;

  if (name === 'Team') return 'فريق';

  const suffix = "'s Team";
  return name.endsWith(suffix)
    ? `${name.slice(0, -suffix.length)} - فريق`
    : name;
}


function GroupsContent() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [teams, setTeams] = useState<Team[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});


  async function load() {
    setLoading(true);
    setError('');

    try {
      const data = await TeamsApi.listAll({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {}),
        ...(isActive ? { isActive } : {}),
      });
      setTeams(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t(isArabic, 'Could not load groups.', 'تعذر تحميل المجموعات.'),
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    void load();
  }, [page, search, isActive]);

  function updateFilter(setter: (value: string) => void, value: string) {
    setPage(1);
    setter(value);
  }


  function toggle(teamId: string) {
    setExpanded((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  }


  return (
    <div className="space-y-6" dir={isArabic ? 'rtl' : 'ltr'}>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          {t(isArabic, 'Groups', 'المجموعات')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t(
            isArabic,
            'Every Team Leader\u2019s group in one place \u2014 who leads it, and who is in it.',
            'كل مجموعة تابعة لقائد فريق في مكان واحد \u2014 من يقودها ومن أعضاؤها.',
          )}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          placeholder={t(isArabic, 'Search groups or leaders', 'ابحث عن المجموعات أو القادة')}
          value={search}
          onChange={(event) => updateFilter(setSearch, event.target.value)}
        />
        <select
          className="input"
          value={isActive}
          onChange={(event) => updateFilter(setIsActive, event.target.value)}
        >
          <option value="">{t(isArabic, 'All statuses', 'كل الحالات')}</option>
          <option value="true">{t(isArabic, 'Active', 'نشط')}</option>
          <option value="false">{t(isArabic, 'Inactive', 'غير نشط')}</option>
        </select>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="card divide-y divide-slate-100">
        {loading ? (
          <InlineLoader className="p-8" />
        ) : teams.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            {t(isArabic, 'No groups yet.', 'لا توجد مجموعات بعد.')}
          </p>
        ) : (
          teams.map((team) => (
            <div key={team.id} className="px-4 py-3">
              <button
                type="button"
                onClick={() => toggle(team.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <div className="font-medium text-slate-800">{displayTeamName(team.name, isArabic)}</div>
                  <div className="text-xs text-slate-500">
                    {t(isArabic, 'Leader:', 'القائد:')} {team.leaderName ?? '\u2014'}
                    {team.leaderEmail ? ` (${team.leaderEmail})` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="badge bg-slate-100 text-slate-600">
                    {team.members.length}{' '}
                    {t(isArabic, 'members', 'أعضاء')}
                  </span>

                  {!team.isActive && (
                    <span className="badge bg-slate-100 text-slate-500">
                      {t(isArabic, 'Inactive', 'غير نشط')}
                    </span>
                  )}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                      expanded[team.id] ? 'rotate-180' : ''
                    }`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </button>

              {expanded[team.id] && (
                <div className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {team.members.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-slate-400">
                      {t(isArabic, 'No members yet.', 'لا يوجد أعضاء بعد.')}
                    </p>
                  ) : (
                    team.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between px-3 py-2"
                      >
                        <div>
                          <div className="text-sm text-slate-800">{member.fullName}</div>
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
              )}
            </div>
          ))
        )}
      </div>

      {total > 0 && (
        <Pagination
          page={page}
          totalPages={Math.ceil(total / 20)}
          total={total}
          onPageChange={setPage}
          itemLabel={t(isArabic, 'groups', 'مجموعات')}
        />
      )}
    </div>
  );
}


export default function GroupsPage() {
  return (
    <ProtectedRoute adminOnly>
      <GroupsContent />
    </ProtectedRoute>
  );
}
