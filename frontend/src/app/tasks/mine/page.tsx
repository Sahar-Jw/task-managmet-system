'use client';

import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';


import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useSearchParams,
} from 'next/navigation';

import {
  useLocale,
} from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import Avatar from '@/components/Avatar';
import ReasonModal from '@/components/ReasonModal';
import Pagination from '@/components/Pagination';

import {
  useListLabels,
} from '@/lib/list-labels-context';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  canEditTask,
} from '@/lib/task-permissions';

import {
  ApiError,
} from '@/lib/api';

import {
  ProjectsApi,
  SettingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Project,
  Setting,
  Task,
  User,
} from '@/lib/types';


const PAGE_SIZE =
  12;


const RATINGS = [
  5,
  4,
  3,
  2,
  1,
];


type Tab =
  | 'assignedToMe'
  | 'assignedByMe';


type ViewMode =
  | 'cards'
  | 'list';


type SortBy =
  | 'deadline'
  | 'priority'
  | 'rating'
  | 'createdAt';


type SortDir =
  | 'asc'
  | 'desc';


function avgRating(
  task:
    Task,
):
  number | null {
  if (
    !task.ratings ||
    task.ratings.length ===
      0
  ) {
    return null;
  }


  return (
    task.ratings.reduce(
      (
        sum,
        rating,
      ) =>
        sum +
        rating.score,
      0,
    ) /
    task.ratings.length
  );
}


function Stars({
  value,
  showEmpty = false,
}: {
  value:
    number | null;

  showEmpty?:
    boolean;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  if (
    value ===
    null
  ) {
    if (
      !showEmpty
    ) {
      return null;
    }


    return (
      <span className="text-xs text-slate-400">
        {uiText(isArabic, 'text0966')}
      </span>
    );
  }


  const rounded =
    Math.round(
      value,
    );


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
          5 -
          rounded,
        )}
      </span>
    </span>
  );
}


function isDone(
  task:
    Task,
) {
  return [
    'Completed',
    'Finished',
    'Archived',
  ].includes(
    task.status,
  );
}


function isOverdue(
  task:
    Task,
) {
  if (
    !task.deadlineDate ||
    isDone(
      task,
    )
  ) {
    return false;
  }


  return (
    task.deadlineDate <
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      )
  );
}


