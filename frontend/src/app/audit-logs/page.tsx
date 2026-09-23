'use client';

import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';

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
import Avatar from '@/components/Avatar';

import {
  ApiError,
} from '@/lib/api';

import {
  AuditLogsApi,
} from '@/lib/endpoints';

import type {
  AuditLogEntry,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE = 20;


/*
 * ============================================================
 * ACTION LABELS
 * ============================================================
 */

const ACTION_TEXT_KEYS: Record<string, Parameters<typeof uiText>[1]> = {
  Create: 'text0683',
  Update: 'text0684',
  Delete: 'text0685',
  Approve: 'text0686',
  Reject: 'text0687',
  Assign: 'text0688',
  Accept: 'text1049',
  Reassign: 'text0689',
  StatusChange: 'text0690',
  Login: 'text0691',
  Logout: 'text0692',
  LoginFailed: 'text0693',
  AccountLocked: 'text0694',
  AccountUnlocked: 'text0695',
  Activate: 'text0696',
  Deactivate: 'text0697',
  Restore: 'text0698',
  Archive: 'text0699',
};

function actionLabel(action: string, isArabic: boolean) {
  const key = ACTION_TEXT_KEYS[action];
  return key ? uiText(isArabic, key) : action;
}

function actionClasses(action: string) {
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

    case 'Accept':
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


/*
 * ============================================================
 * ENTITY LABELS
 * ============================================================
 */

const ENTITY_TEXT_KEYS: Record<string, Parameters<typeof uiText>[1]> = {
  Task: 'text0700',
  Project: 'text0701',
  User: 'text0702',
  Setting: 'text0703',
  BrandingSettings: 'text0704',
  TaskAttachment: 'text0705',
  TaskAssignment: 'text0706',
  AssignmentApproval: 'text0706',
  TaskComment: 'text0707',
  TaskRating: 'text0708',
  Branch: 'text0446',
  Department: 'text0445',
  Dictionary: 'text0831',
};

function entityLabel(value: string, isArabic: boolean) {
  const key = ENTITY_TEXT_KEYS[value];
  return key ? uiText(isArabic, key) : value;
}


/*
 * ============================================================
 * REASON LABELS
 * ============================================================
 *
 * `reason` on an audit log entry is either:
 *
 * 1. A system-generated code (prefixed "SYS_") — translatable,
 *    looked up below.
 * 2. Free text typed by a user (a rejection reason, a reassignment
 *    note, etc.) — not translatable, shown exactly as written.
 * 3. Legacy plain-English text written before system reasons were
 *    coded (older rows) — also shown as-is, same as free text.
 *
 * Only case 1 is translated; 2 and 3 fall through unchanged, which
 * is the correct behavior for both (arbitrary user content, and
 * historical rows we can't rewrite since audit logs are immutable).
 */

const REASON_TEXT_KEYS: Record<string, Parameters<typeof uiText>[1]> = {
  SYS_PASSWORD_CHANGED_BY_USER: 'text1095',
  SYS_SELF_SERVICE_REGISTRATION: 'text1096',
  SYS_AVATAR_UPDATED: 'text1097',
  SYS_AVATAR_REMOVED: 'text1098',
  SYS_ACCOUNT_DEACTIVATED_BY_ADMIN: 'text1099',
  SYS_PERMANENT_DELETION_BY_ADMIN: 'text1100',
  SYS_HARD_DELETE: 'text1101',
  SYS_TASK_COMPLETION_DERIVED: 'text1102',
  SYS_ATTACHMENT_DELETED_BY_OWNER: 'text1103',
  SYS_SITE_BRANDING_UPDATED: 'text1104',
};

function reasonLabel(reason: string, isArabic: boolean) {
  const key = REASON_TEXT_KEYS[reason];
  if (key) return uiText(isArabic, key);

  const locked = reason.match(/^Locked after (\d+) consecutive failed login attempts$/);
  if (locked) return uiText(isArabic, 'text1227', { value0: locked[1] });

  const legacyReasons: Record<string, Parameters<typeof uiText>[1]> = {
    'Password reset via forgot-password flow': 'text1228',
    'Updated bilingual application dictionary': 'text1229',
    'Moderated by Admin': 'text1230',
    'Department reassignment by Admin (BR-010)': 'text1231',
  };

  return legacyReasons[reason] ? uiText(isArabic, legacyReasons[reason]) : reason;
}


/*
 * ============================================================
 * VALUE / FIELD FORMATTING (used inside the details drawer)
 * ============================================================
 */

const AUDIT_FIELD_LABELS: Record<string, Parameters<typeof uiText>[1]> = {
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
  taskTitle: 'text1050',
  assigneeName: 'text0791',
  assignedByName: 'text1051',
  previousAssigneeName: 'text1052',
  dueDate: 'text1053',
  createdByName: 'text1054',
  approverName: 'text0792',
  uploadedByName: 'text1055',
  ratedByName: 'text1056',
  content: 'text1057',
  decision: 'text1058',
  archivedAt: 'text1059',
  score: 'text1060',
  feedback: 'text1061',
  avatarUrl: 'text1105',
  phone: 'text1106',
  role: 'text1107',
  type: 'text1108',
  key: 'text1109',
};

const HIDDEN_AUDIT_FIELDS = new Set([
  'id',
  'createdAt',
  'updatedAt',
  'version',
  'fileUrl',
  'mimeType',
  'storageType',
  'fileSize',
]);

function isHiddenAuditField(key: string) {
  return HIDDEN_AUDIT_FIELDS.has(key) || /id$/i.test(key);
}

const AUDIT_VALUE_LABELS: Record<string, Parameters<typeof uiText>[1]> = {
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
  return catalogKey ? uiText(isArabic, catalogKey) : humanizeField(key);
}

function formatAuditValue(value: unknown, isArabic: boolean, locale: string) {
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

function changedAuditFields(log: AuditLogEntry) {
  const oldValue = log.oldValue ?? {};
  const newValue = log.newValue ?? {};

  return Object.keys({ ...oldValue, ...newValue })
    .filter(
      (key) =>
        !isHiddenAuditField(key) &&
        JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key]),
    )
    .map((key) => ({
      key,
      before: oldValue[key],
      after: newValue[key],
    }));
}

function entityDisplayName(log: AuditLogEntry, isArabic: boolean) {
  const values = {
    ...(log.oldValue ?? {}),
    ...(log.newValue ?? {}),
  } as Record<string, unknown>;

  const candidates = isArabic
    ? [values.titleAr, values.title, values.nameAr, values.name, values.valueAr, values.fullName, values.taskTitle,
        values.fileName, values.siteName, values.titleEn, values.valueEn, values.nameEn]
    : [values.titleEn, values.title, values.nameEn, values.name, values.valueEn, values.fullName, values.taskTitle,
        values.fileName, values.siteName, values.titleAr, values.valueAr, values.nameAr];

  const match = candidates.find((value) => typeof value === 'string' && value.trim());
  return match ? String(match) : entityLabel(log.entityType, isArabic);
}

function formatDateTime(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEntityLink(log: AuditLogEntry): string | null {
  switch (log.entityType) {
    case 'Task':
      return `/tasks/view?id=${log.entityId}`;

    case 'Project':
      return `/projects/view?id=${log.entityId}`;

    case 'TaskAssignment':
    case 'AssignmentApproval': {
      const taskId =
        (log.newValue?.taskId as string | undefined) ||
        (log.oldValue?.taskId as string | undefined);

      return taskId ? `/tasks/view?id=${taskId}` : null;
    }

    default:
      return null;
  }
}


/*
 * ============================================================
 * SMALL PIECES
 * ============================================================
 */

function ActionBadge({ action, isArabic }: { action: string; isArabic: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${actionClasses(action)}`}
    >
      {actionLabel(action, isArabic)}
    </span>
  );
}

function EntityBadge({ entityType, isArabic }: { entityType: string; isArabic: boolean }) {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
      {entityLabel(entityType, isArabic)}
    </span>
  );
}

function ChangesDrawer({
  log,
  isArabic,
  locale,
}: {
  log: AuditLogEntry;
  isArabic: boolean;
  locale: string;
}) {
  const changes = changedAuditFields(log);

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-2">
      {changes.map((change) => (
        <div key={change.key} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
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
  );
}

function DetailsCell({
  log,
  isArabic,
  locale,
  expanded,
  onToggle,
}: {
  log: AuditLogEntry;
  isArabic: boolean;
  locale: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const entityLink = getEntityLink(log);
  const changes = changedAuditFields(log);
  const targetName = entityDisplayName(log, isArabic);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 truncate text-sm font-medium text-slate-800">
          {targetName}
        </span>

        {entityLink && (
          <Link
            href={entityLink}
            className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-800"
          >
            {uiText(isArabic, 'text0004')}
          </Link>
        )}
      </div>

      {log.reason && (
        <div className="mt-1 max-w-md truncate text-xs leading-5 text-slate-500">
          <span className="font-medium text-slate-600">{uiText(isArabic, 'text0003')}</span>
          {reasonLabel(log.reason, isArabic)}
        </div>
      )}

      {changes.length > 0 && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800"
        >
          <span>
            {uiText(isArabic, 'text0783', { value0: changes.length })}
          </span>

          <span aria-hidden="true">
            {expanded ? '▲' : '▼'}
          </span>

          <span className="sr-only">
            {expanded ? uiText(isArabic, 'text1089') : uiText(isArabic, 'text1088')}
          </span>
        </button>
      )}

      {expanded && <ChangesDrawer log={log} isArabic={isArabic} locale={locale} />}
    </div>
  );
}


/*
 * ============================================================
 * DESKTOP TABLE
 * ============================================================
 */

function AuditTable({
  items,
  isArabic,
  locale,
  expandedId,
  onToggle,
}: {
  items: AuditLogEntry[];
  isArabic: boolean;
  locale: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
      <table className="w-full text-start">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 text-start">{uiText(isArabic, 'text1083')}</th>
            <th className="px-4 py-3 text-start">{uiText(isArabic, 'text1084')}</th>
            <th className="px-4 py-3 text-start">{uiText(isArabic, 'text1085')}</th>
            <th className="hidden px-4 py-3 text-start lg:table-cell">{uiText(isArabic, 'text1086')}</th>
            <th className="px-4 py-3 text-start">{uiText(isArabic, 'text1087')}</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {items.map((log) => {
            const actorName = log.actor?.fullName || uiText(isArabic, 'text0001');

            return (
              <tr key={log.id} className="align-top transition hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500" dir="ltr">
                  {formatDateTime(log.createdAt, locale)}
                </td>

                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar
                      name={actorName}
                      avatarUrl={log.actor?.avatarUrl}
                      size="sm"
                      className="shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {actorName}
                      </div>

                      {log.actor?.email && (
                        <div className="truncate text-xs text-slate-400">
                          {log.actor.email}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <ActionBadge action={log.action} isArabic={isArabic} />
                </td>

                <td className="hidden px-4 py-3 lg:table-cell">
                  <EntityBadge entityType={log.entityType} isArabic={isArabic} />
                </td>

                <td className="px-4 py-3">
                  <DetailsCell
                    log={log}
                    isArabic={isArabic}
                    locale={locale}
                    expanded={expandedId === log.id}
                    onToggle={() => onToggle(log.id)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


/*
 * ============================================================
 * MOBILE CARD LIST
 * ============================================================
 */

function AuditCards({
  items,
  isArabic,
  locale,
  expandedId,
  onToggle,
}: {
  items: AuditLogEntry[];
  isArabic: boolean;
  locale: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((log) => {
        const actorName = log.actor?.fullName || uiText(isArabic, 'text0001');

        return (
          <article key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar
                  name={actorName}
                  avatarUrl={log.actor?.avatarUrl}
                  size="sm"
                  className="shrink-0"
                />

                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-800">
                    {actorName}
                  </div>

                  {log.actor?.email && (
                    <div className="truncate text-xs text-slate-400">
                      {log.actor.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="shrink-0 whitespace-nowrap text-xs text-slate-400" dir="ltr">
                {formatDateTime(log.createdAt, locale)}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ActionBadge action={log.action} isArabic={isArabic} />
              <EntityBadge entityType={log.entityType} isArabic={isArabic} />
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <DetailsCell
                log={log}
                isArabic={isArabic}
                locale={locale}
                expanded={expandedId === log.id}
                onToggle={() => onToggle(log.id)}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}


/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState({ isArabic }: { isArabic: boolean }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-6 w-6">
          <path d="M6 4h9l3 3v13H6z" strokeWidth="1.7" />
          <path d="M9 11h6M9 15h6" strokeWidth="1.7" strokeLinecap="round" />
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
  const locale = useLocale();
  const isArabic = locale === 'ar';

  /*
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /*
   * ==========================================================
   * FILTERS
   *
   * Type + action dropdowns, plus a free-text search (matches
   * actor name/email/entity/reason on the backend) and a date
   * range — the API already supports both, they just weren't
   * exposed here before.
   * ==========================================================
   */

  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    AuditLogsApi.meta()
      .then((result) => {
        setEntityTypes(result.entityTypes);
        setActions(result.actions);
      })
      .catch(() => {
        /* Filter dropdowns simply stay empty; the log itself still loads. */
      });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
        sortDir: 'desc',
      };

      if (entityType) {
        params.entityType = entityType;
      }

      if (action) {
        params.action = action;
      }

      if (search) {
        params.search = search;
      }

      if (dateFrom) {
        params.dateFrom = dateFrom;
      }

      if (dateTo) {
        params.dateTo = dateTo;
      }

      const result = await AuditLogsApi.search(params);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : uiText(isArabic, 'text0005'));
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action, search, dateFrom, dateTo, isArabic]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [entityType, action, search, dateFrom, dateTo]);

  const hasFilters = Boolean(entityType || action || search || dateFrom || dateTo);

  function clearFilters() {
    setEntityType('');
    setAction('');
    setSearchInput('');
    setSearch('');
    setDateFrom('');
    setDateTo('');
  }

  function toggleExpanded(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div
      className="mx-auto max-w-[1500px] pb-12"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/*
       * ======================================================
       * HEADER
       * ======================================================
       */}

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />

        <div className="relative">
          <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
            {uiText(isArabic, 'text0006')}
          </div>

          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
            {uiText(isArabic, 'text0007')}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {uiText(isArabic, 'text0269')}
          </p>
        </div>
      </section>

      {/*
       * ======================================================
       * FILTER BAR
       * ======================================================
       */}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            className="input w-full"
            placeholder={uiText(isArabic, 'text1110')}
            aria-label={uiText(isArabic, 'text1110')}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select
              className="input sm:w-[220px]"
              aria-label={uiText(isArabic, 'text1091')}
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
            >
              <option value="">{uiText(isArabic, 'text0008')}</option>

              {entityTypes.map((item) => (
                <option key={item} value={item}>
                  {entityLabel(item, isArabic)}
                </option>
              ))}
            </select>

            <select
              className="input sm:w-[220px]"
              aria-label={uiText(isArabic, 'text1090')}
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <option value="">{uiText(isArabic, 'text0009')}</option>

              {actions.map((item) => (
                <option key={item} value={item}>
                  {actionLabel(item, isArabic)}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-xs text-slate-500">
              <span className="shrink-0">{uiText(isArabic, 'text1111')}</span>
              <input
                type="date"
                className="input sm:w-[160px]"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(event) => setDateFrom(event.target.value)}
              />
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-500">
              <span className="shrink-0">{uiText(isArabic, 'text1112')}</span>
              <input
                type="date"
                className="input sm:w-[160px]"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
              />
            </label>

            {hasFilters && (
              <button
                type="button"
                className="text-sm font-medium text-brand-600 hover:text-brand-800 sm:ms-auto"
                onClick={clearFilters}
              >
                {uiText(isArabic, 'text0276')}
              </button>
            )}
          </div>
        </div>
      </section>

      {/*
       * ======================================================
       * RESULT COUNT
       * ======================================================
       */}

      <div className="mt-5 text-sm text-slate-500">
        <span className="font-semibold text-slate-800">{total}</span>{' '}
        {uiText(isArabic, 'text0277')}
      </div>

      {/*
       * ======================================================
       * ERROR
       * ======================================================
       */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/*
       * ======================================================
       * LOADING / EMPTY / LIST
       * ======================================================
       */}

      {loading ? (
        <InlineLoader className="mt-4 min-h-48" />
      ) : items.length === 0 ? (
        <div className="mt-4">
          <EmptyState isArabic={isArabic} />
        </div>
      ) : (
        <div className="mt-4">
          <AuditTable
            items={items}
            isArabic={isArabic}
            locale={locale}
            expandedId={expandedId}
            onToggle={toggleExpanded}
          />

          <AuditCards
            items={items}
            isArabic={isArabic}
            locale={locale}
            expandedId={expandedId}
            onToggle={toggleExpanded}
          />
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
          itemLabel={uiText(isArabic, 'text0277')}
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
