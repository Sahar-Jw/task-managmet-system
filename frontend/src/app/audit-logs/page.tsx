'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useLocale,
} from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import Pagination from '@/components/Pagination';

import {
  ApiError,
} from '@/lib/api';

import {
  AuditLogsApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  AuditLogEntry,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE = 20;

type SortDir =
  | 'asc'
  | 'desc';


/*
 * ============================================================
 * ACTION LABELS
 * ============================================================
 */

const ACTION_LABELS:
  Record<
    string,
    {
      en: string;
      ar: string;
    }
  > = {
  Create: {
    en: 'Created',
    ar: 'إنشاء',
  },

  Update: {
    en: 'Updated',
    ar: 'تعديل',
  },

  Delete: {
    en: 'Deleted',
    ar: 'حذف',
  },

  Approve: {
    en: 'Approved',
    ar: 'موافقة',
  },

  Reject: {
    en: 'Rejected',
    ar: 'رفض',
  },

  Assign: {
    en: 'Assigned',
    ar: 'إسناد',
  },

  Reassign: {
    en: 'Reassigned',
    ar: 'إعادة إسناد',
  },

  StatusChange: {
    en: 'Status changed',
    ar: 'تغيير الحالة',
  },

  Login: {
    en: 'Logged in',
    ar: 'تسجيل دخول',
  },

  Logout: {
    en: 'Logged out',
    ar: 'تسجيل خروج',
  },

  LoginFailed: {
    en: 'Failed login',
    ar: 'فشل تسجيل الدخول',
  },

  AccountLocked: {
    en: 'Account locked',
    ar: 'قفل الحساب',
  },

  AccountUnlocked: {
    en: 'Account unlocked',
    ar: 'فتح الحساب',
  },

  Activate: {
    en: 'Activated',
    ar: 'فعّل',
  },

  Deactivate: {
    en: 'Deactivated',
    ar: 'عطّل',
  },

  Restore: {
    en: 'Restored',
    ar: 'استعادة',
  },

  Archive: {
    en: 'Archived',
    ar: 'أرشفة',
  },
};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function actionLabel(
  action: string,
  isArabic: boolean,
) {
  const configured =
    ACTION_LABELS[action];

  if (!configured) {
    return action;
  }

  return isArabic
    ? configured.ar
    : configured.en;
}


function actionClasses(
  action: string,
) {
  switch (action) {
    case 'Create':
    case 'Restore':
    case 'Activate':
      return 'bg-green-50 text-green-700 ring-green-100';

    case 'Update':
    case 'StatusChange':
      return 'bg-blue-50 text-blue-700 ring-blue-100';

    case 'Assign':
    case 'Reassign':
      return 'bg-violet-50 text-violet-700 ring-violet-100';

    case 'Approve':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-100';

    case 'Reject':
    case 'LoginFailed':
    case 'AccountLocked':
    case 'Deactivate':
      return 'bg-red-50 text-red-700 ring-red-100';

    case 'Delete':
    case 'Archive':
      return 'bg-amber-50 text-amber-700 ring-amber-100';

    case 'Login':
    case 'Logout':
    case 'AccountUnlocked':
      return 'bg-slate-100 text-slate-600 ring-slate-200';

    default:
      return 'bg-slate-100 text-slate-600 ring-slate-200';
  }
}


function entityLabel(
  value: string,
  isArabic: boolean,
) {
  const labels:
    Record<
      string,
      {
        en: string;
        ar: string;
      }
    > = {
    Task: {
      en: 'Task',
      ar: 'مهمة',
    },

    Project: {
      en: 'Project',
      ar: 'مشروع',
    },

    User: {
      en: 'User',
      ar: 'مستخدم',
    },

    Setting: {
      en: 'Setting',
      ar: 'إعداد',
    },

    BrandingSettings: {
      en: 'Branding',
      ar: 'الهوية',
    },

    TaskAttachment: {
      en: 'Attachment',
      ar: 'مرفق',
    },

    TaskAssignment: {
      en: 'Assignment',
      ar: 'إسناد',
    },

    TaskComment: {
      en: 'Comment',
      ar: 'تعليق',
    },

    TaskRating: {
      en: 'Rating',
      ar: 'تقييم',
    },

    Branch: {
      en: 'Branch',
      ar: 'فرع',
    },

    Department: {
      en: 'Department',
      ar: 'قسم',
    },
  };

  const item =
    labels[value];

  if (!item) {
    return value;
  }

  return isArabic
    ? item.ar
    : item.en;
}


function formatDateTime(
  value: string,
  locale: string,
) {
  return new Date(value).toLocaleString(
    locale,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}


function getEntityLink(
  log: AuditLogEntry,
): string | null {
  switch (log.entityType) {
    case 'Task':
      return `/tasks/${log.entityId}`;

    case 'Project':
      return `/projects/${log.entityId}`;

    default:
      return null;
  }
}


/*
 * ============================================================
 * ACTION BADGE
 * ============================================================
 */

function ActionBadge({
  action,
  isArabic,
}: {
  action: string;
  isArabic: boolean;
}) {
  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2.5
        py-1
        text-[10px]
        font-semibold
        ring-1
        ${actionClasses(action)}
      `}
    >
      {actionLabel(
        action,
        isArabic,
      )}
    </span>
  );
}


/*
 * ============================================================
 * AUDIT ROW
 * ============================================================
 */

function AuditItem({
  log,
  isArabic,
  locale,
}: {
  log: AuditLogEntry;
  isArabic: boolean;
  locale: string;
}) {
  const entityLink =
    getEntityLink(log);

  const actorName =
    log.actor?.fullName ||
    (
      isArabic
        ? 'النظام'
        : 'System'
    );

  const initial =
    log.actor?.fullName
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    'S';

  const oldValue = log.oldValue ?? {};
  const newValue = log.newValue ?? {};
  const targetUserName =
    log.entityType === 'User'
      ? String(newValue.fullName || oldValue.fullName || '').trim()
      : '';
  const changedUserFields =
    log.entityType === 'User' && log.action === 'Update'
      ? Object.keys({ ...oldValue, ...newValue }).filter(
          (key) =>
            !['passwordHash', 'updatedAt', 'createdAt'].includes(key) &&
            JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key]),
        )
      : [];

  return (
    <article
      className="
        group
        rounded-2xl
        border
        border-slate-200
        bg-white
        px-5
        py-4
        transition
        hover:border-brand-200
        hover:shadow-sm
        sm:px-6
      "
    >
      <div
        className="
          flex
          flex-col
          gap-4
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >
        {/*
         * ====================================================
         * LEFT / MAIN INFORMATION
         * ====================================================
         */}

        <div className="flex min-w-0 items-start gap-3">
          {/*
           * USER AVATAR
           */}

          <div
            className="
              flex
              h-11
              w-11
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-brand-50
              text-sm
              font-semibold
              text-brand-700
            "
          >
            {initial}
          </div>


          <div className="min-w-0">
            {/*
             * BADGES
             */}

            <div className="flex flex-wrap items-center gap-2">
              <ActionBadge
                action={log.action}
                isArabic={isArabic}
              />

              <span
                className="
                  inline-flex
                  rounded-full
                  bg-slate-100
                  px-2.5
                  py-1
                  text-[10px]
                  font-medium
                  text-slate-600
                "
              >
                {entityLabel(
                  log.entityType,
                  isArabic,
                )}
              </span>
            </div>


            {/*
             * MAIN SENTENCE
             */}

            <div className="mt-2 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-900">
                {actorName}
              </span>

              {' '}

              <span>
                {actionLabel(
                  log.action,
                  isArabic,
                )}
              </span>

              {' '}

              <span className="font-medium text-slate-800">
                {targetUserName
                  ? targetUserName
                  : entityLabel(
                      log.entityType,
                      isArabic,
                    )}
              </span>

              {changedUserFields.length > 0 && (
                <span className="text-slate-500">
                  {' '}
                  ({isArabic ? 'تم تغيير: ' : 'changed: '}
                  {changedUserFields.join(', ')})
                </span>
              )}
            </div>


            {/*
             * REASON
             *
             * Only shown when there actually is a reason.
             */}

            {log.reason && (
              <div
                className="
                  mt-1
                  max-w-3xl
                  text-xs
                  leading-5
                  text-slate-500
                "
              >
                <span className="font-medium text-slate-600">
                  {isArabic
                    ? 'السبب: '
                    : 'Reason: '}
                </span>

                {log.reason}
              </div>
            )}


            {/*
             * USER EMAIL
             *
             * Useful normal information, but visually secondary.
             */}

            {log.actor?.email && (
              <div
                className="
                  mt-1
                  truncate
                  text-[11px]
                  text-slate-400
                "
              >
                {log.actor.email}
              </div>
            )}
          </div>
        </div>


        {/*
         * ====================================================
         * RIGHT SIDE
         * DATE + OPEN
         * ====================================================
         */}

        <div
          className="
            flex
            shrink-0
            flex-wrap
            items-center
            gap-3
          "
        >
          <div
            className="
              whitespace-nowrap
              text-xs
              text-slate-400
            "
            dir="ltr"
          >
            {formatDateTime(
              log.createdAt,
              locale,
            )}
          </div>


          {entityLink && (
            <Link
              href={entityLink}
              className="
                btn-secondary
                px-3
                py-1.5
                text-xs
              "
            >
              {isArabic
                ? 'فتح'
                : 'Open'}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}


/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState({
  isArabic,
}: {
  isArabic: boolean;
}) {
  return (
    <div
      className="
        flex
        min-h-[280px]
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-slate-200
        bg-white
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-12
          w-12
          items-center
          justify-center
          rounded-2xl
          bg-slate-100
          text-slate-400
        "
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            d="M6 4h9l3 3v13H6z"
            strokeWidth="1.7"
          />

          <path
            d="M9 11h6M9 15h6"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </svg>
      </div>


      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {isArabic
          ? 'لا توجد سجلات'
          : 'No audit entries found'}
      </h3>


      <p className="mt-1 text-sm text-slate-400">
        {isArabic
          ? 'جرّب تغيير عوامل التصفية.'
          : 'Try changing the filters.'}
      </p>
    </div>
  );
}


/*
 * ============================================================
 * MAIN CONTENT
 * ============================================================
 */

function AuditLogsContent() {
  const locale =
    useLocale();

  const isArabic =
    locale === 'ar';


  /*
   * ==========================================================
   * AUDIT DATA
   * ==========================================================
   */

  const [
    items,
    setItems,
  ] =
    useState<AuditLogEntry[]>([]);


  const [
    total,
    setTotal,
  ] =
    useState(0);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    page,
    setPage,
  ] =
    useState(1);


  /*
   * ==========================================================
   * FILTER DATA
   * ==========================================================
   */

  const [
    entityTypes,
    setEntityTypes,
  ] =
    useState<string[]>([]);


  const [
    actions,
    setActions,
  ] =
    useState<string[]>([]);


  const [
    users,
    setUsers,
  ] =
    useState<User[]>([]);


  /*
   * ==========================================================
   * FILTER VALUES
   * ==========================================================
   */

  const [
    search,
    setSearch,
  ] =
    useState('');


  const [
    debouncedSearch,
    setDebouncedSearch,
  ] =
    useState('');


  const [
    entityType,
    setEntityType,
  ] =
    useState('');


  const [
    action,
    setAction,
  ] =
    useState('');


  const [
    actorId,
    setActorId,
  ] =
    useState('');


  const [
    dateFrom,
    setDateFrom,
  ] =
    useState('');


  const [
    dateTo,
    setDateTo,
  ] =
    useState('');


  const [
    sortDir,
    setSortDir,
  ] =
    useState<SortDir>('desc');


  const [
    showFilters,
    setShowFilters,
  ] =
    useState(false);


  /*
   * ==========================================================
   * LOAD FILTER OPTIONS
   * ==========================================================
   */

  useEffect(() => {
    AuditLogsApi
      .meta()
      .then((result) => {
        setEntityTypes(
          result.entityTypes,
        );

        setActions(
          result.actions,
        );
      })
      .catch(() => {
        /*
         * The main audit request still works even if
         * filter metadata fails.
         */
      });


    UsersApi
      .list({
        limit: '100',
      })
      .then((result) => {
        const sorted =
          [...result.items].sort(
            (a, b) =>
              a.fullName.localeCompare(
                b.fullName,
              ),
          );

        setUsers(sorted);
      })
      .catch(() => {
        /*
         * Actor filter simply remains empty.
         */
      });
  }, []);


  /*
   * ==========================================================
   * SEARCH DEBOUNCE
   * ==========================================================
   */

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setDebouncedSearch(
            search.trim(),
          );
        },
        350,
      );

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    search,
  ]);


  /*
   * ==========================================================
   * LOAD AUDIT LOGS
   * ==========================================================
   */

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError('');

        try {
          const params:
            Record<
              string,
              string
            > = {
            page:
              String(page),

            limit:
              String(PAGE_SIZE),

            sortDir,
          };


          if (debouncedSearch) {
            params.search =
              debouncedSearch;
          }


          if (entityType) {
            params.entityType =
              entityType;
          }


          if (action) {
            params.action =
              action;
          }


          if (actorId) {
            params.actorId =
              actorId;
          }


          if (dateFrom) {
            params.dateFrom =
              dateFrom;
          }


          if (dateTo) {
            params.dateTo =
              dateTo;
          }


          const result =
            await AuditLogsApi.search(
              params,
            );


          setItems(
            result.items,
          );

          setTotal(
            result.total,
          );
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : isArabic
                ? 'تعذر تحميل سجل التدقيق.'
                : 'Could not load audit logs.',
          );
        } finally {
          setLoading(false);
        }
      },
      [
        page,
        sortDir,
        debouncedSearch,
        entityType,
        action,
        actorId,
        dateFrom,
        dateTo,
        isArabic,
      ],
    );


  useEffect(() => {
    load();
  }, [
    load,
  ]);


  /*
   * ==========================================================
   * RESET PAGE AFTER FILTER CHANGE
   * ==========================================================
   */

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    entityType,
    action,
    actorId,
    dateFrom,
    dateTo,
    sortDir,
  ]);


  /*
   * ==========================================================
   * FILTER STATE
   * ==========================================================
   */

  const hasFilters =
    Boolean(
      search ||
      entityType ||
      action ||
      actorId ||
      dateFrom ||
      dateTo,
    );


  const filterCount =
    [
      Boolean(search),
      Boolean(entityType),
      Boolean(action),
      Boolean(actorId),
      Boolean(
        dateFrom ||
        dateTo,
      ),
    ].filter(Boolean).length;


  function clearFilters() {
    setSearch('');
    setEntityType('');
    setAction('');
    setActorId('');
    setDateFrom('');
    setDateTo('');
  }


  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  const totalPages =
    Math.max(
      Math.ceil(
        total /
        PAGE_SIZE,
      ),
      1,
    );


  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div
      className="
        mx-auto
        max-w-[1500px]
        pb-12
      "
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ======================================================
       * HEADER
       * ======================================================
       */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          px-5
          py-6
          sm:px-7
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-32
            -top-32
            h-72
            w-72
            rounded-full
            bg-brand-50
            blur-3xl
          "
        />


        <div className="relative">
          <div
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[.14em]
              text-brand-600
            "
          >
            {isArabic
              ? 'نشاط النظام'
              : 'System activity'}
          </div>


          <h1
            className="
              mt-2
              text-2xl
              font-semibold
              tracking-[-0.03em]
              text-slate-950
              sm:text-3xl
            "
          >
            {isArabic
              ? 'سجل التدقيق'
              : 'Audit Log'}
          </h1>


          <p
            className="
              mt-2
              max-w-2xl
              text-sm
              leading-6
              text-slate-500
            "
          >
            {isArabic
              ? 'راجع الإجراءات المهمة التي قام بها المستخدمون والنظام.'
              : 'Review important actions performed by users and the system.'}
          </p>
        </div>
      </section>


      {/*
       * ======================================================
       * FILTER BAR
       * ======================================================
       */}

      <section
        className="
          mt-5
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-4
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            xl:flex-row
            xl:items-center
          "
        >
          {/*
           * SEARCH
           */}

          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className={`
                pointer-events-none
                absolute
                top-1/2
                h-4
                w-4
                -translate-y-1/2
                text-slate-400
                ${
                  isArabic
                    ? 'right-3'
                    : 'left-3'
                }
              `}
            >
              <circle
                cx="11"
                cy="11"
                r="6"
                strokeWidth="1.8"
              />

              <path
                d="m16 16 4 4"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>


            <input
              className={`
                input
                ${
                  isArabic
                    ? 'pr-9'
                    : 'pl-9'
                }
              `}
              placeholder={
                isArabic
                  ? 'ابحث بالمستخدم أو السبب…'
                  : 'Search user or reason…'
              }
              value={search}
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );
              }}
            />
          </div>


          {/*
           * TYPE
           */}

          <select
            className="input xl:w-[190px]"
            value={entityType}
            onChange={(event) => {
              setEntityType(
                event.target.value,
              );
            }}
          >
            <option value="">
              {isArabic
                ? 'كل الأنواع'
                : 'All types'}
            </option>


            {entityTypes.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {entityLabel(
                    item,
                    isArabic,
                  )}
                </option>
              ),
            )}
          </select>


          {/*
           * ACTION
           */}

          <select
            className="input xl:w-[190px]"
            value={action}
            onChange={(event) => {
              setAction(
                event.target.value,
              );
            }}
          >
            <option value="">
              {isArabic
                ? 'كل الإجراءات'
                : 'All actions'}
            </option>


            {actions.map(
              (item) => (
                <option
                  key={item}
                  value={item}
                >
                  {actionLabel(
                    item,
                    isArabic,
                  )}
                </option>
              ),
            )}
          </select>


          {/*
           * SORT
           */}

          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => {
              setSortDir(
                (current) =>
                  current === 'desc'
                    ? 'asc'
                    : 'desc',
              );
            }}
          >
            {sortDir === 'desc'
              ? '↓'
              : '↑'}

            {' '}

            {sortDir === 'desc'
              ? isArabic
                ? 'الأحدث'
                : 'Newest'
              : isArabic
                ? 'الأقدم'
                : 'Oldest'}
          </button>


          {/*
           * MORE FILTERS
           */}

          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => {
              setShowFilters(
                (current) =>
                  !current,
              );
            }}
          >
            {isArabic
              ? 'التصفية'
              : 'Filters'}


            {filterCount > 0 && (
              <span
                className="
                  ml-1.5
                  rounded-full
                  bg-brand-100
                  px-1.5
                  py-0.5
                  text-[10px]
                  font-semibold
                  text-brand-700
                "
              >
                {filterCount}
              </span>
            )}
          </button>
        </div>


        {/*
         * ====================================================
         * EXTRA FILTERS
         * ====================================================
         */}

        {showFilters && (
          <div
            className="
              mt-4
              border-t
              border-slate-100
              pt-4
            "
          >
            <div
              className="
                grid
                gap-4
                sm:grid-cols-2
                lg:grid-cols-3
              "
            >
              {/*
               * USER
               */}

              <div>
                <label className="label">
                  {isArabic
                    ? 'المستخدم'
                    : 'User'}
                </label>


                <select
                  className="input"
                  value={actorId}
                  onChange={(event) => {
                    setActorId(
                      event.target.value,
                    );
                  }}
                >
                  <option value="">
                    {isArabic
                      ? 'كل المستخدمين'
                      : 'All users'}
                  </option>


                  {users.map(
                    (user) => (
                      <option
                        key={user.id}
                        value={user.id}
                      >
                        {user.fullName}
                      </option>
                    ),
                  )}
                </select>
              </div>


              {/*
               * DATE FROM
               */}

              <div>
                <label className="label">
                  {isArabic
                    ? 'من تاريخ'
                    : 'Date from'}
                </label>


                <input
                  type="date"
                  className="input"
                  value={dateFrom}
                  max={
                    dateTo ||
                    undefined
                  }
                  onChange={(event) => {
                    setDateFrom(
                      event.target.value,
                    );
                  }}
                />
              </div>


              {/*
               * DATE TO
               */}

              <div>
                <label className="label">
                  {isArabic
                    ? 'إلى تاريخ'
                    : 'Date to'}
                </label>


                <input
                  type="date"
                  className="input"
                  value={dateTo}
                  min={
                    dateFrom ||
                    undefined
                  }
                  onChange={(event) => {
                    setDateTo(
                      event.target.value,
                    );
                  }}
                />
              </div>
            </div>


            {hasFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="
                    text-sm
                    font-medium
                    text-red-600
                    hover:text-red-700
                  "
                  onClick={clearFilters}
                >
                  {isArabic
                    ? 'مسح عوامل التصفية'
                    : 'Clear filters'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>


      {/*
       * ======================================================
       * RESULT COUNT
       * ======================================================
       */}

      <div
        className="
          mt-5
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">
            {total}
          </span>

          {' '}

          {isArabic
            ? 'سجل'
            : total === 1
              ? 'entry'
              : 'entries'}
        </div>


        {hasFilters && (
          <button
            type="button"
            className="
              text-xs
              font-medium
              text-brand-600
              hover:text-brand-800
            "
            onClick={clearFilters}
          >
            {isArabic
              ? 'إعادة تعيين'
              : 'Reset filters'}
          </button>
        )}
      </div>


      {/*
       * ======================================================
       * ERROR
       * ======================================================
       */}

      {error && (
        <div
          className="
            mt-4
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-4
            text-sm
            text-red-700
          "
        >
          {error}
        </div>
      )}


      {/*
       * ======================================================
       * LOADING
       * ======================================================
       */}

      {loading ? (
        <div className="mt-4 space-y-3">
          {[
            1,
            2,
            3,
            4,
            5,
          ].map(
            (item) => (
              <div
                key={item}
                className="
                  h-24
                  animate-pulse
                  rounded-2xl
                  bg-slate-100
                "
              />
            ),
          )}
        </div>
      ) : items.length === 0 ? (
        /*
         * ====================================================
         * EMPTY
         * ====================================================
         */

        <div className="mt-4">
          <EmptyState
            isArabic={isArabic}
          />
        </div>
      ) : (
        /*
         * ====================================================
         * AUDIT LIST
         * ====================================================
         */

        <div className="mt-4 space-y-3">
          {items.map(
            (log) => (
              <AuditItem
                key={log.id}
                log={log}
                isArabic={isArabic}
                locale={locale}
              />
            ),
          )}
        </div>
      )}


      {/*
       * ======================================================
       * PAGINATION
       * ======================================================
       */}

      {!loading && !error && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          itemLabel={
            isArabic
              ? 'سجلات'
              : 'entries'
          }
        />
      )}
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function AuditLogsPage() {
  return (
    <ProtectedRoute adminOnly>
      <AuditLogsContent />
    </ProtectedRoute>
  );
}