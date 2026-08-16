// frontend/src/app/tasks/mine/page.tsx

'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import ReasonModal from '@/components/ReasonModal';
import Pagination from '@/components/Pagination';

import { ApiError } from '@/lib/api';
import { TasksApi } from '@/lib/endpoints';

import type {
  Task,
  TaskPriority,
  TaskType,
} from '@/lib/types';

const PAGE_SIZE = 10;

const PRIORITIES: TaskPriority[] = [
  'Low',
  'Medium',
  'High',
  'Critical',
];

const RATINGS = [
  5,
  4,
  3,
  2,
  1,
];

const STATUSES = [
  'Pending',
  'Unassigned',
  'InProgress',
  'PendingApproval',
  'Completed',
  'Reopened',
  'Finished',
  'Archived',
];

const TASK_TYPES: TaskType[] = [
  'General',
  'Administrative',
  'Financial',
  'Technical',
  'Maintenance',
  'HR',
  'Procurement',
  'Other',
];

type Tab =
  | 'assignedToMe'
  | 'assignedByMe';

type ViewMode =
  | 'list'
  | 'cards';

function avgRating(
  task: Task,
): number | null {
  if (
    !task.ratings ||
    task.ratings.length === 0
  ) {
    return null;
  }

  const sum =
    task.ratings.reduce(
      (acc, rating) =>
        acc + rating.score,
      0,
    );

  return (
    sum /
    task.ratings.length
  );
}

function Stars({
  value,
}: {
  value: number | null;
}) {
  if (value === null) {
    return (
      <span className="text-xs text-slate-400">
        Not rated
      </span>
    );
  }

  const rounded =
    Math.round(value);

  return (
    <span
      className="whitespace-nowrap text-xs text-amber-500"
      title={`${value.toFixed(1)} / 5`}
    >
      {'★'.repeat(
        rounded,
      )}

      <span className="text-slate-300">
        {'★'.repeat(
          5 - rounded,
        )}
      </span>
    </span>
  );
}

function isOverdue(
  task: Task,
): boolean {
  if (!task.deadlineDate) {
    return false;
  }

  const done = [
    'Completed',
    'Finished',
    'Archived',
  ].includes(
    task.status,
  );

  if (done) {
    return false;
  }

  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  return (
    task.deadlineDate <
    today
  );
}

function isDueSoon(
  task: Task,
): boolean {
  if (!task.deadlineDate) {
    return false;
  }

  if (
    [
      'Completed',
      'Finished',
      'Archived',
    ].includes(
      task.status,
    )
  ) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const deadline =
    new Date(
      `${task.deadlineDate}T00:00:00`,
    );

  const difference =
    deadline.getTime() -
    today.getTime();

  const days =
    difference /
    (
      1000 *
      60 *
      60 *
      24
    );

  return (
    days >= 0 &&
    days <= 7
  );
}

function formatDeadline(
  date?: string | null,
) {
  if (!date) {
    return 'No deadline';
  }

  const parsed =
    new Date(
      `${date}T00:00:00`,
    );

  return parsed.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );
}