function isDueSoon(
  task:
    Task,
) {
  if (
    !task.deadlineDate ||
    isDone(
      task,
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


  const days =
    (
      deadline.getTime() -
      today.getTime()
    ) /
    (
      1000 *
      60 *
      60 *
      24
    );


  return (
    days >=
      0 &&
    days <=
      7
  );
}


function formatDate(
  value?:
    string | null,

  locale?:
    string,
) {
  if (
    !value
  ) {
    return '—';
  }


  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
      ? new Date(
          `${value}T00:00:00`,
        )
      : new Date(
          value,
        );


  return date.toLocaleDateString(
    locale,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',
    },
  );
}


function ViewToggle({
  value,
  onChange,
  isArabic,
}: {
  value:
    ViewMode;

  onChange:
    (
      value:
        ViewMode,
    ) => void;

  isArabic:
    boolean;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        title={
          uiText(isArabic, 'text0389')
        }
        onClick={() =>
          onChange(
            'cards',
          )
        }
        className={`flex h-8 w-9 items-center justify-center rounded-lg transition ${
          value ===
          'cards'
            ? 'bg-slate-100 text-slate-900'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-4 w-4"
        >
          <rect
            x="4"
            y="4"
            width="6"
            height="6"
            rx="1"
            strokeWidth="1.8"
          />

          <rect
            x="14"
            y="4"
            width="6"
            height="6"
            rx="1"
            strokeWidth="1.8"
          />

          <rect
            x="4"
            y="14"
            width="6"
            height="6"
            rx="1"
            strokeWidth="1.8"
          />

          <rect
            x="14"
            y="14"
            width="6"
            height="6"
            rx="1"
            strokeWidth="1.8"
          />
        </svg>
      </button>


      <button
        type="button"
        title={
          uiText(isArabic, 'text0067')
        }
        onClick={() =>
          onChange(
            'list',
          )
        }
        className={`flex h-8 w-9 items-center justify-center rounded-lg transition ${
          value ===
          'list'
            ? 'bg-slate-100 text-slate-900'
            : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-4 w-4"
        >
          <path
            d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}


function EmptyState({
  tab,
  isArabic,
}: {
  tab:
    Tab;

  isArabic:
    boolean;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            d="M8 7h11M8 12h11M8 17h7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <path
            d="m3 7 1 1 2-2m-3 6 1 1 2-2m-3 6 1 1 2-2"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>


      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {tab ===
        'assignedToMe'
          ? uiText(isArabic, 'text0154')
          : uiText(isArabic, 'text0155')}
      </h3>


      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {uiText(isArabic, 'text0521')}
      </p>
    </div>
  );
}


function MyTasksContent() {
  const searchParams =
    useSearchParams();


  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  const {
    user,
  } =
    useAuth();


  const {
    getLabel,
  } =
    useListLabels();


  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      searchParams.get(
        'tab',
      ) === 'assignedByMe'
        ? 'assignedByMe'
        : 'assignedToMe',
    );


  const [
    viewMode,
    setViewMode,
  ] =
    useState<ViewMode>(
      'cards',
    );


  const [
    showFilters,
    setShowFilters,
  ] =
    useState(
      false,
    );


  const [
    search,
    setSearch,
  ] =
    useState(
      '',
    );


  const [
    debouncedSearch,
    setDebouncedSearch,
  ] =
    useState(
      '',
    );


  const [
    status,
    setStatus,
  ] =
    useState(
      searchParams.get(
        'status',
      ) ||
      '',
    );


  const [
    taskType,
    setTaskType,
  ] =
    useState(
      searchParams.get(
        'taskType',
      ) ||
      '',
    );


  const [
    priority,
    setPriority,
  ] =
    useState(
      searchParams.get(
        'priority',
      ) ||
      '',
    );


  const [
    projectId,
    setProjectId,
  ] =
    useState(
      searchParams.get(
        'projectId',
      ) ||
      '',
    );


  /*
   * NEW ASSIGNEE FILTER
   */
  const [
    assigneeId,
    setAssigneeId,
  ] =
    useState(
      '',
    );


  const [
    minRating,
    setMinRating,
  ] =
    useState(
      '',
    );


  const [
    upcomingOnly,
    setUpcomingOnly,
  ] =
    useState(
      false,
    );

  const [
    overdueOnly,
    setOverdueOnly,
  ] =
    useState(
      searchParams.get(
        'overdueOnly',
      ) === 'true',
    );

  const [
    deadlineFrom,
    setDeadlineFrom,
  ] =
    useState(
      '',
    );


  const [
    deadlineTo,
    setDeadlineTo,
  ] =
    useState(
      '',
    );


  const [
    sortBy,
    setSortBy,
  ] =
    useState<SortBy>(
      searchParams.get(
        'tab',
      ) === 'assignedByMe'
        ? 'createdAt'
        : 'deadline',
    );


  const [
    sortDir,
    setSortDir,
  ] =
    useState<SortDir>(
      searchParams.get(
        'tab',
      ) === 'assignedByMe'
        ? 'desc'
        : 'asc',
    );


  const [
    taskStatuses,
    setTaskStatuses,
  ] =
    useState<Setting[]>(
      [],
    );


  const [
    taskTypes,
    setTaskTypes,
  ] =
    useState<Setting[]>(
      [],
    );


  const [
    taskPriorities,
    setTaskPriorities,
  ] =
    useState<Setting[]>(
      [],
    );


  const [
    projects,
    setProjects,
  ] =
    useState<Project[]>(
      [],
    );


  const [
    users,
    setUsers,
  ] =
    useState<User[]>(
      [],
    );


  const [
    tasks,
    setTasks,
  ] =
    useState<Task[]>(
      [],
    );


  const [
    total,
    setTotal,
  ] =
    useState(
      0,
    );


  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );


  const [
    error,
    setError,
  ] =
    useState(
      '',
    );


  const [
    actingOnId,
    setActingOnId,
  ] =
    useState<
      string | null
    >(
      null,
    );


  const [
    rowError,
    setRowError,
  ] =
    useState<{
      id:
        string;

      message:
        string;
    } | null>(
      null,
    );


  const [
    finishModalTask,
    setFinishModalTask,
  ] =
    useState<Task | null>(
      null,
    );


  const [
    archiveModalTask,
    setArchiveModalTask,
  ] =
    useState<Task | null>(
      null,
    );


  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        'my-tasks-view-mode',
      );


    if (
      stored ===
        'cards' ||
      stored ===
        'list'
    ) {
      setViewMode(
        stored,
      );
    }
  }, []);


  function changeViewMode(
    value:
      ViewMode,
  ) {
    setViewMode(
      value,
    );


    window.localStorage.setItem(
      'my-tasks-view-mode',
      value,
    );
  }


  /*
   * ==========================================================
   * TAB DEFAULT SORTING
   * ==========================================================
   */

  function changeTab(
    nextTab:
      Tab,
  ) {
    setTab(
      nextTab,
    );


    setPage(
      1,
    );


    setAssigneeId(
      '',
    );


    if (
      nextTab ===
      'assignedByMe'
    ) {
      /*
       * NEWEST TASKS FIRST.
       */
      setSortBy(
        'createdAt',
      );

      setSortDir(
        'desc',
      );
    } else {
      /*
       * Assigned To Me keeps the useful deadline-first default.
       */
      setSortBy(
        'deadline',
      );

      setSortDir(
        'asc',
      );
    }
  }


  /*
   * ==========================================================
   * LOOKUPS
   * ==========================================================
   */

  useEffect(() => {
    SettingsApi.list(
      'task_status',
      true,
    )
      .then(
        setTaskStatuses,
      )
      .catch(
        () => {},
      );


    SettingsApi.list(
      'task_type',
      true,
    )
      .then(
        setTaskTypes,
      )
      .catch(
        () => {},
      );


    SettingsApi.list(
      'task_priority',
      true,
    )
      .then(
        setTaskPriorities,
      )
      .catch(
        () => {},
      );


    ProjectsApi.list({
      limit:
        '100',

      excludeArchived:
        'true',
    })
      .then(
        (
          response,
        ) =>
          setProjects(
            response.items,
          ),
      )
      .catch(
        () => {},
      );


    /*
     * NEW:
     *
     * User directory for Assigned By Me filter.
     */
    UsersApi.list({
      limit:
        '100',
    })
      .then(
        (
          response,
        ) =>
          setUsers(
            response.items,
          ),
      )
      .catch(
        () => {},
      );
  }, []);


  const assignableUsers =
    useMemo(
      () =>
        users
          .filter(
            (
              item,
            ) =>
              item.isActive &&
              item.id !==
                user?.id,
          )
          .sort(
            (
              a,
              b,
            ) =>
              a.fullName.localeCompare(
                b.fullName,
              ),
          ),

      [
        users,
        user?.id,
      ],
    );


  const visibleStatuses =
    useMemo(
      () =>
        taskStatuses.filter(
          (
            setting,
          ) =>
            Boolean(
              setting.key &&
              (
                isArabic
                  ? setting.codeAr
                  : setting.codeEn
              ),
            ),
        ),

      [
        taskStatuses,
        isArabic,
      ],
    );


  const visibleTypes =
    useMemo(
      () =>
        taskTypes.filter(
          (
            setting,
          ) =>
            Boolean(
              setting.key &&
              (
                isArabic
                  ? setting.codeAr
                  : setting.codeEn
              ),
            ),
        ),

      [
        taskTypes,
        isArabic,
      ],
    );


  const visiblePriorities =
    useMemo(
      () =>
        taskPriorities.filter(
          (
            setting,
          ) =>
            Boolean(
              setting.key &&
              (
                isArabic
                  ? setting.codeAr
                  : setting.codeEn
              ),
            ),
        ),

      [
        taskPriorities,
        isArabic,
      ],
    );


  function taskTitle(
    task:
      Task,
  ) {
    return task.title;
  }


  function taskDescription(
    task:
      Task,
  ) {
    return task.description;
  }


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


    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    search,
  ]);


  /*
   * ==========================================================
   * LOAD TASKS
   * ==========================================================
   */

  const reload =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError(
          '',
        );


        try {
          const params:
            Record<
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

            sortBy,

            sortDir,
          };


          if (
            status
          ) {
            params.status =
              status;
          }


          if (
            taskType
          ) {
            params.taskType =
              taskType;
          }


          if (
            priority
          ) {
            params.priority =
              priority;
          }


          if (
            projectId
          ) {
            params.projectId =
              projectId;
          }


          if (
            minRating
          ) {
            params.minRating =
              minRating;
          }


          if (
            upcomingOnly
          ) {
            params.upcomingOnly =
              'true';
          }

          if (
            overdueOnly
          ) {
            params.overdueOnly =
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


          /*
           * NEW:
           *
           * Only Assigned By Me understands this filter.
           */
          if (
            tab ===
              'assignedByMe' &&
            assigneeId
          ) {
            params.assigneeId =
              assigneeId;
          }


          const response =
            tab ===
            'assignedToMe'
              ? await TasksApi.mine(
                  params,
                )
              : await TasksApi.assignedByMe(
                  params,
                );


          setTasks(
            response.items,
          );


          setTotal(
            response.total,
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              ApiError
              ? err.message
              : uiText(isArabic, 'text0156'),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },

      [
        tab,
        page,
        sortBy,
        sortDir,
        status,
        taskType,
        priority,
        projectId,
        assigneeId,
        minRating,
        upcomingOnly,
        overdueOnly,
        debouncedSearch,
        deadlineFrom,
        deadlineTo,
        isArabic,
      ],
    );


  useEffect(() => {
    reload();
  }, [
    reload,
  ]);


  useEffect(() => {
    setPage(
      1,
    );
  }, [
    tab,
    status,
    taskType,
    priority,
    projectId,
    assigneeId,
    minRating,
    upcomingOnly,
    overdueOnly,
    debouncedSearch,
    deadlineFrom,
    deadlineTo,
    sortBy,
    sortDir,
  ]);


  const hasFilters =
    Boolean(
      search ||
      status ||
      taskType ||
      priority ||
      projectId ||
      (
        tab ===
          'assignedByMe' &&
        assigneeId
      ) ||
      minRating ||
      upcomingOnly ||
      overdueOnly ||
      deadlineFrom ||
      deadlineTo,
    );


  const filterCount =
    [
      Boolean(
        search,
      ),

      Boolean(
        status,
      ),

      Boolean(
        priority,
      ),

      Boolean(
        taskType,
      ),

      Boolean(
        projectId,
      ),

      Boolean(
        tab ===
          'assignedByMe' &&
        assigneeId,
      ),

      Boolean(
        minRating,
      ),

      upcomingOnly,

      overdueOnly,

      Boolean(
        deadlineFrom ||
        deadlineTo,
      ),
    ].filter(
      Boolean,
    ).length;


  function clearFilters() {
    setSearch(
      '',
    );

    setStatus(
      '',
    );

    setTaskType(
      '',
    );

    setPriority(
      '',
    );

    setProjectId(
      '',
    );

    setAssigneeId(
      '',
    );

    setMinRating(
      '',
    );

    setUpcomingOnly(
      false,
    );

    setOverdueOnly(
      false,
    );

    setDeadlineFrom(
      '',
    );

    setDeadlineTo(
      '',
    );
  }


  async function archiveTask(
    task:
      Task,
  ) {
    setArchiveModalTask(
      null,
    );

    setActingOnId(
      task.id,
    );

    setRowError(
      null,
    );


    try {
      await TasksApi.remove(
        task.id,
      );

      await reload();
    } catch (
      err
    ) {
      setRowError({
        id:
          task.id,

        message:
          err instanceof
            ApiError
            ? err.message
            : uiText(isArabic, 'text0522'),
      });
    } finally {
      setActingOnId(
        null,
      );
    }
  }


  async function finishTask(
    task:
      Task,

    reason:
      string,
  ) {
    setFinishModalTask(
      null,
    );

    setActingOnId(
      task.id,
    );

    setRowError(
      null,
    );


    try {
      await TasksApi.changeStatus(
        task.id,
        'Finished',
        reason,
      );

      await reload();
    } catch (
      err
    ) {
      setRowError({
        id:
          task.id,

        message:
          err instanceof
            ApiError
            ? err.message
            : uiText(isArabic, 'text0157'),
      });
    } finally {
      setActingOnId(
        null,
      );
    }
  }


  const totalPages =
    Math.max(
      Math.ceil(
        total /
        PAGE_SIZE,
      ),
      1,
    );


  function TaskActions({
    task,
  }: {
    task:
      Task;
  }) {
    const busy =
      actingOnId ===
      task.id;


    if (
      tab ===
      'assignedToMe'
    ) {
      return (
        <div className="relative z-20 flex flex-wrap items-center gap-2">
          <Link
            href={`/tasks/${task.id}`}
            onClick={(event) => event.stopPropagation()}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            {uiText(isArabic, 'text0158')}
          </Link>

          {canEditTask(task, user) && (
            <Link
              href={`/tasks/${task.id}?edit=1`}
              onClick={(event) => event.stopPropagation()}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              {uiText(isArabic, 'text0068')}
            </Link>
          )}
        </div>
      );
    }


    const canFinish =
      [
        'Pending',
        'Unassigned',
        'InProgress',
      ].includes(
        task.status,
      );


    const canArchive =
      task.status !==
      'Archived';


    return (
      <div className="relative z-20 flex flex-wrap items-center gap-2">
        <Link
          href={`/tasks/${task.id}`}
          onClick={(
            event,
          ) =>
            event.stopPropagation()
          }
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          {uiText(isArabic, 'text0158')}
        </Link>


        {canEditTask(task, user) && (
          <Link
            href={`/tasks/${task.id}?edit=1`}
            onClick={(event) => event.stopPropagation()}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            {uiText(isArabic, 'text0068')}
          </Link>
        )}


        {canFinish && (
          <button
            type="button"
            disabled={
              busy
            }
            onClick={(
              event,
            ) => {
              event.preventDefault();

              event.stopPropagation();

              setFinishModalTask(
                task,
              );
            }}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {uiText(isArabic, 'text0110')}
          </button>
        )}


        {canArchive && (
          <button
            type="button"
            disabled={
              busy
            }
            onClick={(
              event,
            ) => {
              event.preventDefault();

              event.stopPropagation();

              setArchiveModalTask(
                task,
              );
            }}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {uiText(isArabic, 'text0401')}
          </button>
        )}
      </div>
    );
  }


  return (
    <div
      className="mx-auto max-w-[1600px] pb-12"
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />


        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
              {uiText(isArabic, 'text0523')}
            </div>


            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
              {uiText(isArabic, 'text0159')}
            </h1>


            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {tab ===
              'assignedToMe'
                ? (
                    uiText(isArabic, 'text0524')
                  )
                : (
                    uiText(isArabic, 'text0525')
                  )}
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle
              value={
                viewMode
              }
              onChange={
                changeViewMode
              }
              isArabic={
                isArabic
              }
            />

            <Link
              href="/tasks/new"
              className="btn-primary"
            >
              +{' '}

              {uiText(isArabic, 'text0016')}
            </Link>
          </div>
        </div>
      </section>


      <div className="mt-5 inline-flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() =>
            changeTab(
              'assignedToMe',
            )
          }
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab ===
            'assignedToMe'
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {uiText(isArabic, 'text0160')}
        </button>


        <button
          type="button"
          onClick={() =>
            changeTab(
              'assignedByMe',
            )
          }
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            tab ===
            'assignedByMe'
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {uiText(isArabic, 'text0161')}
        </button>
      </div>


      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${
                isArabic
                  ? 'right-3'
                  : 'left-3'
              }`}
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
              className={`input ${
                isArabic
                  ? 'pr-9'
                  : 'pl-9'
              }`}
              placeholder={
                uiText(isArabic, 'text0526')
              }
              value={
                search
              }
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target.value,
                )
              }
            />
          </div>


          {/*
           * ASSIGNED USER — ONLY ASSIGNED BY ME
           */}

          {tab ===
            'assignedByMe' && (
            <select
              className="input xl:w-[210px]"
              value={
                assigneeId
              }
              onChange={(
                event,
              ) =>
                setAssigneeId(
                  event.target.value,
                )
              }
            >
              <option value="">
                {uiText(isArabic, 'text0527')}
              </option>


              {assignableUsers.map(
                (
                  item,
                ) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {item.fullName}
                  </option>
                ),
              )}
            </select>
          )}


          <select
            className="input xl:w-[180px]"
            value={
              status
            }
            onChange={(
              event,
            ) =>
              setStatus(
                event.target.value,
              )
            }
          >
            <option value="">
              {uiText(isArabic, 'text0069')}
            </option>

            {visibleStatuses.map(
              (
                item,
              ) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.key
                  }
                >
                  {isArabic
                    ? item.codeAr
                    : item.codeEn}
                </option>
              ),
            )}
          </select>


          <select
            className="input xl:w-[170px]"
            value={
              priority
            }
            onChange={(
              event,
            ) =>
              setPriority(
                event.target.value,
              )
            }
          >
            <option value="">
              {uiText(isArabic, 'text0528')}
            </option>

            {visiblePriorities.map(
              (
                item,
              ) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    item.key
                  }
                >
                  {isArabic
                    ? item.codeAr
                    : item.codeEn}
                </option>
              ),
            )}
          </select>


          <select
            className="input xl:w-[175px]"
            value={
              sortBy
            }
            onChange={(
              event,
            ) =>
              setSortBy(
                event.target.value as
                  SortBy,
              )
            }
          >
            <option value="createdAt">
              {uiText(isArabic, 'text0529')}
            </option>

            <option value="deadline">
              {uiText(isArabic, 'text0148')}
            </option>

            <option value="priority">
              {uiText(isArabic, 'text0297')}
            </option>

            <option value="rating">
              {uiText(isArabic, 'text0162')}
            </option>
          </select>


          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() =>
              setSortDir(
                (
                  current,
                ) =>
                  current ===
                  'asc'
                    ? 'desc'
                    : 'asc',
              )
            }
          >
            {sortDir ===
            'asc'
              ? '↑'
              : '↓'}{' '}

            {sortDir ===
            'asc'
              ? (
                  uiText(isArabic, 'text0072')
                )
              : (
                  uiText(isArabic, 'text0073')
                )}
          </button>


          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() =>
              setShowFilters(
                (
                  current,
                ) =>
                  !current,
              )
            }
          >
            {uiText(isArabic, 'text0271')}

            {filterCount >
              0 && (
              <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                {filterCount}
              </span>
            )}
          </button>
        </div>


        {showFilters && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <div>
                <label className="label">
                  {uiText(isArabic, 'text0163')}
                </label>

                <select
                  className="input"
                  value={
                    taskType
                  }
                  onChange={(
                    event,
                  ) =>
                    setTaskType(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0008')}
                  </option>

                  {visibleTypes.map(
                    (
                      item,
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.key
                        }
                      >
                        {isArabic
                          ? item.codeAr
                          : item.codeEn}
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0432')}
                </label>

                <select
                  className="input"
                  value={
                    projectId
                  }
                  onChange={(
                    event,
                  ) =>
                    setProjectId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0410')}
                  </option>

                  {projects.map(
                    (
                      project,
                    ) => (
                      <option
                        key={
                          project.id
                        }
                        value={
                          project.id
                        }
                      >
                        {project.name}
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0530')}
                </label>

                <select
                  className="input"
                  value={
                    minRating
                  }
                  onChange={(
                    event,
                  ) =>
                    setMinRating(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0531')}
                  </option>

                  {RATINGS.map(
                    (
                      rating,
                    ) => (
                      <option
                        key={
                          rating
                        }
                        value={
                          String(
                            rating,
                          )
                        }
                      >
                        {rating}★{' '}

                        {uiText(isArabic, 'text0532')}
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0533')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    deadlineFrom
                  }
                  max={
                    deadlineTo ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeadlineFrom(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0164')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    deadlineTo
                  }
                  min={
                    deadlineFrom ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setDeadlineTo(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div className="flex items-end">
                <label className="flex min-h-[42px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4">
                  <input
                    type="checkbox"
                    checked={
                      upcomingOnly
                    }
                    onChange={(
                      event,
                    ) =>
                      setUpcomingOnly(
                        event.target.checked,
                      )
                    }
                  />

                  <span className="text-sm font-medium text-slate-700">
                    {uiText(isArabic, 'text0165')}
                  </span>
                </label>
              </div>
            </div>


            {hasFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                  onClick={
                    clearFilters
                  }
                >
                  {uiText(isArabic, 'text0275')}
                </button>
              </div>
            )}
          </div>
        )}
      </section>


      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">
            {total}
          </span>{' '}

          {isArabic
            ? 'مهمة'
            : total ===
                1
              ? 'task'
              : 'tasks'}
        </div>


        {tab ===
          'assignedByMe' &&
          sortBy ===
            'createdAt' &&
          sortDir ===
            'desc' && (
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            {uiText(isArabic, 'text0534')}
          </span>
        )}


        {hasFilters && (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:text-brand-800"
            onClick={
              clearFilters
            }
          >
            {uiText(isArabic, 'text0426')}
          </button>
        )}
      </div>


      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}


      {loading ? (
        <InlineLoader className="mt-4 min-h-48" />
      ) : tasks.length ===
        0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            tab={
              tab
            }
            isArabic={
              isArabic
            }
          />
        </div>
      ) : viewMode ===
        'cards' ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tasks.map(
            (
              task,
            ) => {
              const rating =
                avgRating(
                  task,
                );


              const overdue =
                isOverdue(
                  task,
                );


              const dueSoon =
                isDueSoon(
                  task,
                );


              const description =
                taskDescription(
                  task,
                );


              return (
                <article
                  key={
                    task.id
                  }
                  className="group relative flex min-h-[305px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                  style={
                    task.color
                      ? {
                          borderTop:
                            `3px solid ${task.color}`,
                        }
                      : undefined
                  }
                >
                  <Link
                    href={`/tasks/${task.id}`}
                    className="absolute inset-0 z-10"
                    aria-label={
                      taskTitle(
                        task,
                      )
                    }
                  />


                  <div className="p-5">
                    <div className="relative z-0 flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          value={
                            task.status
                          }
                          listType="task_status"
                        />

                        <StatusBadge
                          value={
                            task.priority
                          }
                          listType="task_priority"
                        />
                      </div>


                      {overdue && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">
                          {uiText(isArabic, 'text0285')}
                        </span>
                      )}


                      {!overdue &&
                        dueSoon && (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                          {uiText(isArabic, 'text0166')}
                        </span>
                      )}
                    </div>


                    <h2 className="mt-4 line-clamp-2 text-base font-semibold tracking-tight text-slate-900 transition group-hover:text-brand-700">
                      {taskTitle(
                        task,
                      )}
                    </h2>


                    <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
                      {description ||
                        (
                          uiText(isArabic, 'text0427')
                        )}
                    </p>


                    <div className="mt-4">
                      <StatusBadge
                        value={
                          task.taskType
                        }
                        listType="task_type"
                      />
                    </div>


                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {tab ===
                          'assignedToMe'
                            ? (
                                uiText(isArabic, 'text0483')
                              )
                            : (
                                uiText(isArabic, 'text0051')
                              )}
                        </div>

                        {(tab === 'assignedToMe' ? task.createdBy : task.assignedTo) ? (
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <Avatar
                              name={(tab === 'assignedToMe' ? task.createdBy : task.assignedTo)?.fullName || '—'}
                              avatarUrl={(tab === 'assignedToMe' ? task.createdBy : task.assignedTo)?.avatarUrl}
                              size="sm"
                              className="shrink-0"
                            />
                            <span className="truncate text-xs font-medium text-slate-700">
                              {(tab === 'assignedToMe' ? task.createdBy : task.assignedTo)?.fullName}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 truncate text-xs font-medium text-slate-700">
                            {uiText(isArabic, 'text0115')}
                          </div>
                        )}
                      </div>


                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {uiText(isArabic, 'text0116')}
                        </div>

                        <div
                          className={`mt-1 truncate text-xs font-medium ${
                            overdue
                              ? 'text-red-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {formatDate(
                            task.deadlineDate,
                            locale,
                          )}
                        </div>
                      </div>
                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0432')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {task.project
                            ?.name ||
                            '—'}
                        </div>
                      </div>


                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0529')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {formatDate(
                            task.createdAt,
                            locale,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="relative z-20 mt-auto border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Stars
                        value={
                          rating
                        }
                      />

                      <TaskActions
                        task={
                          task
                        }
                      />
                    </div>


                    {rowError?.id ===
                      task.id && (
                      <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                        {rowError.message}
                      </div>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(280px,1fr)_140px_170px_170px_150px_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:grid">
            <div>
              {uiText(isArabic, 'text0167')}
            </div>

            <div>
              {uiText(isArabic, 'text0052')}
            </div>

            <div>
              {tab ===
              'assignedToMe'
                ? (
                    uiText(isArabic, 'text0483')
                  )
                : (
                    uiText(isArabic, 'text0051')
                  )}
            </div>

            <div>
              {uiText(isArabic, 'text0432')}
            </div>

            <div>
              {uiText(isArabic, 'text0535')}
            </div>

            <div />
          </div>


          <div className="divide-y divide-slate-100">
            {tasks.map(
              (
                task,
              ) => {
                const overdue =
                  isOverdue(
                    task,
                  );

                const dueSoon =
                  isDueSoon(
                    task,
                  );

                const rating =
                  avgRating(
                    task,
                  );


                return (
                  <article
                    key={
                      task.id
                    }
                    className="group relative px-5 py-4 transition hover:bg-slate-50/70"
                  >
                    <Link
                      href={`/tasks/${task.id}`}
                      className="absolute inset-0 z-10"
                      aria-label={
                        taskTitle(
                          task,
                        )
                      }
                    />


                    <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(280px,1fr)_140px_170px_170px_150px_auto] xl:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {task.color && (
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  task.color,
                              }}
                            />
                          )}

                          <h2 className="truncate text-sm font-semibold text-slate-800 transition group-hover:text-brand-700">
                            {taskTitle(
                              task,
                            )}
                          </h2>


                          {overdue && (
                            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">
                              {uiText(isArabic, 'text0285')}
                            </span>
                          )}


                          {!overdue &&
                            dueSoon && (
                            <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                              {uiText(isArabic, 'text0079')}
                            </span>
                          )}
                        </div>


                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <StatusBadge
                            value={
                              task.priority
                            }
                            listType="task_priority"
                          />

                          <StatusBadge
                            value={
                              task.taskType
                            }
                            listType="task_type"
                          />

                          <Stars
                            value={
                              rating
                            }
                          />
                        </div>
                      </div>


                      <div>
                        <StatusBadge
                          value={
                            task.status
                          }
                          listType="task_status"
                        />
                      </div>


                      {(tab === 'assignedToMe' ? task.createdBy : task.assignedTo) ? (
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar
                            name={(tab === 'assignedToMe' ? task.createdBy : task.assignedTo)?.fullName || '—'}
                            avatarUrl={(tab === 'assignedToMe' ? task.createdBy : task.assignedTo)?.avatarUrl}
                            size="sm"
                            className="shrink-0"
                          />
                          <span className="truncate text-xs font-medium text-slate-700">
                            {(tab === 'assignedToMe' ? task.createdBy : task.assignedTo)?.fullName}
                          </span>
                        </div>
                      ) : (
                        <div className="truncate text-xs font-medium text-slate-700">
                          {uiText(isArabic, 'text0115')}
                        </div>
                      )}


                      <div className="truncate text-xs font-medium text-slate-700">
                        {task.project
                          ?.name ||
                          '—'}
                      </div>


                      <div>
                        <div className="text-xs font-medium text-slate-700">
                          {formatDate(
                            task.createdAt,
                            locale,
                          )}
                        </div>

                        <div
                          className={`mt-1 text-[10px] ${
                            overdue
                              ? 'text-red-600'
                              : 'text-slate-400'
                          }`}
                        >
                          {uiText(isArabic, 'text0168')}{' '}

                          {formatDate(
                            task.deadlineDate,
                            locale,
                          )}
                        </div>
                      </div>


                      <div className="relative z-20 flex justify-start xl:justify-end">
                        <TaskActions
                          task={
                            task
                          }
                        />
                      </div>
                    </div>


                    {rowError?.id ===
                      task.id && (
                      <div className="relative z-20 mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                        {rowError.message}
                      </div>
                    )}
                  </article>
                );
              },
            )}
          </div>
        </div>
      )}


      {!loading &&
        !error && (
        <Pagination
          page={
            page
          }
          totalPages={
            totalPages
          }
          total={
            total
          }
          onPageChange={
            setPage
          }
          itemLabel={
            uiText(isArabic, 'text0024')
          }
        />
      )}


      <ReasonModal
        open={
          finishModalTask !==
          null
        }
        title={
          uiText(isArabic, 'text0103')
        }
        description={
          finishModalTask
            ? (
                uiText(isArabic, 'text0738', { value0: taskTitle(
                      finishModalTask,
                    ) })
              )
            : ''
        }
        minLength={
          10
        }
        confirmLabel={
          uiText(isArabic, 'text0110')
        }
        onCancel={() =>
          setFinishModalTask(
            null,
          )
        }
        onConfirm={(
          reason,
        ) => {
          if (
            finishModalTask
          ) {
            finishTask(
              finishModalTask,
              reason,
            );
          }
        }}
      />


      {archiveModalTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              actingOnId !==
                archiveModalTask.id
            ) {
              setArchiveModalTask(
                null,
              );
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    d="M5 8h14v12H5zM4 4h16v4H4zM9 12h6"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>


              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {uiText(isArabic, 'text0536')}
              </h2>


              <p className="mt-2 text-sm leading-6 text-slate-500">
                {uiText(isArabic, 'text0739', { value0: taskTitle(
                      archiveModalTask,
                    ) })}
              </p>
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  actingOnId ===
                  archiveModalTask.id
                }
                onClick={() =>
                  setArchiveModalTask(
                    null,
                  )
                }
              >
                {uiText(isArabic, 'text0080')}
              </button>


              <button
                type="button"
                className="btn-primary"
                disabled={
                  actingOnId ===
                  archiveModalTask.id
                }
                onClick={() =>
                  archiveTask(
                    archiveModalTask,
                  )
                }
              >
                {actingOnId ===
                archiveModalTask.id
                  ? (
                      uiText(isArabic, 'text0400')
                    )
                  : (
                      uiText(isArabic, 'text0477')
                    )}
              </button>
            </div>
          </div>
        </div>
      )}
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
