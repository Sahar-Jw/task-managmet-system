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
import Pagination from '@/components/Pagination';
import Avatar from '@/components/Avatar';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  canEditTask,
} from '@/lib/task-permissions';

import {
  useListLabels,
} from '@/lib/list-labels-context';

import {
  ApiError,
} from '@/lib/api';

import {
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  SettingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Branch,
  Department,
  Project,
  Setting,
  Task,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE =
  12;


type PageView =
  | 'tasks'
  | 'archived';


type ViewMode =
  | 'cards'
  | 'list';


type SortBy =
  | 'createdAt'
  | 'deadline'
  | 'startDate'
  | 'title'
  | 'status'
  | 'taskType';


type SortDir =
  | 'asc'
  | 'desc';


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function avgRating(
  task: Task,
): number | null {
  if (
    !task.ratings ||
    task.ratings.length ===
      0
  ) {
    return null;
  }


  const sum =
    task.ratings.reduce(
      (
        total,
        rating,
      ) =>
        total +
        rating.score,
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
  if (
    value ===
    null
  ) {
    return null;
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


function formatDate(
  value?: string | null,
  locale?: string,
) {
  if (!value) {
    return '—';
  }


  /*
   * date-only values should remain date-only and avoid timezone shifting.
   */
  const parsed =
    /^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
      ? new Date(
          `${value}T00:00:00`,
        )
      : new Date(
          value,
        );


  return parsed.toLocaleDateString(
    locale,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  );
}


function isTaskDone(
  task: Task,
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
  task: Task,
) {
  if (
    !task.deadlineDate ||
    isTaskDone(
      task,
    )
  ) {
    return false;
  }


  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );


  return (
    task.deadlineDate <
    today
  );
}


function isDueSoon(
  task: Task,
) {
  if (
    !task.deadlineDate ||
    isTaskDone(
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


/*
 * ============================================================
 * SMALL COMPONENTS
 * ============================================================
 */

function ViewToggle({
  value,
  onChange,
  isArabic,
}: {
  value: ViewMode;

  onChange: (
    next: ViewMode,
  ) => void;

  isArabic: boolean;
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
  isArabic,
}: {
  isArabic: boolean;
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
        {uiText(isArabic, 'text0194')}
      </h3>


      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {uiText(isArabic, 'text0521')}
      </p>
    </div>
  );
}


/*
 * ============================================================
 * MAIN CONTENT
 * ============================================================
 */

function TasksContent() {
  const searchParams =
    useSearchParams();


  const locale =
    useLocale();

  const isArabic =
    locale ===
    'ar';


  const {
    user,
  } = useAuth();


  const {
    getLabel,
  } = useListLabels();


  /*
   * ==========================================================
   * INITIAL URL FILTERS
   * ==========================================================
   */

  const startsInArchive =
    searchParams.get(
      'status',
    ) ===
    'Archived';


  /*
   * ==========================================================
   * PAGE / VIEW
   * ==========================================================
   */

  const [
    pageView,
    setPageView,
  ] = useState<PageView>(
    startsInArchive
      ? 'archived'
      : 'tasks',
  );


  const [
    viewMode,
    setViewMode,
  ] = useState<ViewMode>(
    'cards',
  );


  const [
    showFilters,
    setShowFilters,
  ] = useState(false);


  /*
   * ==========================================================
   * FILTERS
   * ==========================================================
   */

  const [
    status,
    setStatus,
  ] = useState(
    startsInArchive
      ? ''
      : searchParams.get(
          'status',
        ) ||
        '',
  );


  const [
    taskType,
    setTaskType,
  ] = useState(
    searchParams.get(
      'taskType',
    ) ||
    '',
  );


  const [
    priority,
    setPriority,
  ] = useState(
    searchParams.get(
      'priority',
    ) ||
    '',
  );


  const [
    search,
    setSearch,
  ] = useState('');


  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState('');


  const [
    dueDateFrom,
    setDueDateFrom,
  ] = useState('');


  const [
    dueDateTo,
    setDueDateTo,
  ] = useState('');


  const [
    startDateFrom,
    setStartDateFrom,
  ] = useState('');


  const [
    startDateTo,
    setStartDateTo,
  ] = useState('');


  const [
    createdDateFrom,
    setCreatedDateFrom,
  ] = useState('');


  const [
    createdDateTo,
    setCreatedDateTo,
  ] = useState('');


  const [
    departmentId,
    setDepartmentId,
  ] = useState('');


  const [
    branchId,
    setBranchId,
  ] = useState('');


  const [
    projectId,
    setProjectId,
  ] = useState(
    searchParams.get(
      'projectId',
    ) ||
    '',
  );


  const [
    ownerId,
    setOwnerId,
  ] = useState(
    searchParams.get(
      'ownerId',
    ) ||
    '',
  );


  const [
    assignedToId,
    setAssignedToId,
  ] = useState(
    searchParams.get(
      'assignedToId',
    ) ||
    '',
  );


  const [
    overdueOnly,
    setOverdueOnly,
  ] = useState(
    searchParams.get(
      'overdueOnly',
    ) === 'true',
  );


  const [
    hasDeadline,
    setHasDeadline,
  ] = useState('');


  /*
   * ==========================================================
   * SORT
   * ==========================================================
   */

  const [
    sortBy,
    setSortBy,
  ] = useState<SortBy>(
    'createdAt',
  );


  const [
    sortDir,
    setSortDir,
  ] = useState<SortDir>(
    'desc',
  );


  /*
   * ==========================================================
   * LOOKUPS
   * ==========================================================
   */

  const [
    departments,
    setDepartments,
  ] = useState<
    Department[]
  >([]);


  const [
    branches,
    setBranches,
  ] = useState<
    Branch[]
  >([]);


  const [
    projects,
    setProjects,
  ] = useState<
    Project[]
  >([]);


  const [
    owners,
    setOwners,
  ] = useState<
    User[]
  >([]);


  const [
    taskStatuses,
    setTaskStatuses,
  ] = useState<
    Setting[]
  >([]);


  const [
    taskTypes,
    setTaskTypes,
  ] = useState<
    Setting[]
  >([]);


  const [
    taskPriorities,
    setTaskPriorities,
  ] = useState<
    Setting[]
  >([]);


  /*
   * ==========================================================
   * TASK DATA
   * ==========================================================
   */

  const [
    tasks,
    setTasks,
  ] = useState<
    Task[]
  >([]);


  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );


  const [
    error,
    setError,
  ] = useState('');


  const [
    page,
    setPage,
  ] = useState(
    1,
  );


  const [
    total,
    setTotal,
  ] = useState(
    0,
  );


  const [
    busyId,
    setBusyId,
  ] = useState<
    string | null
  >(null);


  const [
    rowError,
    setRowError,
  ] = useState<{
    id: string;
    message: string;
  } | null>(
    null,
  );


  const [
    confirmArchive,
    setConfirmArchive,
  ] = useState<
    Task | null
  >(null);


  /*
   * ==========================================================
   * SAVED VIEW MODE
   * ==========================================================
   */

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        'admin-tasks-view-mode',
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
    next: ViewMode,
  ) {
    setViewMode(
      next,
    );


    window.localStorage.setItem(
      'admin-tasks-view-mode',
      next,
    );
  }


  /*
   * ==========================================================
   * DEBOUNCE SEARCH
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


    return () =>
      window.clearTimeout(
        timer,
      );
  }, [
    search,
  ]);


  /*
   * ==========================================================
   * LOAD LOOKUPS
   * ==========================================================
   */

  useEffect(() => {
    DepartmentsApi.list()
      .then(
        setDepartments,
      )
      .catch(
        () => {},
      );


    BranchesApi.list()
      .then(
        setBranches,
      )
      .catch(
        () => {},
      );


    ProjectsApi.list({
      limit: '100',
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


    UsersApi.list({
      limit: '100',
    })
      .then(
        (
          response,
        ) =>
          setOwners(
            response.items
              .filter(
                (
                  owner,
                ) =>
                  owner.isActive,
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
          ),
      )
      .catch(
        () => {},
      );


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
  }, []);


  /*
   * ==========================================================
   * CURRENT LANGUAGE
   * ==========================================================
   */

  function settingLabel(
    item:
      | Setting
      | undefined,
  ) {
    if (!item) {
      return '—';
    }


    if (
      isArabic
    ) {
      return (
        item.valueAr ||
        item.codeAr ||
        item.valueEn ||
        item.codeEn ||
        '—'
      );
    }


    return (
      item.valueEn ||
      item.codeEn ||
      item.valueAr ||
      item.codeAr ||
      '—'
    );
  }


  function taskTitle(
    task: Task,
  ) {
    return task.title;
  }


  function taskDescription(
    task: Task,
  ) {
    return task.description;
  }


  const visibleDepartments =
    useMemo(
      () =>
        departments.filter(
          (
            department,
          ) =>
            department.isActive &&
            Boolean(
              isArabic
                ? department.valueAr ||
                    department.codeAr
                : department.valueEn ||
                    department.codeEn,
            ),
        ),
      [
        departments,
        isArabic,
      ],
    );


  const visibleBranches =
    useMemo(
      () =>
        branches.filter(
          (
            branch,
          ) =>
            branch.isActive &&
            Boolean(
              isArabic
                ? branch.valueAr ||
                    branch.codeAr
                : branch.valueEn ||
                    branch.codeEn,
            ),
        ),
      [
        branches,
        isArabic,
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


  /*
   * Admin users cannot normally be assignees.
   */
  const assignableUsers =
    owners.filter(
      (
        owner,
      ) =>
        owner.role.name !==
        'ADMIN',
    );


  /*
   * ==========================================================
   * LOAD TASKS
   * ==========================================================
   */

  const load =
    useCallback(
      async () => {
        setLoading(
          true,
        );

        setError('');


        try {
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

            sortBy,

            sortDir,
          };


          if (
            pageView ===
            'archived'
          ) {
            params.status =
              'Archived';
          } else {
            params.excludeArchived =
              'true';


            if (
              status
            ) {
              params.status =
                status;
            }
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
            debouncedSearch
          ) {
            params.search =
              debouncedSearch;
          }


          if (
            dueDateFrom
          ) {
            params.dueDateFrom =
              dueDateFrom;
          }


          if (
            dueDateTo
          ) {
            params.dueDateTo =
              dueDateTo;
          }


          if (
            startDateFrom
          ) {
            params.startDateFrom =
              startDateFrom;
          }


          if (
            startDateTo
          ) {
            params.startDateTo =
              startDateTo;
          }


          if (
            createdDateFrom
          ) {
            params.createdDateFrom =
              createdDateFrom;
          }


          if (
            createdDateTo
          ) {
            params.createdDateTo =
              createdDateTo;
          }


          if (
            departmentId
          ) {
            params.departmentId =
              departmentId;
          }


          if (
            branchId
          ) {
            params.branchId =
              branchId;
          }


          if (
            projectId
          ) {
            params.projectId =
              projectId;
          }


          if (
            ownerId
          ) {
            params.createdById =
              ownerId;
          }


          if (
            assignedToId
          ) {
            params.assignedToId =
              assignedToId;
          }


          if (
            overdueOnly
          ) {
            params.overdueOnly =
              'true';
          }


          if (
            hasDeadline
          ) {
            params.hasDeadline =
              hasDeadline;
          }


          const response =
            await TasksApi.list(
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
            err instanceof ApiError
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
        pageView,
        status,
        taskType,
        priority,
        debouncedSearch,
        dueDateFrom,
        dueDateTo,
        startDateFrom,
        startDateTo,
        createdDateFrom,
        createdDateTo,
        departmentId,
        branchId,
        projectId,
        ownerId,
        assignedToId,
        overdueOnly,
        hasDeadline,
        sortBy,
        sortDir,
        page,
        isArabic,
      ],
    );


  useEffect(() => {
    load();
  }, [
    load,
  ]);


  /*
   * Reset pagination when filtering changes.
   */
  useEffect(() => {
    setPage(
      1,
    );
  }, [
    pageView,
    status,
    taskType,
    priority,
    debouncedSearch,
    dueDateFrom,
    dueDateTo,
    startDateFrom,
    startDateTo,
    createdDateFrom,
    createdDateTo,
    departmentId,
    branchId,
    projectId,
    ownerId,
    assignedToId,
    overdueOnly,
    hasDeadline,
    sortBy,
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
      status ||
      taskType ||
      priority ||
      dueDateFrom ||
      dueDateTo ||
      startDateFrom ||
      startDateTo ||
      createdDateFrom ||
      createdDateTo ||
      departmentId ||
      branchId ||
      projectId ||
      ownerId ||
      assignedToId ||
      overdueOnly ||
      hasDeadline,
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
        taskType,
      ),

      Boolean(
        priority,
      ),

      Boolean(
        dueDateFrom ||
        dueDateTo,
      ),

      Boolean(
        startDateFrom ||
        startDateTo,
      ),

      Boolean(
        createdDateFrom ||
        createdDateTo,
      ),

      Boolean(
        departmentId,
      ),

      Boolean(
        branchId,
      ),

      Boolean(
        projectId,
      ),

      Boolean(
        ownerId,
      ),

      Boolean(
        assignedToId,
      ),

      overdueOnly,

      Boolean(
        hasDeadline,
      ),
    ].filter(
      Boolean,
    ).length;


  function clearFilters() {
    setSearch('');
    setStatus('');
    setTaskType('');
    setPriority('');
    setDueDateFrom('');
    setDueDateTo('');
    setStartDateFrom('');
    setStartDateTo('');
    setCreatedDateFrom('');
    setCreatedDateTo('');
    setDepartmentId('');
    setBranchId('');
    setProjectId('');
    setOwnerId('');
    setAssignedToId('');
    setOverdueOnly(
      false,
    );
    setHasDeadline('');
  }


  /*
   * ==========================================================
   * ARCHIVE
   * ==========================================================
   */

  async function archiveTask(
    id: string,
  ) {
    setBusyId(
      id,
    );

    setRowError(
      null,
    );


    try {
      /*
       * Your DELETE endpoint soft-archives by default.
       */
      await TasksApi.remove(
        id,
      );


      setConfirmArchive(
        null,
      );


      await load();
    } catch (
      err
    ) {
      setRowError({
        id,

        message:
          err instanceof ApiError
            ? err.message
            : uiText(isArabic, 'text0522'),
      });


      setConfirmArchive(
        null,
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }


  /*
   * ==========================================================
   * UNARCHIVE
   * ==========================================================
   */

  async function unarchiveTask(
    id: string,
  ) {
    setBusyId(
      id,
    );

    setRowError(
      null,
    );


    try {
      await TasksApi.unarchive(
        id,
      );


      await load();
    } catch (
      err
    ) {
      setRowError({
        id,

        message:
          err instanceof ApiError
            ? err.message
            : uiText(isArabic, 'text0579'),
      });
    } finally {
      setBusyId(
        null,
      );
    }
  }


  /*
   * ==========================================================
   * PAGE SWITCH
   * ==========================================================
   */

  function changePageView(
    next: PageView,
  ) {
    if (
      next ===
      pageView
    ) {
      return;
    }


    setPageView(
      next,
    );

    setPage(
      1,
    );


    if (
      next ===
      'archived'
    ) {
      setStatus('');
    }
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
   * CARD / ROW ACTIONS
   * ==========================================================
   */

  function TaskActions({
    task,
  }: {
    task: Task;
  }) {
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


        {pageView ===
        'archived' ? (
          <button
            type="button"
            disabled={
              busyId ===
              task.id
            }
            onClick={(
              event,
            ) => {
              event.preventDefault();
              event.stopPropagation();

              unarchiveTask(
                task.id,
              );
            }}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
          >
            {busyId ===
            task.id
              ? uiText(isArabic, 'text0402')
              : uiText(isArabic, 'text0403')}
          </button>
        ) : (
          <button
            type="button"
            disabled={
              busyId ===
              task.id
            }
            onClick={(
              event,
            ) => {
              event.preventDefault();
              event.stopPropagation();

              setConfirmArchive(
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


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="mx-auto max-w-[1600px] pb-12"
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

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-7">
        <div className="pointer-events-none absolute -right-32 -top-32 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />


        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
              {uiText(isArabic, 'text0580')}
            </div>


            <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">
              {uiText(isArabic, 'text0195')}
            </h1>


            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {pageView ===
              'archived'
                ? uiText(isArabic, 'text0581')
                : uiText(isArabic, 'text0582')}
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


      {/*
       * ======================================================
       * ACTIVE / ARCHIVE
       * ======================================================
       */}

      <div className="mt-5 flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() =>
            changePageView(
              'tasks',
            )
          }
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            pageView ===
            'tasks'
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {uiText(isArabic, 'text0195')}
        </button>


        <button
          type="button"
          onClick={() =>
            changePageView(
              'archived',
            )
          }
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            pageView ===
            'archived'
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {uiText(isArabic, 'text0412')}
        </button>
      </div>


      {/*
       * ======================================================
       * PRIMARY FILTER BAR
       * ======================================================
       */}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          {/*
           * SEARCH
           */}

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
           * STATUS
           */}

          {pageView !==
            'archived' && (
            <select
              className="input xl:w-[190px]"
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


              {visibleStatuses
                .filter(
                  (
                    item,
                  ) =>
                    item.key !==
                    'Archived',
                )
                .map(
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
          )}


          {/*
           * PRIORITY
           */}

          <select
            className="input xl:w-[180px]"
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


          {/*
           * SORT
           */}

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

            <option value="startDate">
              {uiText(isArabic, 'text0415')}
            </option>

            <option value="title">
              {uiText(isArabic, 'text0196')}
            </option>

            <option value="status">
              {uiText(isArabic, 'text0052')}
            </option>

            <option value="taskType">
              {uiText(isArabic, 'text0197')}
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
              : '↓'}

            <span className="ml-1">
              {sortDir ===
              'asc'
                ? uiText(isArabic, 'text0072')
                : uiText(isArabic, 'text0073')}
            </span>
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
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="mr-1.5 h-4 w-4"
            >
              <path
                d="M4 6h16M7 12h10M10 18h4"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>

            {uiText(isArabic, 'text0271')}

            {filterCount >
              0 && (
              <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                {
                  filterCount
                }
              </span>
            )}
          </button>
        </div>


        {/*
         * ====================================================
         * ADVANCED FILTERS
         * ====================================================
         */}

        {showFilters && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  {uiText(isArabic, 'text0374')}
                </label>

                <select
                  className="input"
                  value={
                    departmentId
                  }
                  onChange={(
                    event,
                  ) =>
                    setDepartmentId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0419')}
                  </option>


                  {visibleDepartments.map(
                    (
                      department,
                    ) => (
                      <option
                        key={
                          department.id
                        }
                        value={
                          department.id
                        }
                      >
                        {settingLabel(
                          department,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0371')}
                </label>

                <select
                  className="input"
                  value={
                    branchId
                  }
                  onChange={(
                    event,
                  ) =>
                    setBranchId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0420')}
                  </option>


                  {visibleBranches.map(
                    (
                      branch,
                    ) => (
                      <option
                        key={
                          branch.id
                        }
                        value={
                          branch.id
                        }
                      >
                        {settingLabel(
                          branch,
                        )}
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
                        {
                          project.name
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0483')}
                </label>

                <select
                  className="input"
                  value={
                    ownerId
                  }
                  onChange={(
                    event,
                  ) =>
                    setOwnerId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0583')}
                  </option>


                  {owners.map(
                    (
                      owner,
                    ) => (
                      <option
                        key={
                          owner.id
                        }
                        value={
                          owner.id
                        }
                      >
                        {
                          owner.fullName
                        }
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0051')}
                </label>

                <select
                  className="input"
                  value={
                    assignedToId
                  }
                  onChange={(
                    event,
                  ) =>
                    setAssignedToId(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0198')}
                  </option>


                  {assignableUsers.map(
                    (
                      owner,
                    ) => (
                      <option
                        key={
                          owner.id
                        }
                        value={
                          owner.id
                        }
                      >
                        {
                          owner.fullName
                        }
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
                    dueDateFrom
                  }
                  max={
                    dueDateTo ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setDueDateFrom(
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
                    dueDateTo
                  }
                  min={
                    dueDateFrom ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setDueDateTo(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0423')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    startDateFrom
                  }
                  max={
                    startDateTo ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setStartDateFrom(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0424')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    startDateTo
                  }
                  min={
                    startDateFrom ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setStartDateTo(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0421')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    createdDateFrom
                  }
                  max={
                    createdDateTo ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setCreatedDateFrom(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0422')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    createdDateTo
                  }
                  min={
                    createdDateFrom ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setCreatedDateTo(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0148')}
                </label>

                <select
                  className="input"
                  value={
                    hasDeadline
                  }
                  onChange={(
                    event,
                  ) =>
                    setHasDeadline(
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    {uiText(isArabic, 'text0044')}
                  </option>

                  <option value="true">
                    {uiText(isArabic, 'text0199')}
                  </option>

                  <option value="false">
                    {uiText(isArabic, 'text0192')}
                  </option>
                </select>
              </div>


              <div className="flex items-end">
                <label className="flex min-h-[42px] w-full cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4">
                  <input
                    type="checkbox"
                    checked={
                      overdueOnly
                    }
                    onChange={(
                      event,
                    ) =>
                      setOverdueOnly(
                        event.target.checked,
                      )
                    }
                  />

                  <span className="text-sm font-medium text-slate-700">
                    {uiText(isArabic, 'text0584')}
                  </span>
                </label>
              </div>
            </div>


            {hasFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="text-sm font-medium text-red-600 hover:text-red-700"
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
       * RESULT INFO
       * ======================================================
       */}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500">
          <span className="font-semibold text-slate-800">
            {
              total
            }
          </span>{' '}

          {isArabic
            ? 'مهمة'
            : total ===
                1
              ? 'task'
              : 'tasks'}
        </div>


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


      {/*
       * ======================================================
       * ERROR
       * ======================================================
       */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {
            error
          }
        </div>
      )}


      {/*
       * ======================================================
       * LOADING
       * ======================================================
       */}

      {loading ? (
        <InlineLoader className="mt-4 min-h-48" />
      ) : tasks.length ===
        0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white">
          <EmptyState
            isArabic={
              isArabic
            }
          />
        </div>
      ) : viewMode ===
        'cards' ? (
        /*
         * ====================================================
         * CARD VIEW
         * ====================================================
         */

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
                  className="group relative flex min-h-[300px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                  style={
                    task.color
                      ? {
                          borderTop:
                            `3px solid ${task.color}`,
                        }
                      : undefined
                  }
                >
                  {/*
                   * FULL CARD LINK
                   */}

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
                          {uiText(isArabic, 'text0051')}
                        </div>

                        {task.assignedTo ? (
                          <div className="mt-1 flex min-w-0 items-center gap-2">
                            <Avatar
                              name={task.assignedTo.fullName}
                              avatarUrl={task.assignedTo.avatarUrl}
                              size="sm"
                              className="shrink-0"
                            />
                            <span className="truncate text-xs font-medium text-slate-700">
                              {task.assignedTo.fullName}
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
                          {uiText(isArabic, 'text0374')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {settingLabel(
                            task.department,
                          )}
                        </div>
                      </div>


                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0371')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {settingLabel(
                            task.branch,
                          )}
                        </div>
                      </div>


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
                          {uiText(isArabic, 'text0483')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {task.createdBy
                            ?.fullName ||
                            '—'}
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="relative z-20 mt-auto border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          {new Date(
                            task.createdAt,
                          ).toLocaleDateString(
                            locale,
                          )}
                        </span>

                        <Stars
                          value={
                            rating
                          }
                        />
                      </div>


                      <TaskActions
                        task={
                          task
                        }
                      />
                    </div>


                    {rowError?.id ===
                      task.id && (
                      <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                        {
                          rowError.message
                        }
                      </div>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      ) : (
        /*
         * ====================================================
         * LIST VIEW
         * ====================================================
         */

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[minmax(260px,1fr)_140px_160px_170px_170px_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:grid">
            <div>
              {uiText(isArabic, 'text0167')}
            </div>

            <div>
              {uiText(isArabic, 'text0052')}
            </div>

            <div>
              {uiText(isArabic, 'text0051')}
            </div>

            <div>
              {uiText(isArabic, 'text0518')}
            </div>

            <div>
              {uiText(isArabic, 'text0116')}
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


                    <div className="relative z-0 grid gap-4 xl:grid-cols-[minmax(260px,1fr)_140px_160px_170px_170px_auto] xl:items-center">
                      {/*
                       * TASK
                       */}

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


                      {/*
                       * STATUS
                       */}

                      <div>
                        <StatusBadge
                          value={
                            task.status
                          }
                          listType="task_status"
                        />
                      </div>


                      {/*
                       * ASSIGNEE
                       */}

                      <div className="min-w-0">
                        {task.assignedTo ? (
                          <div className="flex min-w-0 items-center gap-2">
                            <Avatar
                              name={task.assignedTo.fullName}
                              avatarUrl={task.assignedTo.avatarUrl}
                              size="sm"
                              className="shrink-0"
                            />
                            <span className="truncate text-xs font-medium text-slate-700">
                              {task.assignedTo.fullName}
                            </span>
                          </div>
                        ) : (
                          <div className="truncate text-xs font-medium text-slate-700">
                            {uiText(isArabic, 'text0115')}
                          </div>
                        )}

                        <div className="mt-1 truncate text-[10px] text-slate-400">
                          {uiText(isArabic, 'text0200')}{' '}

                          {task.createdBy
                            ?.fullName ||
                            '—'}
                        </div>
                      </div>


                      {/*
                       * ORG
                       */}

                      <div className="min-w-0 text-xs">
                        <div className="truncate font-medium text-slate-600">
                          {settingLabel(
                            task.department,
                          )}
                        </div>

                        <div className="mt-1 truncate text-[10px] text-slate-400">
                          {settingLabel(
                            task.branch,
                          )}

                          {task.project
                            ?.name
                            ? ` · ${task.project.name}`
                            : ''}
                        </div>
                      </div>


                      {/*
                       * DEADLINE
                       */}

                      <div>
                        <div
                          className={`text-xs font-medium ${
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

                        <div className="mt-1 text-[10px] text-slate-400">
                          {uiText(isArabic, 'text0585')}{' '}

                          {formatDate(
                            task.startDate,
                            locale,
                          )}
                        </div>
                      </div>


                      {/*
                       * ACTIONS
                       */}

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
                        {
                          rowError.message
                        }
                      </div>
                    )}
                  </article>
                );
              },
            )}
          </div>
        </div>
      )}


      {/*
       * ======================================================
       * PAGINATION
       * ======================================================
       */}

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


      {/*
       * ======================================================
       * ARCHIVE CONFIRMATION
       * ======================================================
       */}

      {confirmArchive && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              busyId !==
                confirmArchive.id
            ) {
              setConfirmArchive(
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
                {uiText(isArabic, 'text0745', { value0: taskTitle(
                      confirmArchive,
                    ) })}
              </p>


              <p className="mt-2 text-xs text-slate-400">
                {uiText(isArabic, 'text0586')}
              </p>
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  busyId ===
                  confirmArchive.id
                }
                onClick={() =>
                  setConfirmArchive(
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
                  busyId ===
                  confirmArchive.id
                }
                onClick={() =>
                  archiveTask(
                    confirmArchive.id,
                  )
                }
              >
                {busyId ===
                confirmArchive.id
                  ? uiText(isArabic, 'text0400')
                  : uiText(isArabic, 'text0477')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function TasksPage() {
  return (
    <ProtectedRoute
      adminOnly
    >
      <TasksContent />
    </ProtectedRoute>
  );
}
