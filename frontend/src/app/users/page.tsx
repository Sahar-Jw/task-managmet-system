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
  useLocale,
} from 'next-intl';

import Pagination from '@/components/Pagination';
import ProtectedRoute from '@/components/ProtectedRoute';
import Avatar from '@/components/Avatar';
import { DeleteIcon, EditIcon, UserCheckIcon, UserXIcon } from '@/components/ActionIcons';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  BranchesApi,
  DepartmentsApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Branch,
  Department,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE =
  12;


type ViewMode =
  | 'cards'
  | 'list';


type SortBy =
  | 'fullName'
  | 'email'
  | 'createdAt'
  | 'role'
  | 'isActive';


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
    value,
  ).toLocaleDateString(
    locale,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    },
  );
}


/*
 * ============================================================
 * VIEW TOGGLE
 * ============================================================
 */

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
    <div className="flex max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1">
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
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <circle
            cx="9"
            cy="8"
            r="3"
            strokeWidth="1.8"
          />

          <path
            d="M3.5 19c.5-3.3 2.3-5 5.5-5s5 1.7 5.5 5"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <circle
            cx="17"
            cy="9"
            r="2"
            strokeWidth="1.6"
          />

          <path
            d="M15.5 14.5c2.8-.4 4.5 1 5 3.5"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>


      <h3 className="mt-4 text-sm font-semibold text-slate-800">
        {uiText(isArabic, 'text0587')}
      </h3>


      <p className="mt-1 max-w-sm text-sm leading-6 text-slate-400">
        {uiText(isArabic, 'text0588')}
      </p>
    </div>
  );
}


/*
 * ============================================================
 * USERS
 * ============================================================
 */

