'use client';

import { uiText } from '@/lib/ui-text';


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
    en: uiText(false, 'text0683'),
    ar: uiText(true, 'text0683'),
  },

  Update: {
    en: uiText(false, 'text0684'),
    ar: uiText(true, 'text0684'),
  },

  Delete: {
    en: uiText(false, 'text0685'),
    ar: uiText(true, 'text0685'),
  },

  Approve: {
    en: uiText(false, 'text0686'),
    ar: uiText(true, 'text0686'),
  },

  Reject: {
    en: uiText(false, 'text0687'),
    ar: uiText(true, 'text0687'),
  },

  Assign: {
    en: uiText(false, 'text0688'),
    ar: uiText(true, 'text0688'),
  },

  Reassign: {
    en: uiText(false, 'text0689'),
    ar: uiText(true, 'text0689'),
  },

  StatusChange: {
    en: uiText(false, 'text0690'),
    ar: uiText(true, 'text0690'),
  },

  Login: {
    en: uiText(false, 'text0691'),
    ar: uiText(true, 'text0691'),
  },

  Logout: {
    en: uiText(false, 'text0692'),
    ar: uiText(true, 'text0692'),
  },

  LoginFailed: {
    en: uiText(false, 'text0693'),
    ar: uiText(true, 'text0693'),
  },

  AccountLocked: {
    en: uiText(false, 'text0694'),
    ar: uiText(true, 'text0694'),
  },

  AccountUnlocked: {
    en: uiText(false, 'text0695'),
    ar: uiText(true, 'text0695'),
  },

  Activate: {
    en: uiText(false, 'text0696'),
    ar: uiText(true, 'text0696'),
  },

  Deactivate: {
    en: uiText(false, 'text0697'),
    ar: uiText(true, 'text0697'),
  },

  Restore: {
    en: uiText(false, 'text0698'),
    ar: uiText(true, 'text0698'),
  },

  Archive: {
    en: uiText(false, 'text0699'),
    ar: uiText(true, 'text0699'),
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
      en: uiText(false, 'text0700'),
      ar: uiText(true, 'text0700'),
    },

    Project: {
      en: uiText(false, 'text0701'),
      ar: uiText(true, 'text0701'),
    },

    User: {
      en: uiText(false, 'text0702'),
      ar: uiText(true, 'text0702'),
    },

    Setting: {
      en: uiText(false, 'text0703'),
      ar: uiText(true, 'text0703'),
    },

    BrandingSettings: {
      en: uiText(false, 'text0704'),
      ar: uiText(true, 'text0704'),
    },

    TaskAttachment: {
      en: uiText(false, 'text0705'),
      ar: uiText(true, 'text0705'),
    },

    TaskAssignment: {
      en: uiText(false, 'text0706'),
      ar: uiText(true, 'text0706'),
    },

    TaskComment: {
      en: uiText(false, 'text0707'),
      ar: uiText(true, 'text0707'),
    },

    TaskRating: {
      en: uiText(false, 'text0708'),
      ar: uiText(true, 'text0708'),
    },

    Branch: {
      en: uiText(false, 'text0446'),
      ar: uiText(true, 'text0446'),
    },

    Department: {
      en: uiText(false, 'text0445'),
      ar: uiText(true, 'text0445'),
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


const AUDIT_FIELD_LABELS:
  Record<string, Parameters<typeof uiText>[1]> = {
  status: 'text0784',
  approvalStatus: 'text0785',
  title: 'text0786',
  titleEn: 'text0786',
  titleAr: 'text0786',
  name: 'text0787',
  fullName: 'text0787',
  email: 'text0788',
  isActive: 'text0789',
  assignedToId: 'text0790',
  assigneeId: 'text0791',
  approverId: 'text0792',
  deadlineDate: 'text0793',
  startDate: 'text0794',
  endDate: 'text0795',
  priority: 'text0796',
  taskType: 'text0797',
  roleId: 'text0798',
  roleName: 'text0798',
  departmentId: 'text0799',
  branchId: 'text0800',
  projectId: 'text0801',
  reason: 'text0802',
  assigneeCanDownloadAttachments: 'text0803',
  siteName: 'text0804',
  fileName: 'text0805',
  valueEn: 'text0806',
  valueAr: 'text0807',
  codeEn: 'text0808',
  codeAr: 'text0809',
};


const HIDDEN_AUDIT_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'version',
]);


const AUDIT_VALUE_LABELS:
  Record<string, Parameters<typeof uiText>[1]> = {
  Pending: 'text0810',
  Unassigned: 'text0811',
  InProgress: 'text0812',
  PendingApproval: 'text0813',
  Completed: 'text0814',
  Reopened: 'text0815',
  Finished: 'text0816',
  Archived: 'text0817',
  Approved: 'text0818',
  Rejected: 'text0819',
  NotRequired: 'text0820',
  Active: 'text0821',
  Inactive: 'text0822',
  ADMIN: 'text0823',
  USER: 'text0824',
};


function humanizeField(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}


