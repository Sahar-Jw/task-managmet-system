// frontend/src/app/projects/page.tsx

'use client';

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

import {
  useAuth,
} from '@/lib/auth-context';

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
  UsersApi,
} from '@/lib/endpoints';

import type {
  Branch,
  Department,
  Project,
  Setting,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE =
  12;


type Scope =
  | 'all'
  | 'mine'
  | 'archived';


type ViewMode =
  | 'list'
  | 'cards';


type SortBy =
  | 'name'
  | 'status'
  | 'createdAt'
  | 'startDate'
  | 'endDate';


type SortDir =
  | 'asc'
  | 'desc';


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function formatDate(
  value?: string | null,
  locale?: string,
) {
  if (!value) {
    return '—';
  }

  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
    locale,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  );
}


function projectIsOverdue(
  project: Project,
) {
  if (
    !project.endDate
  ) {
    return false;
  }


  if (
    project.status ===
      'Completed' ||
    project.status ===
      'Archived'
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
    project.endDate <
    today
  );
}


function projectIsDueSoon(
  project: Project,
) {
  if (
    !project.endDate ||
    project.status ===
      'Completed' ||
    project.status ===
      'Archived'
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


  const end =
    new Date(
      `${project.endDate}T00:00:00`,
    );


  const difference =
    end.getTime() -
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

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}


function ViewToggle({
  value,
  onChange,
  isArabic,
}: {
  value: ViewMode;

  onChange: (
    value: ViewMode,
  ) => void;

  isArabic: boolean;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      <button
        type="button"
        onClick={() =>
          onChange(
            'list',
          )
        }
        title={
          isArabic
            ? 'قائمة'
            : 'List'
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


      <button
        type="button"
        onClick={() =>
          onChange(
            'cards',
          )
        }
        title={
          isArabic
            ? 'بطاقات'
            : 'Cards'
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
    </div>
  );
}


function EmptyState({
  isArabic,
}: {
  isArabic: boolean;
}) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            d="M4 7.5h6l2-2h8v13H4z"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {isArabic
          ? 'لا توجد مشاريع'
          : 'No projects found'}
      </h3>

      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {isArabic
          ? 'غيّر عوامل التصفية أو أنشئ مشروعاً جديداً.'
          : 'Try changing your filters or create a new project.'}
      </p>
    </div>
  );
}


/*
 * ============================================================
 * PROJECTS CONTENT
 * ============================================================
 */

function ProjectsContent() {
  const {
    user,
  } = useAuth();


  const locale =
    useLocale();

  const isArabic =
    locale === 'ar';


  const {
    getLabel,
  } = useListLabels();


  const isAdmin =
    user?.role.name ===
    'ADMIN';


  const searchParams =
    useSearchParams();


  const statusFromUrl =
    searchParams.get(
      'status',
    ) ||
    '';


  /*
   * ==========================================================
   * VIEW
   * ==========================================================
   */

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
   * SCOPE
   * ==========================================================
   */

  const [
    scope,
    setScope,
  ] = useState<Scope>(
    statusFromUrl ===
      'Archived'
      ? 'archived'
      : isAdmin
        ? 'all'
        : 'mine',
  );


  /*
   * ==========================================================
   * PROJECT DATA
   * ==========================================================
   */

  const [
    projects,
    setProjects,
  ] = useState<Project[]>(
    [],
  );


  const [
    total,
    setTotal,
  ] = useState(0);


  const [
    page,
    setPage,
  ] = useState(1);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState('');


  /*
   * ==========================================================
   * LOOKUPS
   * ==========================================================
   */

  const [
    owners,
    setOwners,
  ] = useState<User[]>(
    [],
  );


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
    projectStatuses,
    setProjectStatuses,
  ] = useState<
    Setting[]
  >([]);


  /*
   * ==========================================================
   * FILTERS
   * ==========================================================
   */

  const [
    search,
    setSearch,
  ] = useState('');


  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState('');


  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    statusFromUrl ===
      'Archived'
      ? ''
      : statusFromUrl,
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
    departmentId,
    setDepartmentId,
  ] = useState('');


  const [
    branchId,
    setBranchId,
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
    startDateFrom,
    setStartDateFrom,
  ] = useState('');


  const [
    startDateTo,
    setStartDateTo,
  ] = useState('');


  const [
    endDateFrom,
    setEndDateFrom,
  ] = useState('');


  const [
    endDateTo,
    setEndDateTo,
  ] = useState('');


  const [
    sortBy,
    setSortBy,
  ] = useState<SortBy>(
    'name',
  );


  const [
    sortDir,
    setSortDir,
  ] = useState<SortDir>(
    'asc',
  );


  /*
   * ==========================================================
   * CREATE / EDIT
   * ==========================================================
   */

  const [
    showCreate,
    setShowCreate,
  ] = useState(false);


  const [
    createBusy,
    setCreateBusy,
  ] = useState(false);


  const [
    createError,
    setCreateError,
  ] = useState('');


  const [
    createForm,
    setCreateForm,
  ] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });


  const [
    editingProject,
    setEditingProject,
  ] = useState<Project | null>(
    null,
  );


  const [
    editBusy,
    setEditBusy,
  ] = useState(false);


  const [
    editError,
    setEditError,
  ] = useState('');


  const [
    editForm,
    setEditForm,
  ] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });


  /*
   * ==========================================================
   * ACTIONS
   * ==========================================================
   */

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
    deleteProject,
    setDeleteProject,
  ] = useState<
    Project | null
  >(null);


  /*
   * ==========================================================
   * VIEW PREFERENCE
   * ==========================================================
   */

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        'projects-view-mode',
      );


    if (
      stored ===
        'list' ||
      stored ===
        'cards'
    ) {
      setViewMode(
        stored,
      );
    }
  }, []);


  function changeView(
    next: ViewMode,
  ) {
    setViewMode(
      next,
    );

    window.localStorage.setItem(
      'projects-view-mode',
      next,
    );
  }


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
    SettingsApi.list(
      'project_status',
      true,
    )
      .then(
        setProjectStatuses,
      )
      .catch(
        () => {},
      );


    if (
      !isAdmin
    ) {
      return;
    }


    UsersApi.list({
      limit: '100',
    })
      .then(
        (
          response,
        ) => {
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
          );
        },
      )
      .catch(
        () => {},
      );


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
  }, [
    isAdmin,
  ]);


  /*
   * ==========================================================
   * CURRENT-LANGUAGE LOOKUPS
   * ==========================================================
   */

  function settingLabel(
    setting:
      | Setting
      | undefined,
  ) {
    if (
      !setting
    ) {
      return '—';
    }


    if (
      isArabic
    ) {
      return (
        setting.valueAr ||
        setting.codeAr ||
        setting.valueEn ||
        setting.codeEn ||
        '—'
      );
    }


    return (
      setting.valueEn ||
      setting.codeEn ||
      setting.valueAr ||
      setting.codeAr ||
      '—'
    );
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
                ? department.codeAr ||
                    department.valueAr
                : department.codeEn ||
                    department.valueEn,
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
                ? branch.codeAr ||
                    branch.valueAr
                : branch.codeEn ||
                    branch.valueEn,
            ),
        ),
      [
        branches,
        isArabic,
      ],
    );


  const visibleProjectStatuses =
    useMemo(
      () =>
        projectStatuses.filter(
          (
            status,
          ) =>
            Boolean(
              isArabic
                ? status.codeAr
                : status.codeEn,
            ),
        ),
      [
        projectStatuses,
        isArabic,
      ],
    );


  /*
   * ==========================================================
   * LOAD PROJECTS
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


          /*
           * Scope.
           */
          if (
            isAdmin &&
            scope ===
              'mine'
          ) {
            params.mine =
              'true';
          }


          if (
            scope ===
            'archived'
          ) {
            params.status =
              'Archived';
          } else {
            params.excludeArchived =
              'true';


            if (
              statusFilter
            ) {
              params.status =
                statusFilter;
            }
          }


          /*
           * Search.
           */
          if (
            debouncedSearch
          ) {
            params.search =
              debouncedSearch;
          }


          /*
           * Admin filters.
           */
          if (
            isAdmin &&
            scope !==
              'mine' &&
            ownerId
          ) {
            params.ownerId =
              ownerId;
          }


          if (
            isAdmin &&
            scope !==
              'mine' &&
            departmentId
          ) {
            params.departmentId =
              departmentId;
          }


          if (
            isAdmin &&
            scope !==
              'mine' &&
            branchId
          ) {
            params.branchId =
              branchId;
          }


          /*
           * Created date.
           */
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


          /*
           * Project start.
           */
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


          /*
           * Project end.
           */
          if (
            endDateFrom
          ) {
            params.endDateFrom =
              endDateFrom;
          }


          if (
            endDateTo
          ) {
            params.endDateTo =
              endDateTo;
          }


          const response =
            await ProjectsApi.list(
              params,
            );


          setProjects(
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
              : isArabic
                ? 'تعذر تحميل المشاريع.'
                : 'Could not load projects.',
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        page,
        isAdmin,
        scope,
        debouncedSearch,
        statusFilter,
        ownerId,
        departmentId,
        branchId,
        createdDateFrom,
        createdDateTo,
        startDateFrom,
        startDateTo,
        endDateFrom,
        endDateTo,
        sortBy,
        sortDir,
        isArabic,
      ],
    );


  useEffect(() => {
    load();
  }, [
    load,
  ]);


  /*
   * Reset pagination when filters change.
   */
  useEffect(() => {
    setPage(
      1,
    );
  }, [
    scope,
    debouncedSearch,
    statusFilter,
    ownerId,
    departmentId,
    branchId,
    createdDateFrom,
    createdDateTo,
    startDateFrom,
    startDateTo,
    endDateFrom,
    endDateTo,
    sortBy,
    sortDir,
  ]);


  /*
   * ==========================================================
   * FILTER HELPERS
   * ==========================================================
   */

  const hasFilters =
    Boolean(
      search ||
      statusFilter ||
      ownerId ||
      departmentId ||
      branchId ||
      createdDateFrom ||
      createdDateTo ||
      startDateFrom ||
      startDateTo ||
      endDateFrom ||
      endDateTo,
    );


  const filterCount =
    [
      Boolean(
        search,
      ),

      Boolean(
        statusFilter,
      ),

      Boolean(
        ownerId,
      ),

      Boolean(
        departmentId,
      ),

      Boolean(
        branchId,
      ),

      Boolean(
        createdDateFrom ||
        createdDateTo,
      ),

      Boolean(
        startDateFrom ||
        startDateTo,
      ),

      Boolean(
        endDateFrom ||
        endDateTo,
      ),
    ].filter(
      Boolean,
    ).length;


  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setOwnerId('');
    setDepartmentId('');
    setBranchId('');
    setCreatedDateFrom('');
    setCreatedDateTo('');
    setStartDateFrom('');
    setStartDateTo('');
    setEndDateFrom('');
    setEndDateTo('');
  }


  /*
   * ==========================================================
   * SCOPE
   * ==========================================================
   */

  function switchScope(
    next: Scope,
  ) {
    if (
      next ===
      scope
    ) {
      return;
    }


    setScope(
      next,
    );

    setPage(
      1,
    );


    /*
     * Archived owns the status itself.
     */
    if (
      next ===
      'archived'
    ) {
      setStatusFilter('');
    }
  }


  /*
   * ==========================================================
   * CREATE
   * ==========================================================
   */

  async function handleCreate(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    setCreateError('');


    const name =
      createForm.name.trim();


    if (!name) {
      setCreateError(
        isArabic
          ? 'اسم المشروع مطلوب.'
          : 'Project name is required.',
      );

      return;
    }


    if (
      createForm.startDate &&
      createForm.endDate &&
      createForm.endDate <
        createForm.startDate
    ) {
      setCreateError(
        isArabic
          ? 'لا يمكن أن يكون تاريخ الانتهاء قبل تاريخ البدء.'
          : 'End date cannot be before the start date.',
      );

      return;
    }


    setCreateBusy(
      true,
    );


    try {
      await ProjectsApi.create({
        name,

        description:
          createForm.description.trim() ||
          undefined,

        startDate:
          createForm.startDate ||
          undefined,

        endDate:
          createForm.endDate ||
          undefined,
      });


      setCreateForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
      });


      setShowCreate(
        false,
      );


      await load();
    } catch (
      err
    ) {
      setCreateError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر إنشاء المشروع.'
            : 'Could not create the project.',
      );
    } finally {
      setCreateBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  function startEdit(
    project: Project,
  ) {
    setEditingProject(
      project,
    );


    setEditForm({
      name:
        project.name,

      description:
        project.description ||
        '',

      startDate:
        project.startDate ||
        '',

      endDate:
        project.endDate ||
        '',
    });


    setEditError('');
    setRowError(
      null,
    );
  }


  async function handleUpdate(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    if (
      !editingProject
    ) {
      return;
    }


    setEditError('');


    const name =
      editForm.name.trim();


    if (!name) {
      setEditError(
        isArabic
          ? 'اسم المشروع مطلوب.'
          : 'Project name is required.',
      );

      return;
    }


    if (
      editForm.startDate &&
      editForm.endDate &&
      editForm.endDate <
        editForm.startDate
    ) {
      setEditError(
        isArabic
          ? 'لا يمكن أن يكون تاريخ الانتهاء قبل تاريخ البدء.'
          : 'End date cannot be before the start date.',
      );

      return;
    }


    setEditBusy(
      true,
    );


    try {
      const updated =
        await ProjectsApi.update(
          editingProject.id,
          {
            name,

            description:
              editForm.description.trim(),

            /*
             * Send date only when present.
             *
             * This remains compatible with your current ProjectsApi type.
             */
            ...(editForm.startDate
              ? {
                  startDate:
                    editForm.startDate,
                }
              : {}),

            ...(editForm.endDate
              ? {
                  endDate:
                    editForm.endDate,
                }
              : {}),
          },
        );


      setProjects(
        (
          current,
        ) =>
          current.map(
            (
              project,
            ) =>
              project.id ===
              editingProject.id
                ? {
                    ...project,
                    ...updated,
                  }
                : project,
          ),
      );


      setEditingProject(
        null,
      );
    } catch (
      err
    ) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر تحديث المشروع.'
            : 'Could not update the project.',
      );
    } finally {
      setEditBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async function handleDelete() {
    if (
      !deleteProject
    ) {
      return;
    }


    const id =
      deleteProject.id;


    setBusyId(
      id,
    );

    setRowError(
      null,
    );


    try {
      await ProjectsApi.remove(
        id,
      );


      setDeleteProject(
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
            : isArabic
              ? 'تعذر حذف المشروع.'
              : 'Could not delete this project.',
      });


      setDeleteProject(
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
   * ARCHIVE
   * ==========================================================
   */

  async function handleArchive(
    id: string,
  ) {
    setBusyId(
      id,
    );

    setRowError(
      null,
    );


    try {
      await ProjectsApi.archive(
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
            : isArabic
              ? 'تعذر أرشفة المشروع.'
              : 'Could not archive this project.',
      });
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

  async function handleUnarchive(
    id: string,
  ) {
    setBusyId(
      id,
    );

    setRowError(
      null,
    );


    try {
      await ProjectsApi.unarchive(
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
            : isArabic
              ? 'تعذر استعادة المشروع.'
              : 'Could not restore this project.',
      });
    } finally {
      setBusyId(
        null,
      );
    }
  }


  /*
   * ==========================================================
   * PERMISSIONS
   * ==========================================================
   */

  function canManage(
    project: Project,
  ) {
    return (
      isAdmin ||
      project.createdById ===
        user?.id
    );
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
   * SHARED PROJECT CONTENT
   * ==========================================================
   */

  function projectMetadata(
    project: Project,
  ) {
    const overdue =
      projectIsOverdue(
        project,
      );


    const dueSoon =
      projectIsDueSoon(
        project,
      );


    return {
      overdue,
      dueSoon,
    };
  }


  /*
   * ==========================================================
   * PROJECT ACTIONS
   * ==========================================================
   */

  function ProjectActions({
    project,
  }: {
    project: Project;
  }) {
    const manageable =
      canManage(
        project,
      );


    return (
      <div className="relative z-20 flex flex-wrap items-center gap-2">
        {manageable &&
          project.status !==
            'Archived' && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={(
                event,
              ) => {
                event.preventDefault();
                event.stopPropagation();

                startEdit(
                  project,
                );
              }}
            >
              {isArabic
                ? 'تعديل'
                : 'Edit'}
            </button>
          )}


        {isAdmin &&
          project.status !==
            'Archived' && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={
                busyId ===
                project.id
              }
              onClick={(
                event,
              ) => {
                event.preventDefault();
                event.stopPropagation();

                handleArchive(
                  project.id,
                );
              }}
            >
              {busyId ===
              project.id
                ? isArabic
                  ? 'جاري الأرشفة…'
                  : 'Archiving…'
                : isArabic
                  ? 'أرشفة'
                  : 'Archive'}
            </button>
          )}


        {isAdmin &&
          project.status ===
            'Archived' && (
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              disabled={
                busyId ===
                project.id
              }
              onClick={(
                event,
              ) => {
                event.preventDefault();
                event.stopPropagation();

                handleUnarchive(
                  project.id,
                );
              }}
            >
              {busyId ===
              project.id
                ? isArabic
                  ? 'جاري الاستعادة…'
                  : 'Restoring…'
                : isArabic
                  ? 'استعادة'
                  : 'Restore'}
            </button>
          )}


        {manageable && (
          <button
            type="button"
            className="btn-danger px-3 py-1.5 text-xs"
            onClick={(
              event,
            ) => {
              event.preventDefault();
              event.stopPropagation();

              setDeleteProject(
                project,
              );
            }}
          >
            {isArabic
              ? 'حذف'
              : 'Delete'}
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
      className="mx-auto max-w-[1500px] pb-12"
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
        <div className="pointer-events-none absolute -right-28 -top-28 h-64 w-64 rounded-full bg-brand-50 blur-3xl" />


        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
              {isArabic
                ? 'مساحة العمل'
                : 'Workspace'}
            </div>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
              {isArabic
                ? 'المشاريع'
                : 'Projects'}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {scope ===
              'archived'
                ? isArabic
                  ? 'المشاريع المؤرشفة.'
                  : 'Projects that have been archived.'
                : isAdmin &&
                    scope ===
                      'all'
                  ? isArabic
                    ? 'تابع جميع مشاريع المؤسسة وحالتها ومواعيدها.'
                    : 'Manage projects across the organization and track their status and schedule.'
                  : isArabic
                    ? 'تابع المشاريع التي أنشأتها.'
                    : 'Manage and track the projects you created.'}
            </p>
          </div>


          <div className="flex flex-wrap items-center gap-2">
            <ViewToggle
              value={
                viewMode
              }
              onChange={
                changeView
              }
              isArabic={
                isArabic
              }
            />


            {scope !==
              'archived' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setCreateError('');

                  setShowCreate(
                    true,
                  );
                }}
              >
                +{' '}
                {isArabic
                  ? 'مشروع جديد'
                  : 'New project'}
              </button>
            )}
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * SCOPE TABS
       * ======================================================
       */}

      <div className="mt-5 flex overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
        {isAdmin && (
          <button
            type="button"
            onClick={() =>
              switchScope(
                'all',
              )
            }
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
              scope ===
              'all'
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {isArabic
              ? 'كل المشاريع'
              : 'All projects'}
          </button>
        )}


        <button
          type="button"
          onClick={() =>
            switchScope(
              'mine',
            )
          }
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            scope ===
            'mine'
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {isArabic
            ? 'مشاريعي'
            : 'My projects'}
        </button>


        <button
          type="button"
          onClick={() =>
            switchScope(
              'archived',
            )
          }
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition ${
            scope ===
            'archived'
              ? 'bg-brand-50 text-brand-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          }`}
        >
          {isArabic
            ? 'المؤرشفة'
            : 'Archived'}
        </button>
      </div>


      {/*
       * ======================================================
       * FILTER BAR
       * ======================================================
       */}

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
                isArabic
                  ? 'ابحث بالاسم أو الوصف أو المالك…'
                  : 'Search name, description or owner…'
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

          {scope !==
            'archived' && (
            <select
              className="input lg:w-[190px]"
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value="">
                {isArabic
                  ? 'كل الحالات'
                  : 'All statuses'}
              </option>


              {visibleProjectStatuses
                .filter(
                  (
                    status,
                  ) =>
                    status.key !==
                    'Archived',
                )
                .map(
                  (
                    status,
                  ) => (
                    <option
                      key={
                        status.id
                      }
                      value={
                        status.key
                      }
                    >
                      {isArabic
                        ? status.codeAr
                        : status.codeEn}
                    </option>
                  ),
                )}
            </select>
          )}


          {/*
           * SORT
           */}

          <select
            className="input lg:w-[180px]"
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
            <option value="name">
              {isArabic
                ? 'الاسم'
                : 'Name'}
            </option>

            <option value="createdAt">
              {isArabic
                ? 'تاريخ الإنشاء'
                : 'Created date'}
            </option>

            <option value="startDate">
              {isArabic
                ? 'تاريخ البدء'
                : 'Start date'}
            </option>

            <option value="endDate">
              {isArabic
                ? 'تاريخ الانتهاء'
                : 'End date'}
            </option>

            <option value="status">
              {isArabic
                ? 'الحالة'
                : 'Status'}
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
                ? isArabic
                  ? 'تصاعدي'
                  : 'Ascending'
                : isArabic
                  ? 'تنازلي'
                  : 'Descending'}
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

            {isArabic
              ? 'عوامل التصفية'
              : 'Filters'}

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
         * ADVANCED FILTERS
         */}

        {showFilters && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {isAdmin &&
                scope !==
                  'mine' && (
                  <>
                    <div>
                      <label className="label">
                        {isArabic
                          ? 'المالك'
                          : 'Owner'}
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
                          {isArabic
                            ? 'كل المالكين'
                            : 'All owners'}
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
                        {isArabic
                          ? 'القسم'
                          : 'Department'}
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
                          {isArabic
                            ? 'كل الأقسام'
                            : 'All departments'}
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
                        {isArabic
                          ? 'الفرع'
                          : 'Branch'}
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
                          {isArabic
                            ? 'كل الفروع'
                            : 'All branches'}
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
                  </>
                )}


              <div>
                <label className="label">
                  {isArabic
                    ? 'تم الإنشاء من'
                    : 'Created from'}
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
                  {isArabic
                    ? 'تم الإنشاء إلى'
                    : 'Created to'}
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
                  {isArabic
                    ? 'تاريخ البدء من'
                    : 'Start date from'}
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
                  {isArabic
                    ? 'تاريخ البدء إلى'
                    : 'Start date to'}
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
                  {isArabic
                    ? 'تاريخ الانتهاء من'
                    : 'End date from'}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    endDateFrom
                  }
                  max={
                    endDateTo ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setEndDateFrom(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {isArabic
                    ? 'تاريخ الانتهاء إلى'
                    : 'End date to'}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    endDateTo
                  }
                  min={
                    endDateFrom ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setEndDateTo(
                      event.target.value,
                    )
                  }
                />
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
       * RESULT BAR
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
            ? 'مشروع'
            : total ===
                1
              ? 'project'
              : 'projects'}
        </div>


        {hasFilters && (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:text-brand-800"
            onClick={
              clearFilters
            }
          >
            {isArabic
              ? 'إعادة تعيين التصفية'
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
        viewMode ===
        'cards' ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              1,
              2,
              3,
              4,
              5,
              6,
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-64 animate-pulse rounded-2xl bg-slate-100"
                />
              ),
            )}
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {[
              1,
              2,
              3,
              4,
              5,
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item
                  }
                  className="h-24 animate-pulse rounded-xl bg-slate-100"
                />
              ),
            )}
          </div>
        )
      ) : projects.length ===
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
          {projects.map(
            (
              project,
            ) => {
              const {
                overdue,
                dueSoon,
              } =
                projectMetadata(
                  project,
                );


              return (
                <article
                  key={
                    project.id
                  }
                  className="group relative flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg"
                >
                  {/*
                   * Makes the card itself clickable.
                   */}
                  <Link
                    href={`/projects/${project.id}`}
                    className="absolute inset-0 z-10"
                    aria-label={
                      project.name
                    }
                  />


                  <div className="p-5">
                    <div className="relative z-0 flex items-start justify-between gap-4">
                      <StatusBadge
                        value={
                          project.status
                        }
                        listType="project_status"
                      />


                      {overdue && (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">
                          {isArabic
                            ? 'متأخر'
                            : 'Past end date'}
                        </span>
                      )}


                      {!overdue &&
                        dueSoon && (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                            {isArabic
                              ? 'ينتهي قريباً'
                              : 'Ending soon'}
                          </span>
                        )}
                    </div>


                    <h2 className="mt-4 line-clamp-2 text-lg font-semibold tracking-tight text-slate-900 transition group-hover:text-brand-700">
                      {
                        project.name
                      }
                    </h2>


                    <p className="mt-2 line-clamp-2 min-h-[40px] text-sm leading-5 text-slate-500">
                      {project.description ||
                        (
                          isArabic
                            ? 'لا يوجد وصف.'
                            : 'No description.'
                        )}
                    </p>


                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {isArabic
                            ? 'تاريخ البدء'
                            : 'Start'}
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-700">
                          {formatDate(
                            project.startDate,
                            locale,
                          )}
                        </div>
                      </div>


                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {isArabic
                            ? 'تاريخ الانتهاء'
                            : 'End'}
                        </div>

                        <div
                          className={`mt-1 text-xs font-medium ${
                            overdue
                              ? 'text-red-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {formatDate(
                            project.endDate,
                            locale,
                          )}
                        </div>
                      </div>
                    </div>


                    {isAdmin && (
                      <div className="mt-4 border-t border-slate-100 pt-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[10px] font-semibold text-brand-700">
                            {project.ownerName
                              ?.charAt(
                                0,
                              )
                              .toUpperCase() ||
                              '?'}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-xs font-medium text-slate-700">
                              {project.ownerName ||
                                '—'}
                            </div>

                            <div className="truncate text-[10px] text-slate-400">
                              {project.ownerDepartmentName ||
                                (
                                  isArabic
                                    ? 'بدون قسم'
                                    : 'No department'
                                )}

                              {' · '}

                              {project.ownerBranchName ||
                                (
                                  isArabic
                                    ? 'بدون فرع'
                                    : 'No branch'
                                )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>


                  <div className="relative z-20 mt-auto border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-400">
                        {isArabic
                          ? 'تم الإنشاء'
                          : 'Created'}{' '}

                        {new Date(
                          project.createdAt,
                        ).toLocaleDateString(
                          locale,
                        )}
                      </div>


                      <ProjectActions
                        project={
                          project
                        }
                      />
                    </div>


                    {rowError?.id ===
                      project.id && (
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
          <div className="hidden grid-cols-[minmax(240px,1fr)_150px_180px_190px_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 lg:grid">
            <div>
              {isArabic
                ? 'المشروع'
                : 'Project'}
            </div>

            <div>
              {isArabic
                ? 'الحالة'
                : 'Status'}
            </div>

            <div>
              {isArabic
                ? 'الجدول'
                : 'Schedule'}
            </div>

            <div>
              {isArabic
                ? 'المالك'
                : 'Owner'}
            </div>

            <div />
          </div>


          <div className="divide-y divide-slate-100">
            {projects.map(
              (
                project,
              ) => {
                const {
                  overdue,
                  dueSoon,
                } =
                  projectMetadata(
                    project,
                  );


                return (
                  <article
                    key={
                      project.id
                    }
                    className="group relative px-5 py-4 transition hover:bg-slate-50/70"
                  >
                    <Link
                      href={`/projects/${project.id}`}
                      className="absolute inset-0 z-10"
                      aria-label={
                        project.name
                      }
                    />


                    <div className="relative z-0 grid gap-4 lg:grid-cols-[minmax(240px,1fr)_150px_180px_190px_auto] lg:items-center">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="truncate text-sm font-semibold text-slate-800 transition group-hover:text-brand-700">
                            {
                              project.name
                            }
                          </h2>


                          {overdue && (
                            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">
                              {isArabic
                                ? 'متأخر'
                                : 'Overdue'}
                            </span>
                          )}


                          {!overdue &&
                            dueSoon && (
                              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
                                {isArabic
                                  ? 'قريب'
                                  : 'Soon'}
                              </span>
                            )}
                        </div>


                        <p className="mt-1 truncate text-xs text-slate-400">
                          {project.description ||
                            (
                              isArabic
                                ? 'لا يوجد وصف'
                                : 'No description'
                            )}
                        </p>
                      </div>


                      <div>
                        <StatusBadge
                          value={
                            project.status
                          }
                          listType="project_status"
                        />
                      </div>


                      <div className="text-xs text-slate-500">
                        <div>
                          {formatDate(
                            project.startDate,
                            locale,
                          )}
                        </div>

                        <div
                          className={`mt-1 ${
                            overdue
                              ? 'font-medium text-red-600'
                              : 'text-slate-400'
                          }`}
                        >
                          →{' '}

                          {formatDate(
                            project.endDate,
                            locale,
                          )}
                        </div>
                      </div>


                      <div className="min-w-0">
                        {isAdmin ? (
                          <>
                            <div className="truncate text-xs font-medium text-slate-700">
                              {project.ownerName ||
                                '—'}
                            </div>

                            <div className="mt-1 truncate text-[10px] text-slate-400">
                              {project.ownerDepartmentName ||
                                '—'}

                              {' · '}

                              {project.ownerBranchName ||
                                '—'}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400">
                            {isArabic
                              ? 'تم الإنشاء'
                              : 'Created'}{' '}

                            {new Date(
                              project.createdAt,
                            ).toLocaleDateString(
                              locale,
                            )}
                          </div>
                        )}
                      </div>


                      <div className="relative z-20 flex justify-start lg:justify-end">
                        <ProjectActions
                          project={
                            project
                          }
                        />
                      </div>
                    </div>


                    {rowError?.id ===
                      project.id && (
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

      {!loading && (
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
            isArabic
              ? 'مشاريع'
              : 'projects'
          }
        />
      )}


      {/*
       * ======================================================
       * CREATE MODAL
       * ======================================================
       */}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget &&
              !createBusy
            ) {
              setShowCreate(
                false,
              );
            }
          }}
        >
          <form
            onSubmit={
              handleCreate
            }
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <SectionHeader
                title={
                  isArabic
                    ? 'مشروع جديد'
                    : 'New project'
                }
                description={
                  isArabic
                    ? 'أدخل معلومات المشروع وجدوله الزمني.'
                    : 'Add the project details and planned schedule.'
                }
              />
            </div>


            <div className="space-y-5 p-6">
              <div>
                <label className="label">
                  {isArabic
                    ? 'اسم المشروع'
                    : 'Project name'}
                </label>

                <input
                  autoFocus
                  required
                  maxLength={
                    200
                  }
                  className="input"
                  value={
                    createForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setCreateForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        name:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {isArabic
                    ? 'الوصف'
                    : 'Description'}
                </label>

                <textarea
                  rows={
                    4
                  }
                  className="input"
                  value={
                    createForm.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setCreateForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        description:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {isArabic
                      ? 'تاريخ البدء'
                      : 'Start date'}
                  </label>

                  <input
                    type="date"
                    className="input"
                    value={
                      createForm.startDate
                    }
                    max={
                      createForm.endDate ||
                      undefined
                    }
                    onChange={(
                      event,
                    ) =>
                      setCreateForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          startDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>


                <div>
                  <label className="label">
                    {isArabic
                      ? 'تاريخ الانتهاء'
                      : 'End date'}
                  </label>

                  <input
                    type="date"
                    className="input"
                    min={
                      createForm.startDate ||
                      undefined
                    }
                    value={
                      createForm.endDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setCreateForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          endDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>


              {createError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {
                    createError
                  }
                </div>
              )}
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  createBusy
                }
                onClick={() =>
                  setShowCreate(
                    false,
                  )
                }
              >
                {isArabic
                  ? 'إلغاء'
                  : 'Cancel'}
              </button>


              <button
                type="submit"
                className="btn-primary"
                disabled={
                  createBusy
                }
              >
                {createBusy
                  ? isArabic
                    ? 'جاري الإنشاء…'
                    : 'Creating…'
                  : isArabic
                    ? 'إنشاء المشروع'
                    : 'Create project'}
              </button>
            </div>
          </form>
        </div>
      )}


      {/*
       * ======================================================
       * EDIT MODAL
       * ======================================================
       */}

      {editingProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget &&
              !editBusy
            ) {
              setEditingProject(
                null,
              );
            }
          }}
        >
          <form
            onSubmit={
              handleUpdate
            }
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <SectionHeader
                title={
                  isArabic
                    ? 'تعديل المشروع'
                    : 'Edit project'
                }
                description={
                  editingProject.name
                }
              />
            </div>


            <div className="space-y-5 p-6">
              <div>
                <label className="label">
                  {isArabic
                    ? 'اسم المشروع'
                    : 'Project name'}
                </label>

                <input
                  required
                  maxLength={
                    200
                  }
                  className="input"
                  value={
                    editForm.name
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        name:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {isArabic
                    ? 'الوصف'
                    : 'Description'}
                </label>

                <textarea
                  rows={
                    4
                  }
                  className="input"
                  value={
                    editForm.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        description:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {isArabic
                      ? 'تاريخ البدء'
                      : 'Start date'}
                  </label>

                  <input
                    type="date"
                    className="input"
                    value={
                      editForm.startDate
                    }
                    max={
                      editForm.endDate ||
                      undefined
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          startDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>


                <div>
                  <label className="label">
                    {isArabic
                      ? 'تاريخ الانتهاء'
                      : 'End date'}
                  </label>

                  <input
                    type="date"
                    className="input"
                    min={
                      editForm.startDate ||
                      undefined
                    }
                    value={
                      editForm.endDate
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          endDate:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>


              {editError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {
                    editError
                  }
                </div>
              )}
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  editBusy
                }
                onClick={() =>
                  setEditingProject(
                    null,
                  )
                }
              >
                {isArabic
                  ? 'إلغاء'
                  : 'Cancel'}
              </button>


              <button
                type="submit"
                className="btn-primary"
                disabled={
                  editBusy
                }
              >
                {editBusy
                  ? isArabic
                    ? 'جاري الحفظ…'
                    : 'Saving…'
                  : isArabic
                    ? 'حفظ التغييرات'
                    : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}


      {/*
       * ======================================================
       * DELETE CONFIRMATION
       * ======================================================
       */}

      {deleteProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget &&
              busyId !==
                deleteProject.id
            ) {
              setDeleteProject(
                null,
              );
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    d="M8 8v9m4-9v9m4-9v9M5 5h14M9 5V3h6v2m3 0-1 16H7L6 5"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>


              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {isArabic
                  ? 'حذف المشروع؟'
                  : 'Delete project?'}
              </h2>


              <p className="mt-2 text-sm leading-6 text-slate-500">
                {isArabic
                  ? `سيتم حذف "${deleteProject.name}" نهائياً إذا لم يكن مرتبطاً بأي مهام.`
                  : `"${deleteProject.name}" will be permanently deleted if it has no tasks attached.`}
              </p>


              <p className="mt-2 text-xs text-slate-400">
                {isArabic
                  ? 'إذا كان المشروع يحتوي على مهام، استخدم الأرشفة بدلاً من الحذف.'
                  : 'Projects with tasks should be archived instead of permanently deleted.'}
              </p>
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  busyId ===
                  deleteProject.id
                }
                onClick={() =>
                  setDeleteProject(
                    null,
                  )
                }
              >
                {isArabic
                  ? 'إلغاء'
                  : 'Cancel'}
              </button>


              <button
                type="button"
                className="btn-danger"
                disabled={
                  busyId ===
                  deleteProject.id
                }
                onClick={
                  handleDelete
                }
              >
                {busyId ===
                deleteProject.id
                  ? isArabic
                    ? 'جاري الحذف…'
                    : 'Deleting…'
                  : isArabic
                    ? 'حذف المشروع'
                    : 'Delete project'}
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

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}