function UsersContent() {
  const {
    user: currentUser,
  } = useAuth();


  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


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
   * USERS
   * ==========================================================
   */

  const [
    users,
    setUsers,
  ] = useState<User[]>(
    [],
  );


  const [
    total,
    setTotal,
  ] = useState(
    0,
  );


  const [
    page,
    setPage,
  ] = useState(
    1,
  );


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


  /*
   * ==========================================================
   * LOOKUPS
   * ==========================================================
   */

  const [
    roles,
    setRoles,
  ] = useState<
    {
      id: string;
      name: string;
    }[]
  >([]);


  const [
    branches,
    setBranches,
  ] = useState<
    Branch[]
  >([]);


  const [
    departments,
    setDepartments,
  ] = useState<
    Department[]
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
    roleId,
    setRoleId,
  ] = useState('');


  const [
    isActive,
    setIsActive,
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
    joinDateFrom,
    setJoinDateFrom,
  ] = useState('');


  const [
    joinDateTo,
    setJoinDateTo,
  ] = useState('');


  /*
   * ==========================================================
   * SORTING
   * ==========================================================
   */

  const [
    sortBy,
    setSortBy,
  ] = useState<SortBy>(
    'fullName',
  );


  const [
    sortDir,
    setSortDir,
  ] = useState<SortDir>(
    'asc',
  );


  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  const [
    editingUser,
    setEditingUser,
  ] = useState<User | null>(
    null,
  );


  const [
    editForm,
    setEditForm,
  ] = useState({
    fullName: '',
    email: '',
    roleId: '',
    branchId: '',
    departmentId: '',
  });


  const [
    editError,
    setEditError,
  ] = useState('');


  const [
    editBusy,
    setEditBusy,
  ] = useState(false);


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
    actionError,
    setActionError,
  ] = useState<{
    id: string;
    message: string;
  } | null>(
    null,
  );


  const [
    pendingDeactivate,
    setPendingDeactivate,
  ] = useState<User | null>(
    null,
  );


  const [
    pendingDelete,
    setPendingDelete,
  ] = useState<User | null>(
    null,
  );


  const [
    deleteError,
    setDeleteError,
  ] = useState('');


  /*
   * ==========================================================
   * VIEW PREFERENCE
   * ==========================================================
   */

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        'users-view-mode',
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
    value: ViewMode,
  ) {
    setViewMode(
      value,
    );


    window.localStorage.setItem(
      'users-view-mode',
      value,
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
   * LOOKUPS
   * ==========================================================
   */

  useEffect(() => {
    UsersApi.roles()
      .then(
        setRoles,
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


    DepartmentsApi.list()
      .then(
        setDepartments,
      )
      .catch(
        () => {},
      );
  }, []);


  /*
   * ==========================================================
   * LANGUAGE LOGIC
   * ==========================================================
   */

  function directoryLabel(
    item:
      | Branch
      | Department
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


  const branchMap =
    useMemo(
      () =>
        new Map(
          branches.map(
            (
              branch,
            ) => [
              branch.id,
              branch,
            ],
          ),
        ),
      [
        branches,
      ],
    );


  const departmentMap =
    useMemo(
      () =>
        new Map(
          departments.map(
            (
              department,
            ) => [
              department.id,
              department,
            ],
          ),
        ),
      [
        departments,
      ],
    );


  /*
   * ==========================================================
   * LOAD USERS
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
            page:
              String(
                page,
              ),

            limit:
              String(
                PAGE_SIZE,
              ),

            sortBy,

            sortDir,
          };


          if (
            debouncedSearch
          ) {
            params.search =
              debouncedSearch;
          }


          if (
            roleId
          ) {
            params.roleId =
              roleId;
          }


          if (
            isActive
          ) {
            params.isActive =
              isActive;
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
            joinDateFrom
          ) {
            params.joinDateFrom =
              joinDateFrom;
          }


          if (
            joinDateTo
          ) {
            params.joinDateTo =
              joinDateTo;
          }


          const response =
            await UsersApi.list(
              params,
            );


          setUsers(
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
              : uiText(isArabic, 'text0589'),
          );
        } finally {
          setLoading(
            false,
          );
        }
      },
      [
        page,
        debouncedSearch,
        roleId,
        isActive,
        departmentId,
        branchId,
        joinDateFrom,
        joinDateTo,
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
   * Reset pagination whenever filters change.
   */

  useEffect(() => {
    setPage(
      1,
    );
  }, [
    debouncedSearch,
    roleId,
    isActive,
    departmentId,
    branchId,
    joinDateFrom,
    joinDateTo,
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
      roleId ||
      isActive ||
      departmentId ||
      branchId ||
      joinDateFrom ||
      joinDateTo,
    );


  const filterCount =
    [
      Boolean(
        search,
      ),

      Boolean(
        roleId,
      ),

      Boolean(
        isActive,
      ),

      Boolean(
        departmentId,
      ),

      Boolean(
        branchId,
      ),

      Boolean(
        joinDateFrom ||
        joinDateTo,
      ),
    ].filter(
      Boolean,
    ).length;


  function clearFilters() {
    setSearch('');
    setRoleId('');
    setIsActive('');
    setDepartmentId('');
    setBranchId('');
    setJoinDateFrom('');
    setJoinDateTo('');
  }


  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  const editRoleIsAdmin =
    roles.find(
      (
        role,
      ) =>
        role.id ===
        editForm.roleId,
    )?.name ===
    'ADMIN';


  function openEdit(
    user: User,
  ) {
    setEditingUser(
      user,
    );


    setEditError('');


    setEditForm({
      fullName:
        user.fullName,

      email:
        user.email,

      roleId:
        user.roleId ||
        user.role?.id ||
        '',

      branchId:
        user.branchId ||
        '',

      departmentId:
        user.departmentId ||
        '',
    });
  }


  function closeEdit() {
    if (
      editBusy
    ) {
      return;
    }


    setEditingUser(
      null,
    );

    setEditError('');
  }


  function handleEditRoleChange(
    nextRoleId: string,
  ) {
    const isAdmin =
      roles.find(
        (
          role,
        ) =>
          role.id ===
          nextRoleId,
      )?.name ===
      'ADMIN';


    setEditForm(
      (
        current,
      ) => ({
        ...current,

        roleId:
          nextRoleId,

        departmentId:
          isAdmin
            ? ''
            : current.departmentId,
      }),
    );
  }


  async function handleEditSave(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    if (
      !editingUser
    ) {
      return;
    }


    setEditError('');


    if (
      !editForm.fullName.trim()
    ) {
      setEditError(
        uiText(isArabic, 'text0590'),
      );

      return;
    }


    if (
      !editForm.email.trim()
    ) {
      setEditError(
        uiText(isArabic, 'text0591'),
      );

      return;
    }


    if (
      !editForm.roleId
    ) {
      setEditError(
        uiText(isArabic, 'text0592'),
      );

      return;
    }


    if (
      !editForm.branchId
    ) {
      setEditError(
        uiText(isArabic, 'text0593'),
      );

      return;
    }


    if (
      !editRoleIsAdmin &&
      !editForm.departmentId
    ) {
      setEditError(
        uiText(isArabic, 'text0594'),
      );

      return;
    }


    setEditBusy(
      true,
    );


    try {
      const updatedUser =
        await UsersApi.adminUpdate(
        editingUser.id,
        {
          fullName:
            editForm.fullName.trim(),

          email:
            editForm.email.trim(),

          roleId:
            editForm.roleId,

          branchId:
            editForm.branchId,

          departmentId:
            editRoleIsAdmin
              ? null
              : editForm.departmentId,
        },
      );


      /* Show the saved values immediately, even before the list refresh. */
      setUsers(
        (
          current,
        ) =>
          current.map(
            (
              listedUser,
            ) =>
              listedUser.id ===
              updatedUser.id
                ? updatedUser
                : listedUser,
          ),
      );


      setEditingUser(
        null,
      );


      await load();
    } catch (
      err
    ) {
      setEditError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0595'),
      );
    } finally {
      setEditBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * ACTIVATE / DEACTIVATE
   * ==========================================================
   */

  async function toggleActive(
    target: User,
  ) {
    setBusyId(
      target.id,
    );


    setActionError(
      null,
    );


    try {
      if (
        target.isActive
      ) {
        await UsersApi.deactivate(
          target.id,
        );
      } else {
        await UsersApi.adminUpdate(
          target.id,
          {
            isActive:
              true,
          },
        );
      }


      setPendingDeactivate(
        null,
      );


      await load();
    } catch (
      err
    ) {
      setActionError({
        id:
          target.id,

        message:
          err instanceof ApiError
            ? err.message
            : uiText(isArabic, 'text0596'),
      });


      setPendingDeactivate(
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
   * DELETE
   * ==========================================================
   */

  async function confirmDelete() {
    if (
      !pendingDelete
    ) {
      return;
    }


    setDeleteError('');


    setBusyId(
      pendingDelete.id,
    );


    try {
      await UsersApi.remove(
        pendingDelete.id,
      );


      setPendingDelete(
        null,
      );


      await load();
    } catch (
      err
    ) {
      setDeleteError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0597'),
      );
    } finally {
      setBusyId(
        null,
      );
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
   * USER ACTIONS
   * ==========================================================
   */

  function UserActions({
    target,
  }: {
    target: User;
  }) {
    const busy =
      busyId ===
      target.id;


    const isSelf =
      currentUser?.id ===
      target.id;


    return (
      <div className="relative z-20 flex flex-wrap items-center gap-2">
        <Link
          href={`/tasks?ownerId=${target.id}`}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          {uiText(isArabic, 'text0195')}
        </Link>


        <Link
          href={`/projects?ownerId=${target.id}`}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          {uiText(isArabic, 'text0405')}
        </Link>


        <button
          type="button"
          disabled={
            busy
          }
          className="icon-btn h-8 w-8"
          title={uiText(isArabic, 'text0068')}
          aria-label={uiText(isArabic, 'text0068')}
          onClick={() =>
            openEdit(
              target,
            )
          }
        >
          <EditIcon />
        </button>


        {!isSelf && (
          <button
            type="button"
            disabled={
              busy
            }
            className="icon-btn h-8 w-8"
            title={
              busy
                ? uiText(isArabic, 'text0095')
                : target.isActive
                  ? uiText(isArabic, 'text0096')
                  : uiText(isArabic, 'text0097')
            }
            aria-label={
              target.isActive
                ? uiText(isArabic, 'text0096')
                : uiText(isArabic, 'text0097')
            }
            onClick={() => {
              if (
                target.isActive
              ) {
                setPendingDeactivate(
                  target,
                );
              } else {
                toggleActive(
                  target,
                );
              }
            }}
          >
            {target.isActive ? <UserXIcon /> : <UserCheckIcon />}
          </button>
        )}


        {!isSelf && (
          <button
            type="button"
            disabled={
              busy
            }
            className="icon-btn-danger h-8 w-8"
            title={uiText(isArabic, 'text0038')}
            aria-label={uiText(isArabic, 'text0038')}
            onClick={() => {
              setDeleteError('');

              setPendingDelete(
                target,
              );
            }}
          >
            <DeleteIcon />
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
              {uiText(isArabic, 'text0598')}
            </div>


            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-3xl">
              {uiText(isArabic, 'text0599')}
            </h1>


            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {uiText(isArabic, 'text0600')}
            </p>


            <p className="mt-2 text-xs text-slate-400">
              {uiText(isArabic, 'text0601')}
            </p>
          </div>


          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * FILTER BAR
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
                uiText(isArabic, 'text0602')
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

          <select
            className="input xl:w-[170px]"
            value={
              isActive
            }
            onChange={(
              event,
            ) =>
              setIsActive(
                event.target.value,
              )
            }
          >
            <option value="">
              {uiText(isArabic, 'text0069')}
            </option>

            <option value="true">
              {uiText(isArabic, 'text0091')}
            </option>

            <option value="false">
              {uiText(isArabic, 'text0201')}
            </option>
          </select>


          {/*
           * ROLE
           */}

          <select
            className="input xl:w-[170px]"
            value={
              roleId
            }
            onChange={(
              event,
            ) =>
              setRoleId(
                event.target.value,
              )
            }
          >
            <option value="">
              {uiText(isArabic, 'text0603')}
            </option>


            {roles.map(
              (
                role,
              ) => (
                <option
                  key={
                    role.id
                  }
                  value={
                    role.id
                  }
                >
                  {
                    role.name
                  }
                </option>
              ),
            )}
          </select>


          {/*
           * SORT
           */}

          <select
            className="input xl:w-[180px]"
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
            <option value="fullName">
              {uiText(isArabic, 'text0070')}
            </option>

            <option value="email">
              {uiText(isArabic, 'text0202')}
            </option>

            <option value="createdAt">
              {uiText(isArabic, 'text0203')}
            </option>

            <option value="role">
              {uiText(isArabic, 'text0204')}
            </option>

            <option value="isActive">
              {uiText(isArabic, 'text0052')}
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
                        {directoryLabel(
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
                        {directoryLabel(
                          branch,
                        )}
                      </option>
                    ),
                  )}
                </select>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0604')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    joinDateFrom
                  }
                  max={
                    joinDateTo ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setJoinDateFrom(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0205')}
                </label>

                <input
                  type="date"
                  className="input"
                  value={
                    joinDateTo
                  }
                  min={
                    joinDateFrom ||
                    undefined
                  }
                  onChange={(
                    event,
                  ) =>
                    setJoinDateTo(
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
                  {uiText(isArabic, 'text0275')}
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
            ? 'مستخدم'
            : total ===
                1
              ? 'user'
              : 'users'}
        </div>


        {hasFilters && (
          <button
            type="button"
            onClick={
              clearFilters
            }
            className="text-xs font-medium text-brand-600 hover:text-brand-800"
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
       * CONTENT
       * ======================================================
       */}

      {loading ? (
        <InlineLoader className="mt-4 min-h-48" />
      ) : users.length ===
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
          {users.map(
            (
              target,
            ) => {
              const branch =
                target.branchId
                  ? branchMap.get(
                      target.branchId,
                    )
                  : undefined;


              const department =
                target.departmentId
                  ? departmentMap.get(
                      target.departmentId,
                    )
                  : undefined;


              const isSelf =
                currentUser?.id ===
                target.id;


              return (
                <article
                  key={
                    target.id
                  }
                  className="flex min-h-[285px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={target.fullName}
                          avatarUrl={target.avatarUrl}
                          size="md"
                          className="shrink-0 ring-1 ring-brand-100"
                        />


                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold text-slate-900">
                              {
                                target.fullName
                              }
                            </h2>


                            {isSelf && (
                              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-semibold text-brand-700">
                                {uiText(isArabic, 'text0206')}
                              </span>
                            )}
                          </div>


                          <p className="mt-1 truncate text-xs text-slate-500">
                            {
                              target.email
                            }
                          </p>
                        </div>
                      </div>


                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          target.isActive
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {target.isActive
                          ? uiText(isArabic, 'text0091')
                          : uiText(isArabic, 'text0207')}
                      </span>
                    </div>


                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {uiText(isArabic, 'text0204')}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-slate-700">
                          {
                            target.role.name
                          }
                        </div>
                      </div>


                      <div className="rounded-xl bg-slate-50 p-3">
                        <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {uiText(isArabic, 'text0203')}
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-700">
                          {formatDate(
                            target.createdAt,
                            locale,
                          )}
                        </div>
                      </div>
                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0371')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {directoryLabel(
                            branch,
                          )}
                        </div>
                      </div>


                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0374')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {target.role.name ===
                          'ADMIN'
                            ? uiText(isArabic, 'text0208')
                            : directoryLabel(
                                department,
                              )}
                        </div>
                      </div>


                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0209')}
                        </div>

                        <div className="mt-1 truncate font-medium text-slate-600">
                          {target.phone ||
                            '—'}
                        </div>
                      </div>


                      <div>
                        <div className="text-slate-400">
                          {uiText(isArabic, 'text0210')}
                        </div>

                        <div className="mt-1 uppercase font-medium text-slate-600">
                          {target.locale ||
                            '—'}
                        </div>
                      </div>
                    </div>
                  </div>


                  <div className="mt-auto border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                    <UserActions
                      target={
                        target
                      }
                    />


                    {actionError?.id ===
                      target.id && (
                      <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                        {
                          actionError.message
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
          <div className="hidden grid-cols-[minmax(250px,1fr)_120px_170px_170px_140px_auto] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400 xl:grid">
            <div>
              {uiText(isArabic, 'text0272')}
            </div>

            <div>
              {uiText(isArabic, 'text0204')}
            </div>

            <div>
              {uiText(isArabic, 'text0374')}
            </div>

            <div>
              {uiText(isArabic, 'text0371')}
            </div>

            <div>
              {uiText(isArabic, 'text0052')}
            </div>

            <div />
          </div>


          <div className="divide-y divide-slate-100">
            {users.map(
              (
                target,
              ) => {
                const branch =
                  target.branchId
                    ? branchMap.get(
                        target.branchId,
                      )
                    : undefined;


                const department =
                  target.departmentId
                    ? departmentMap.get(
                        target.departmentId,
                      )
                    : undefined;


                const isSelf =
                  currentUser?.id ===
                  target.id;


                return (
                  <article
                    key={
                      target.id
                    }
                    className="px-5 py-4 transition hover:bg-slate-50/70"
                  >
                    <div className="grid gap-4 xl:grid-cols-[minmax(250px,1fr)_120px_170px_170px_140px_auto] xl:items-center">
                      {/*
                       * USER
                       */}

                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar
                          name={target.fullName}
                          avatarUrl={target.avatarUrl}
                          size="md"
                          className="shrink-0"
                        />


                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-semibold text-slate-800">
                              {
                                target.fullName
                              }
                            </div>


                            {isSelf && (
                              <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[9px] font-semibold text-brand-700">
                                {uiText(isArabic, 'text0206')}
                              </span>
                            )}
                          </div>


                          <div className="mt-1 truncate text-xs text-slate-400">
                            {
                              target.email
                            }

                            {target.phone
                              ? ` · ${target.phone}`
                              : ''}
                          </div>
                        </div>
                      </div>


                      {/*
                       * ROLE
                       */}

                      <div>
                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            target.role.name ===
                            'ADMIN'
                              ? 'bg-brand-50 text-brand-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {
                            target.role.name
                          }
                        </span>
                      </div>


                      {/*
                       * DEPARTMENT
                       */}

                      <div className="truncate text-xs font-medium text-slate-600">
                        {target.role.name ===
                        'ADMIN'
                          ? uiText(isArabic, 'text0208')
                          : directoryLabel(
                              department,
                            )}
                      </div>


                      {/*
                       * BRANCH
                       */}

                      <div className="truncate text-xs font-medium text-slate-600">
                        {directoryLabel(
                          branch,
                        )}
                      </div>


                      {/*
                       * STATUS
                       */}

                      <div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            target.isActive
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {target.isActive
                            ? uiText(isArabic, 'text0091')
                            : uiText(isArabic, 'text0207')}
                        </span>


                        <div className="mt-1 text-[10px] text-slate-400">
                          {formatDate(
                            target.createdAt,
                            locale,
                          )}
                        </div>
                      </div>


                      {/*
                       * ACTIONS
                       */}

                      <div className="flex justify-start xl:justify-end">
                        <UserActions
                          target={
                            target
                          }
                        />
                      </div>
                    </div>


                    {actionError?.id ===
                      target.id && (
                      <div className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-600">
                        {
                          actionError.message
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
              uiText(isArabic, 'text0605')
            }
          />
        )}


      {/*
       * ======================================================
       * EDIT MODAL
       * ======================================================
       */}

      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEdit();
            }
          }}
        >
          <form
            onSubmit={
              handleEditSave
            }
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[.14em] text-brand-600">
                    {uiText(isArabic, 'text0606')}
                  </div>


                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    {uiText(isArabic, 'text0607')}
                  </h2>


                  <p className="mt-1 text-sm text-slate-500">
                    {
                      editingUser.fullName
                    }
                  </p>
                </div>


                <button
                  type="button"
                  disabled={
                    editBusy
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  onClick={
                    closeEdit
                  }
                >
                  ✕
                </button>
              </div>
            </div>


            <div className="space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0060')}
                  </label>

                  <input
                    required
                    maxLength={
                      150
                    }
                    className="input"
                    value={
                      editForm.fullName
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          fullName:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>


                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0064')}
                  </label>

                  <input
                    required
                    type="email"
                    className="input"
                    value={
                      editForm.email
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          email:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              </div>


              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0204')}
                  </label>

                  <select
                    required
                    className="input"
                    value={
                      editForm.roleId
                    }
                    onChange={(
                      event,
                    ) =>
                      handleEditRoleChange(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0187')}
                    </option>


                    {roles.map(
                      (
                        role,
                      ) => (
                        <option
                          key={
                            role.id
                          }
                          value={
                            role.id
                          }
                        >
                          {
                            role.name
                          }
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
                    required
                    className="input"
                    value={
                      editForm.branchId
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          branchId:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0187')}
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
                          {directoryLabel(
                            branch,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>


                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0374')}
                  </label>


                  {editRoleIsAdmin ? (
                    <div className="input flex items-center bg-slate-50 text-sm text-slate-400">
                      {uiText(isArabic, 'text0608')}
                    </div>
                  ) : (
                    <select
                      required
                      className="input"
                      value={
                        editForm.departmentId
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditForm(
                          (
                            current,
                          ) => ({
                            ...current,

                            departmentId:
                              event.target.value,
                          }),
                        )
                      }
                    >
                      <option value="">
                        {uiText(isArabic, 'text0187')}
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
                            {directoryLabel(
                              department,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  )}
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
                onClick={
                  closeEdit
                }
              >
                {uiText(isArabic, 'text0080')}
              </button>


              <button
                type="submit"
                className="btn-primary"
                disabled={
                  editBusy
                }
              >
                {editBusy
                  ? uiText(isArabic, 'text0081')
                  : uiText(isArabic, 'text0082')}
              </button>
            </div>
          </form>
        </div>
      )}


      {/*
       * ======================================================
       * DEACTIVATE CONFIRMATION
       * ======================================================
       */}

      {pendingDeactivate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              busyId !==
                pendingDeactivate.id
            ) {
              setPendingDeactivate(
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
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                    strokeWidth="1.8"
                  />

                  <path
                    d="M8 12h8"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>


              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {uiText(isArabic, 'text0211')}
              </h2>


              <p className="mt-2 text-sm leading-6 text-slate-500">
                {uiText(isArabic, 'text0746', { value0: pendingDeactivate.fullName })}
              </p>


              <p className="mt-2 text-xs text-slate-400">
                {uiText(isArabic, 'text0609')}
              </p>
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  busyId ===
                  pendingDeactivate.id
                }
                onClick={() =>
                  setPendingDeactivate(
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
                  pendingDeactivate.id
                }
                onClick={() =>
                  toggleActive(
                    pendingDeactivate,
                  )
                }
              >
                {busyId ===
                pendingDeactivate.id
                  ? uiText(isArabic, 'text0099')
                  : uiText(isArabic, 'text0212')}
              </button>
            </div>
          </div>
        </div>
      )}


      {/*
       * ======================================================
       * DELETE CONFIRMATION
       * ======================================================
       */}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              busyId !==
                pendingDelete.id
            ) {
              setPendingDelete(
                null,
              );

              setDeleteError('');
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
                {uiText(isArabic, 'text0610')}
              </h2>


              <p className="mt-2 text-sm leading-6 text-slate-500">
                {uiText(isArabic, 'text0747', { value0: pendingDelete.fullName })}
              </p>


              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-5 text-red-700">
                {uiText(isArabic, 'text0611')}
              </div>


              {deleteError && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {
                    deleteError
                  }
                </div>
              )}
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  busyId ===
                  pendingDelete.id
                }
                onClick={() => {
                  setPendingDelete(
                    null,
                  );

                  setDeleteError('');
                }}
              >
                {uiText(isArabic, 'text0080')}
              </button>


              <button
                type="button"
                className="btn-danger"
                disabled={
                  busyId ===
                  pendingDelete.id
                }
                onClick={
                  confirmDelete
                }
              >
                {busyId ===
                pendingDelete.id
                  ? uiText(isArabic, 'text0083')
                  : uiText(isArabic, 'text0612')}
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

export default function UsersPage() {
  return (
    <ProtectedRoute
      adminOnly
    >
      <UsersContent />
    </ProtectedRoute>
  );
}