function auditFieldLabel(key: string, isArabic: boolean) {
  const catalogKey = AUDIT_FIELD_LABELS[key];
  return catalogKey
    ? uiText(isArabic, catalogKey)
    : humanizeField(key);
}


function formatAuditValue(
  value: unknown,
  isArabic: boolean,
  locale: string,
) {
  if (value === null || value === undefined || value === '') {
    return uiText(isArabic, 'text0781');
  }

  if (typeof value === 'boolean') {
    return uiText(isArabic, value ? 'text0779' : 'text0780');
  }

  if (typeof value === 'string' && AUDIT_VALUE_LABELS[value]) {
    return uiText(isArabic, AUDIT_VALUE_LABELS[value]);
  }

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return value.includes('T')
        ? date.toLocaleString(locale)
        : date.toLocaleDateString(locale);
    }
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferred = isArabic
      ? record.valueAr || record.nameAr || record.titleAr || record.fullName
      : record.valueEn || record.nameEn || record.titleEn || record.fullName;
    return preferred ? String(preferred) : JSON.stringify(value);
  }

  return String(value);
}


function entityDisplayName(
  log: AuditLogEntry,
  isArabic: boolean,
) {
  const values = {
    ...(log.oldValue ?? {}),
    ...(log.newValue ?? {}),
  } as Record<string, unknown>;

  const candidates = isArabic
    ? [values.titleAr, values.valueAr, values.nameAr, values.fullName, values.fileName,
        values.siteName, values.titleEn, values.valueEn, values.nameEn]
    : [values.titleEn, values.valueEn, values.nameEn, values.fullName, values.fileName,
        values.siteName, values.titleAr, values.valueAr, values.nameAr];

  const match = candidates.find((value) => typeof value === 'string' && value.trim());
  return match ? String(match) : entityLabel(log.entityType, isArabic);
}


function changedAuditFields(log: AuditLogEntry) {
  const oldValue = log.oldValue ?? {};
  const newValue = log.newValue ?? {};

  return Object.keys({ ...oldValue, ...newValue })
    .filter((key) =>
      !HIDDEN_AUDIT_FIELDS.has(key) &&
      JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key]),
    )
    .map((key) => ({
      key,
      before: oldValue[key],
      after: newValue[key],
    }));
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
      uiText(isArabic, 'text0001')
    );

  const initial =
    log.actor?.fullName
      ?.trim()
      .charAt(0)
      .toUpperCase() ||
    'S';

  const targetName = entityDisplayName(log, isArabic);
  const changes = changedAuditFields(log);

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
                {targetName}
              </span>
            </div>


            {changes.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {uiText(isArabic, 'text0774')}
                  </span>

                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500 ring-1 ring-slate-200">
                    {uiText(isArabic, 'text0783', { value0: changes.length })}
                  </span>
                </div>


                <div className="grid gap-2 xl:grid-cols-2">
                  {changes.map((change) => (
                    <div
                      key={change.key}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="text-[11px] font-semibold text-slate-600">
                        {auditFieldLabel(change.key, isArabic)}
                      </div>

                      <div className="mt-1 flex min-w-0 items-center gap-2 text-xs">
                        <span className="min-w-0 truncate rounded-md bg-red-50 px-2 py-1 text-red-700 line-through decoration-red-300">
                          {formatAuditValue(change.before, isArabic, locale)}
                        </span>

                        <span className="shrink-0 text-slate-300" aria-hidden="true">
                          {isArabic ? '←' : '→'}
                        </span>

                        <span className="min-w-0 truncate rounded-md bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                          {formatAuditValue(change.after, isArabic, locale)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


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
                  {uiText(isArabic, 'text0003')}
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


            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400">
              <span>
                {uiText(isArabic, 'text0777')}: <span dir="ltr">{log.entityId}</span>
              </span>

              {log.ipAddress && (
                <span dir="ltr">IP: {log.ipAddress}</span>
              )}
            </div>
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
              {uiText(isArabic, 'text0004')}
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
        {uiText(isArabic, 'text0267')}
      </h3>


      <p className="mt-1 text-sm text-slate-400">
        {uiText(isArabic, 'text0268')}
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
              : uiText(isArabic, 'text0005'),
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
            {uiText(isArabic, 'text0006')}
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
            {uiText(isArabic, 'text0007')}
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
            {uiText(isArabic, 'text0269')}
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
                uiText(isArabic, 'text0270')
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
              {uiText(isArabic, 'text0008')}
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
              {uiText(isArabic, 'text0009')}
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
              ? uiText(isArabic, 'text0010')
              : uiText(isArabic, 'text0011')}
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
            {uiText(isArabic, 'text0271')}


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
                  {uiText(isArabic, 'text0272')}
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
                    {uiText(isArabic, 'text0273')}
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
                  {uiText(isArabic, 'text0274')}
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
                  {uiText(isArabic, 'text0012')}
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
                  {uiText(isArabic, 'text0275')}
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
            {uiText(isArabic, 'text0276')}
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
            uiText(isArabic, 'text0277')
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