function TaskActions({
  task,
  tab,
  busy,
  onFinish,
  onArchive,
}: {
  task: Task;
  tab: Tab;
  busy: boolean;
  onFinish: (
    task: Task,
  ) => void;
  onArchive: (
    task: Task,
  ) => void;
}) {
  if (
    tab !==
    'assignedByMe'
  ) {
    return null;
  }

  const canArchive =
    task.status !==
    'Archived';

  const canFinish =
    task.status !==
      'Archived' &&
    task.status !==
      'Finished';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/tasks/${task.id}`}
        className="btn-secondary px-3 py-1.5 text-xs"
      >
        Edit
      </Link>

      {canFinish && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onFinish(
              task,
            )
          }
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          Finish
        </button>
      )}

      {canArchive && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onArchive(
              task,
            )
          }
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          Archive
        </button>
      )}
    </div>
  );
}

function MyTasksContent() {
  const searchParams =
    useSearchParams();

  const [
    tab,
    setTab,
  ] = useState<Tab>(
    'assignedToMe',
  );

  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>(
    'list',
  );

  const [
    showMoreFilters,
    setShowMoreFilters,
  ] = useState(false);

  const [
    status,
    setStatus,
  ] = useState(
    searchParams.get(
      'status',
    ) || '',
  );

  const [
    taskType,
    setTaskType,
  ] = useState(
    searchParams.get(
      'taskType',
    ) || '',
  );

  const [
    priority,
    setPriority,
  ] = useState(
    searchParams.get(
      'priority',
    ) || '',
  );

  const [
    minRating,
    setMinRating,
  ] = useState('');

  const [
    upcomingOnly,
    setUpcomingOnly,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    deadlineFrom,
    setDeadlineFrom,
  ] = useState('');

  const [
    deadlineTo,
    setDeadlineTo,
  ] = useState('');

  const [
    tasks,
    setTasks,
  ] = useState<
    Task[]
  >([]);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    actingOnId,
    setActingOnId,
  ] = useState<
    string | null
  >(null);

  const [
    finishModalTask,
    setFinishModalTask,
  ] = useState<
    Task | null
  >(null);

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState('');

  useEffect(() => {
    const timer =
      setTimeout(
        () => {
          setDebouncedSearch(
            search.trim(),
          );
        },
        350,
      );

    return () =>
      clearTimeout(
        timer,
      );
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [
    tab,
    status,
    taskType,
    priority,
    minRating,
    upcomingOnly,
    debouncedSearch,
    deadlineFrom,
    deadlineTo,
  ]);

  function reload() {
    setLoading(true);
    setError('');

    const params: Record<
      string,
      string
    > = {
      limit:
        String(
          PAGE_SIZE,
        ),

      page:
        String(
          page,
        ),

      sortBy:
        'deadline',

      sortDir:
        'asc',
    };

    if (status) {
      params.status =
        status;
    }

    if (taskType) {
      params.taskType =
        taskType;
    }

    if (priority) {
      params.priority =
        priority;
    }

    if (minRating) {
      params.minRating =
        minRating;
    }

    if (upcomingOnly) {
      params.upcomingOnly =
        'true';
    }

    if (
      debouncedSearch
    ) {
      params.search =
        debouncedSearch;
    }

    if (
      deadlineFrom
    ) {
      params.deadlineFrom =
        deadlineFrom;
    }

    if (
      deadlineTo
    ) {
      params.deadlineTo =
        deadlineTo;
    }

    const fetcher =
      tab ===
      'assignedToMe'
        ? TasksApi.mine(
            params,
          )
        : TasksApi.assignedByMe(
            params,
          );

    fetcher
      .then((res) => {
        setTasks(
          res.items,
        );

        setTotal(
          res.total,
        );
      })
      .catch((err) => {
        setError(
          err instanceof
            ApiError
            ? err.message
            : 'Could not load tasks.',
        );
      })
      .finally(() => {
        setLoading(
          false,
        );
      });
  }

  useEffect(() => {
    reload();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tab,
    status,
    taskType,
    priority,
    minRating,
    upcomingOnly,
    debouncedSearch,
    deadlineFrom,
    deadlineTo,
    page,
  ]);

  async function archiveTask(
    task: Task,
  ) {
    setActingOnId(
      task.id,
    );

    setError('');

    try {
      await TasksApi.remove(
        task.id,
      );

      reload();
    } catch (err) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not archive this task.',
      );
    } finally {
      setActingOnId(
        null,
      );
    }
  }

  async function finishTask(
    task: Task,
    reason: string,
  ) {
    setFinishModalTask(
      null,
    );

    setActingOnId(
      task.id,
    );

    setError('');

    try {
      await TasksApi.changeStatus(
        task.id,
        'Finished',
        reason,
      );

      reload();
    } catch (err) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not finish this task.',
      );
    } finally {
      setActingOnId(
        null,
      );
    }
  }

  function clearFilters() {
    setSearch('');
    setStatus('');
    setTaskType('');
    setPriority('');
    setMinRating('');
    setUpcomingOnly(
      false,
    );
    setDeadlineFrom('');
    setDeadlineTo('');
  }

  const hasFilters =
    Boolean(
      search ||
        status ||
        taskType ||
        priority ||
        minRating ||
        upcomingOnly ||
        deadlineFrom ||
        deadlineTo,
    );

  const totalPages =
    Math.max(
      Math.ceil(
        total /
          PAGE_SIZE,
      ),
      1,
    );

  return (
    <div>
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            My Tasks
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Keep track of
            assignments without
            all the noise.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:block">
            {loading
              ? 'Loading…'
              : `${total} task${total === 1 ? '' : 's'}`}
          </span>

          <Link
            href="/tasks/new"
            className="btn-primary"
          >
            + New task
          </Link>
        </div>
      </div>

      {/* TABS + VIEW SWITCHER */}

      <div className="mt-6 flex flex-col gap-3 border-b border-slate-200 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() =>
              setTab(
                'assignedToMe',
              )
            }
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab ===
              'assignedToMe'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Assigned to me
          </button>

          <button
            type="button"
            onClick={() =>
              setTab(
                'assignedByMe',
              )
            }
            className={`-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              tab ===
              'assignedByMe'
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Assigned by me
          </button>
        </div>

        <div className="mb-2 flex w-fit rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() =>
              setViewMode(
                'list',
              )
            }
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode ===
              'list'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            List
          </button>

          <button
            type="button"
            onClick={() =>
              setViewMode(
                'cards',
              )
            }
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode ===
              'cards'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect
                x="4"
                y="4"
                width="6"
                height="6"
                rx="1"
                strokeWidth="2"
              />

              <rect
                x="14"
                y="4"
                width="6"
                height="6"
                rx="1"
                strokeWidth="2"
              />

              <rect
                x="4"
                y="14"
                width="6"
                height="6"
                rx="1"
                strokeWidth="2"
              />

              <rect
                x="14"
                y="14"
                width="6"
                height="6"
                rx="1"
                strokeWidth="2"
              />
            </svg>

            Cards
          </button>
        </div>
      </div>

      {/* FILTER BAR */}

      <div className="card mt-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label className="label">
              Search tasks
            </label>

            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                  strokeWidth="2"
                />

                <path
                  d="m20 20-3.5-3.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>

              <input
                className="input pl-9"
                placeholder="Search title or description…"
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value,
                  )
                }
              />
            </div>
          </div>

          <div className="min-w-[170px]">
            <label className="label">
              Status
            </label>

            <select
              className="input"
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value,
                )
              }
            >
              <option value="">
                All statuses
              </option>

              {STATUSES.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="label">
              Priority
            </label>

            <select
              className="input"
              value={priority}
              onChange={(e) =>
                setPriority(
                  e.target.value,
                )
              }
            >
              <option value="">
                All priorities
              </option>

              {PRIORITIES.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value}
                  </option>
                ),
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowMoreFilters(
                (current) =>
                  !current,
              )
            }
            className={`btn-secondary whitespace-nowrap ${
              showMoreFilters
                ? 'border-brand-300 bg-brand-50 text-brand-700'
                : ''
            }`}
          >
            <svg
              className="mr-1.5 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M4 6h16M7 12h10M10 18h4"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            More filters

            {(
              taskType ||
              minRating ||
              upcomingOnly ||
              deadlineFrom ||
              deadlineTo
            ) && (
              <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] text-white">
                {
                  [
                    taskType,
                    minRating,
                    upcomingOnly
                      ? '1'
                      : '',
                    deadlineFrom,
                    deadlineTo,
                  ].filter(
                    Boolean,
                  ).length
                }
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={
                clearFilters
              }
              className="btn-secondary whitespace-nowrap text-slate-500"
            >
              Clear
            </button>
          )}
        </div>

        {/* ADVANCED FILTERS */}

        {showMoreFilters && (
          <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="label">
                Task type
              </label>

              <select
                className="input"
                value={taskType}
                onChange={(e) =>
                  setTaskType(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  All types
                </option>

                {TASK_TYPES.map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="label">
                Minimum rating
              </label>

              <select
                className="input"
                value={minRating}
                onChange={(e) =>
                  setMinRating(
                    e.target.value,
                  )
                }
              >
                <option value="">
                  Any rating
                </option>

                {RATINGS.map(
                  (rating) => (
                    <option
                      key={rating}
                      value={rating}
                    >
                      {rating}★ or higher
                    </option>
                  ),
                )}
              </select>
            </div>

            <div>
              <label className="label">
                Due from
              </label>

              <input
                type="date"
                className="input"
                value={deadlineFrom}
                onChange={(e) =>
                  setDeadlineFrom(
                    e.target.value,
                  )
                }
              />
            </div>

            <div>
              <label className="label">
                Due to
              </label>

              <input
                type="date"
                className="input"
                value={deadlineTo}
                onChange={(e) =>
                  setDeadlineTo(
                    e.target.value,
                  )
                }
              />
            </div>

            <div className="flex items-end">
              <label className="flex min-h-[42px] w-full cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={
                    upcomingOnly
                  }
                  onChange={(e) =>
                    setUpcomingOnly(
                      e.target.checked,
                    )
                  }
                  className="rounded border-slate-300"
                />

                Due soon only
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ACTIVE FILTERS */}

      {hasFilters && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">
            Filters:
          </span>

          {status && (
            <button
              type="button"
              onClick={() =>
                setStatus('')
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
            >
              Status: {status} ×
            </button>
          )}

          {priority && (
            <button
              type="button"
              onClick={() =>
                setPriority('')
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
            >
              Priority: {priority} ×
            </button>
          )}

          {taskType && (
            <button
              type="button"
              onClick={() =>
                setTaskType('')
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
            >
              Type: {taskType} ×
            </button>
          )}

          {upcomingOnly && (
            <button
              type="button"
              onClick={() =>
                setUpcomingOnly(
                  false,
                )
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 hover:border-slate-300"
            >
              Due soon ×
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* RESULTS HEADER */}

      <div className="mt-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            {tab ===
            'assignedToMe'
              ? 'Your assignments'
              : 'Tasks you assigned'}
          </h2>

          <p className="mt-0.5 text-xs text-slate-400">
            Sorted by nearest
            deadline
          </p>
        </div>

        <span className="text-xs text-slate-400 sm:hidden">
          {loading
            ? '…'
            : `${total} tasks`}
        </span>
      </div>

      {/* RESULTS */}

      <div className="mt-3">
        {loading ? (
          <div className="card p-10 text-center">
            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />

            <p className="mt-3 text-sm text-slate-500">
              Loading tasks…
            </p>
          </div>
        ) : tasks.length ===
          0 ? (
          <div className="card px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg
                className="h-6 w-6 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="m9 11 2 2 4-4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">
              {tab ===
              'assignedToMe'
                ? 'No matching tasks'
                : 'No assigned tasks'}
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {tab ===
              'assignedToMe'
                ? 'Try changing or clearing your filters.'
                : "You haven't assigned any tasks to others yet."}
            </p>
          </div>
        ) : viewMode ===
          'list' ? (
          /*
           * ================================================
           * LIST VIEW
           * Whole row is clickable.
           * ================================================
           */
          <div className="card overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1fr)_150px_135px_135px_80px] gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
              <div>
                Task
              </div>

              <div>
                Project
              </div>

              <div>
                Deadline
              </div>

              <div>
                Status
              </div>

              <div />
            </div>

            <div className="divide-y divide-slate-100">
              {tasks.map(
                (task) => {
                  const overdue =
                    isOverdue(
                      task,
                    );

                  const dueSoon =
                    isDueSoon(
                      task,
                    );

                  const busy =
                    actingOnId ===
                    task.id;

                  return (
                    <div
                      key={
                        task.id
                      }
                      className="group"
                    >
                      <Link
                        href={`/tasks/${task.id}`}
                        className="block px-4 py-4 transition hover:bg-slate-50/70 sm:px-5"
                      >
                        <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_150px_135px_135px_80px]">
                          {/* TASK */}

                          <div className="min-w-0">
                            <div className="flex items-start gap-3">
                              <div
                                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                  overdue
                                    ? 'bg-red-500'
                                    : dueSoon
                                      ? 'bg-amber-400'
                                      : 'bg-brand-500'
                                }`}
                              />

                              <div className="min-w-0">
                                <div className="block truncate font-medium text-slate-800 transition group-hover:text-brand-700">
                                  {
                                    task.titleEn
                                  }
                                </div>

                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                                  <StatusBadge
                                    value={
                                      task.priority
                                    }
                                    listType="task_priority"
                                  />

                                  {tab ===
                                    'assignedByMe' && (
                                    <span>
                                      To:{' '}
                                      <span className="font-medium text-slate-500">
                                        {task
                                          .assignedTo
                                          ?.fullName ||
                                          'Unassigned'}
                                      </span>
                                    </span>
                                  )}

                                  <Stars
                                    value={avgRating(
                                      task,
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* PROJECT */}

                          <div className="min-w-0">
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                              Project
                            </span>

                            {task
                              .project
                              ?.name ? (
                              <span className="block truncate text-sm text-slate-600">
                                {
                                  task
                                    .project
                                    .name
                                }
                              </span>
                            ) : (
                              <span className="text-sm text-slate-300">
                                —
                              </span>
                            )}
                          </div>

                          {/* DEADLINE */}

                          <div>
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                              Deadline
                            </span>

                            <div
                              className={`text-sm ${
                                overdue
                                  ? 'font-medium text-red-600'
                                  : dueSoon
                                    ? 'font-medium text-amber-600'
                                    : 'text-slate-500'
                              }`}
                            >
                              {formatDeadline(
                                task.deadlineDate,
                              )}
                            </div>

                            {overdue && (
                              <div className="mt-0.5 text-[11px] font-medium text-red-500">
                                Overdue
                              </div>
                            )}

                            {!overdue &&
                              dueSoon && (
                                <div className="mt-0.5 text-[11px] font-medium text-amber-500">
                                  Due soon
                                </div>
                              )}
                          </div>

                          {/* STATUS */}

                          <div>
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">
                              Status
                            </span>

                            <StatusBadge
                              value={
                                task.status
                              }
                              listType="task_status"
                            />
                          </div>

                          {/* ARROW */}

                          <div className="flex justify-end">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition group-hover:bg-slate-100 group-hover:text-brand-700">
                              <svg
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                              >
                                <path
                                  d="m9 18 6-6-6-6"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </Link>

                      {tab ===
                        'assignedByMe' && (
                        <div className="flex justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
                          <TaskActions
                            task={
                              task
                            }
                            tab={
                              tab
                            }
                            busy={
                              busy
                            }
                            onFinish={
                              setFinishModalTask
                            }
                            onArchive={
                              archiveTask
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ) : (
          /*
           * ================================================
           * CARD VIEW
           * Whole card body is clickable.
           * ================================================
           */
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {tasks.map(
              (task) => {
                const busy =
                  actingOnId ===
                  task.id;

                const overdue =
                  isOverdue(
                    task,
                  );

                const dueSoon =
                  isDueSoon(
                    task,
                  );

                return (
                  <div
                    key={
                      task.id
                    }
                    className="card group overflow-hidden transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
                  >
                    <Link
                      href={`/tasks/${task.id}`}
                      className="block p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <div
                              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                overdue
                                  ? 'bg-red-500'
                                  : dueSoon
                                    ? 'bg-amber-400'
                                    : 'bg-brand-500'
                              }`}
                            />

                            <h3 className="min-w-0 truncate font-medium text-slate-800 transition group-hover:text-brand-700">
                              {
                                task.titleEn
                              }
                            </h3>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <StatusBadge
                            value={
                              task.priority
                            }
                            listType="task_priority"
                          />

                          <StatusBadge
                            value={
                              task.status
                            }
                            listType="task_status"
                          />
                        </div>
                      </div>

                      {task.descriptionEn && (
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                          {
                            task.descriptionEn
                          }
                        </p>
                      )}

                      <div className="mt-4 space-y-2">
                        {task
                          .project
                          ?.name && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <svg
                              className="h-4 w-4 shrink-0 text-slate-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path
                                d="M4 7h6l2 2h8v10H4V7Z"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                            </svg>

                            <span className="truncate">
                              Project:{' '}
                              <span className="font-medium">
                                {
                                  task
                                    .project
                                    .name
                                }
                              </span>
                            </span>
                          </div>
                        )}

                        {tab ===
                          'assignedByMe' && (
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <svg
                              className="h-4 w-4 shrink-0 text-slate-400"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <circle
                                cx="12"
                                cy="8"
                                r="3"
                                strokeWidth="1.8"
                              />

                              <path
                                d="M6 19c.7-3 2.7-5 6-5s5.3 2 6 5"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                              />
                            </svg>

                            <span className="truncate">
                              Assigned
                              to:{' '}
                              <span className="font-medium">
                                {task
                                  .assignedTo
                                  ?.fullName ||
                                  'Unassigned'}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs">
                          <svg
                            className={`h-4 w-4 shrink-0 ${
                              overdue
                                ? 'text-red-500'
                                : dueSoon
                                  ? 'text-amber-500'
                                  : 'text-slate-400'
                            }`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <rect
                              x="4"
                              y="5"
                              width="16"
                              height="15"
                              rx="2"
                              strokeWidth="1.8"
                            />

                            <path
                              d="M8 3v4M16 3v4M4 10h16"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                          </svg>

                          <span
                            className={
                              overdue
                                ? 'font-medium text-red-600'
                                : dueSoon
                                  ? 'font-medium text-amber-600'
                                  : 'text-slate-500'
                            }
                          >
                            {formatDeadline(
                              task.deadlineDate,
                            )}

                            {overdue
                              ? ' · Overdue'
                              : dueSoon
                                ? ' · Due soon'
                                : ''}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <Stars
                          value={avgRating(
                            task,
                          )}
                        />

                        <div className="flex items-center gap-1 text-xs font-medium text-brand-700">
                          Open task

                          <svg
                            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                          >
                            <path
                              d="m9 18 6-6-6-6"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      </div>
                    </Link>

                    {tab ===
                      'assignedByMe' && (
                      <div className="border-t border-slate-100 px-4 py-3">
                        <TaskActions
                          task={
                            task
                          }
                          tab={
                            tab
                          }
                          busy={
                            busy
                          }
                          onFinish={
                            setFinishModalTask
                          }
                          onArchive={
                            archiveTask
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>

      {!loading && (
        <Pagination
          page={page}
          totalPages={
            totalPages
          }
          total={total}
          onPageChange={
            setPage
          }
          itemLabel="tasks"
        />
      )}

      <ReasonModal
        open={
          !!finishModalTask
        }
        title="Finish task"
        description="This will stop the task — please explain why it's being finished."
        minLength={10}
        confirmLabel="Finish"
        onCancel={() =>
          setFinishModalTask(
            null,
          )
        }
        onConfirm={(
          reason,
        ) =>
          finishModalTask &&
          finishTask(
            finishModalTask,
            reason,
          )
        }
      />
    </div>
  );
}

export default function MyTasksPage() {
  return (
    <ProtectedRoute>
      <MyTasksContent />
    </ProtectedRoute>
  );
}