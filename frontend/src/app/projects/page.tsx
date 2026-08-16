// frontend/src/app/projects/page.tsx

'use client';

import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useSearchParams,
} from 'next/navigation';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import Pagination from '@/components/Pagination';

import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

import {
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Branch,
  Department,
  Project,
  ProjectStatus,
  User,
} from '@/lib/types';

const PAGE_SIZE = 10;

const PROJECT_STATUSES: ProjectStatus[] = [
  'Planned',
  'Active',
  'Completed',
  'Archived',
];

function ProjectsContent() {
  const { user } =
    useAuth();

  const isAdmin =
    user?.role.name ===
    'ADMIN';

  const searchParams =
    useSearchParams();

  /*
   * Read the project status passed from the Dashboard.
   *
   * Example:
   *
   * /projects?status=Active
   */
  const statusFromUrl =
    searchParams.get(
      'status',
    ) || '';

  /*
   * If Archived was clicked on the Dashboard,
   * open the Archived tab automatically.
   */
  const [
    scope,
    setScope,
  ] = useState<
    | 'all'
    | 'mine'
    | 'archived'
  >(
    statusFromUrl ===
      'Archived'
      ? 'archived'
      : 'all',
  );

  const [
    projects,
    setProjects,
  ] = useState<
    Project[]
  >([]);

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
    showForm,
    setShowForm,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    form,
    setForm,
  ] = useState({
    name: '',
    description: '',
  });

  const [
    nameFilter,
    setNameFilter,
  ] = useState('');

  const [
    descriptionFilter,
    setDescriptionFilter,
  ] = useState('');

  const [
    ownerId,
    setOwnerId,
  ] = useState(
    searchParams.get(
      'ownerId',
    ) || '',
  );

  /*
   * Initialize the Status filter directly
   * from the Dashboard URL.
   *
   * Archived is handled by the Archived scope.
   */
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
    owners,
    setOwners,
  ] = useState<
    User[]
  >([]);

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
    editingId,
    setEditingId,
  ] = useState<
    string | null
  >(null);

  const [
    editForm,
    setEditForm,
  ] = useState({
    name: '',
    description: '',
  });

  const [
    editError,
    setEditError,
  ] = useState('');

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
  } | null>(null);

  const [
    confirmDeleteId,
    setConfirmDeleteId,
  ] = useState<
    string | null
  >(null);

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
          };

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

          if (
            nameFilter
          ) {
            params.name =
              nameFilter;
          }

          if (
            descriptionFilter
          ) {
            params.description =
              descriptionFilter;
          }

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

          const res =
            await ProjectsApi.list(
              params,
            );

          setProjects(
            res.items,
          );

          setTotal(
            res.total,
          );
        } catch (err) {
          setError(
            err instanceof
              ApiError
              ? err.message
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
        nameFilter,
        descriptionFilter,
        ownerId,
        statusFilter,
        departmentId,
        branchId,
        createdDateFrom,
        createdDateTo,
      ],
    );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    UsersApi.list({
      limit: '100',
    })
      .then((res) =>
        setOwners(
          res.items,
        ),
      )
      .catch(() => {});

    DepartmentsApi.list()
      .then(
        setDepartments,
      )
      .catch(() => {});

    BranchesApi.list()
      .then(
        setBranches,
      )
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [
    nameFilter,
    descriptionFilter,
    ownerId,
    statusFilter,
    departmentId,
    branchId,
    createdDateFrom,
    createdDateTo,
  ]);

  function switchScope(
    next:
      | 'all'
      | 'mine'
      | 'archived',
  ) {
    if (
      next === scope
    ) {
      return;
    }

    setScope(next);

    setPage(1);
  }

  const totalPages =
    Math.max(
      Math.ceil(
        total /
          PAGE_SIZE,
      ),
      1,
    );

  async function handleCreate(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError('');

    try {
      await ProjectsApi.create(
        form,
      );

      setForm({
        name: '',
        description: '',
      });

      setShowForm(
        false,
      );

      load();
    } catch (err) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not create the project.',
      );
    }
  }

  function startEdit(
    project: Project,
  ) {
    setEditingId(
      project.id,
    );

    setEditForm({
      name:
        project.name,

      description:
        project.description ||
        '',
    });

    setEditError('');

    setRowError(
      null,
    );
  }

  function cancelEdit() {
    setEditingId(
      null,
    );

    setEditError('');
  }

  async function handleUpdate(
    e: React.FormEvent,
    id: string,
  ) {
    e.preventDefault();

    setEditError('');

    try {
      const updated =
        await ProjectsApi.update(
          id,
          editForm,
        );

      setProjects(
        (prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...updated,
                }
              : p,
          ),
      );

      setEditingId(
        null,
      );
    } catch (err) {
      setEditError(
        err instanceof
          ApiError
          ? err.message
          : 'Could not update the project.',
      );
    }
  }

  async function handleDelete(
    id: string,
  ) {
    setBusyId(id);

    setRowError(
      null,
    );

    try {
      await ProjectsApi.remove(
        id,
      );

      setConfirmDeleteId(
        null,
      );

      load();
    } catch (err) {
      setRowError({
        id,

        message:
          err instanceof
            ApiError
            ? err.message
            : 'Could not delete this project.',
      });

      setConfirmDeleteId(
        null,
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }

  async function handleArchive(
    id: string,
  ) {
    setBusyId(id);

    setRowError(
      null,
    );

    try {
      await ProjectsApi.archive(
        id,
      );

      setProjects(
        (current) =>
          current.filter(
            (project) =>
              project.id !==
              id,
          ),
      );

      setTotal(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      );
    } catch (err) {
      setRowError({
        id,

        message:
          err instanceof
            ApiError
            ? err.message
            : 'Could not archive this project.',
      });
    } finally {
      setBusyId(
        null,
      );
    }
  }

  async function handleUnarchive(
    id: string,
  ) {
    setBusyId(id);

    setRowError(
      null,
    );

    try {
      await ProjectsApi.unarchive(
        id,
      );

      setProjects(
        (current) =>
          current.filter(
            (project) =>
              project.id !==
              id,
          ),
      );

      setTotal(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      );
    } catch (err) {
      setRowError({
        id,

        message:
          err instanceof
            ApiError
            ? err.message
            : 'Could not unarchive this project.',
      });
    } finally {
      setBusyId(
        null,
      );
    }
  }

  function canManage(
    project: Project,
  ) {
    return (
      isAdmin ||
      project.createdById ===
        user?.id
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Projects
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? scope ===
                'all'
                ? 'All projects across the organization.'
                : 'Projects you created.'
              : 'Projects you created.'}
          </p>
        </div>

        {scope !==
          'archived' && (
          <button
            className="btn-primary"
            onClick={() =>
              setShowForm(
                (v) => !v,
              )
            }
          >
            {showForm
              ? 'Cancel'
              : '+ New project'}
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mt-4 flex gap-1 border-b border-slate-200">
          <button
            className={`px-3 py-2 text-sm font-medium ${
              scope ===
              'all'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() =>
              switchScope(
                'all',
              )
            }
          >
            All projects
          </button>

          <button
            className={`px-3 py-2 text-sm font-medium ${
              scope ===
              'mine'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() =>
              switchScope(
                'mine',
              )
            }
          >
            My projects
          </button>

          <button
            className={`px-3 py-2 text-sm font-medium ${
              scope ===
              'archived'
                ? 'border-b-2 border-brand-600 text-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() =>
              switchScope(
                'archived',
              )
            }
          >
            Archived
          </button>
        </div>
      )}

      {showForm &&
        scope !==
          'archived' && (
          <form
            onSubmit={
              handleCreate
            }
            className="card mt-4 space-y-3 p-6"
          >
            <div>
              <label className="label">
                Name
              </label>

              <input
                className="input"
                required
                value={
                  form.name
                }
                onChange={(
                  e,
                ) =>
                  setForm({
                    ...form,

                    name:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            <div>
              <label className="label">
                Description
              </label>

              <textarea
                className="input"
                rows={2}
                value={
                  form.description
                }
                onChange={(
                  e,
                ) =>
                  setForm({
                    ...form,

                    description:
                      e.target
                        .value,
                  })
                }
              />
            </div>

            {error && (
              <p className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary"
            >
              Create project
            </button>
          </form>
        )}

      {error &&
        !showForm && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="label">
            Project name
          </label>

          <input
            className="input"
            value={
              nameFilter
            }
            onChange={(e) =>
              setNameFilter(
                e.target.value,
              )
            }
          />
        </div>

        <div className="min-w-[180px] flex-1">
          <label className="label">
            Description
          </label>

          <input
            className="input"
            value={
              descriptionFilter
            }
            onChange={(e) =>
              setDescriptionFilter(
                e.target.value,
              )
            }
          />
        </div>

        {scope !==
          'archived' && (
          <div>
            <label className="label">
              Status
            </label>

            <select
              className="input"
              value={
                statusFilter
              }
              onChange={(e) =>
                setStatusFilter(
                  e.target.value,
                )
              }
            >
              <option value="">
                All
              </option>

              {PROJECT_STATUSES.filter(
                (status) =>
                  status !==
                  'Archived',
              ).map(
                (status) => (
                  <option
                    key={
                      status
                    }
                    value={
                      status
                    }
                  >
                    {
                      status
                    }
                  </option>
                ),
              )}
            </select>
          </div>
        )}

        {isAdmin &&
          scope !==
            'mine' && (
            <>
              <div>
                <label className="label">
                  Owner
                </label>

                <select
                  className="input"
                  value={
                    ownerId
                  }
                  onChange={(
                    e,
                  ) =>
                    setOwnerId(
                      e.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All
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
                  Department
                </label>

                <select
                  className="input"
                  value={
                    departmentId
                  }
                  onChange={(
                    e,
                  ) =>
                    setDepartmentId(
                      e.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All
                  </option>

                  {departments.map(
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
                        {department.valueEn ||
                          department.codeEn}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label className="label">
                  Branch
                </label>

                <select
                  className="input"
                  value={
                    branchId
                  }
                  onChange={(
                    e,
                  ) =>
                    setBranchId(
                      e.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    All
                  </option>

                  {branches.map(
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
                        {branch.valueEn ||
                          branch.codeEn}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </>
          )}

        <div>
          <label className="label">
            Created from
          </label>

          <input
            type="date"
            className="input"
            value={
              createdDateFrom
            }
            onChange={(e) =>
              setCreatedDateFrom(
                e.target.value,
              )
            }
          />
        </div>

        <div>
          <label className="label">
            Created to
          </label>

          <input
            type="date"
            className="input"
            value={
              createdDateTo
            }
            onChange={(e) =>
              setCreatedDateTo(
                e.target.value,
              )
            }
          />
        </div>

        {(nameFilter ||
          descriptionFilter ||
          (scope !==
            'archived' &&
            statusFilter) ||
          ownerId ||
          departmentId ||
          branchId ||
          createdDateFrom ||
          createdDateTo) && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setNameFilter(
                '',
              );

              setDescriptionFilter(
                '',
              );

              setStatusFilter(
                '',
              );

              setOwnerId(
                '',
              );

              setDepartmentId(
                '',
              );

              setBranchId(
                '',
              );

              setCreatedDateFrom(
                '',
              );

              setCreatedDateTo(
                '',
              );
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-4 card divide-y divide-slate-100">
        {loading ? (
          <p className="p-6 text-center text-slate-500">
            Loading…
          </p>
        ) : projects.length ===
          0 ? (
          <p className="p-6 text-center text-slate-500">
            No projects yet.
          </p>
        ) : (
          projects.map(
            (p) => (
              <div
                key={
                  p.id
                }
                className="px-4 py-3"
              >
                {editingId ===
                p.id ? (
                  <form
                    onSubmit={(
                      e,
                    ) =>
                      handleUpdate(
                        e,
                        p.id,
                      )
                    }
                    className="space-y-3"
                  >
                    <div>
                      <label className="label">
                        Name
                      </label>

                      <input
                        className="input"
                        required
                        value={
                          editForm.name
                        }
                        onChange={(
                          e,
                        ) =>
                          setEditForm(
                            {
                              ...editForm,

                              name:
                                e
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </div>

                    <div>
                      <label className="label">
                        Description
                      </label>

                      <textarea
                        className="input"
                        rows={2}
                        value={
                          editForm.description
                        }
                        onChange={(
                          e,
                        ) =>
                          setEditForm(
                            {
                              ...editForm,

                              description:
                                e
                                  .target
                                  .value,
                            },
                          )
                        }
                      />
                    </div>

                    {editError && (
                      <p className="text-sm text-red-600">
                        {
                          editError
                        }
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        className="btn-primary px-3 py-1 text-xs"
                      >
                        Save
                      </button>

                      <button
                        type="button"
                        className="btn-secondary px-3 py-1 text-xs"
                        onClick={
                          cancelEdit
                        }
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      href={`/projects/${p.id}`}
                      className="min-w-0 flex-1 hover:underline"
                    >
                      <div className="truncate font-medium text-slate-800">
                        {
                          p.name
                        }
                      </div>

                      {p.description && (
                        <div className="truncate text-xs text-slate-500">
                          {
                            p.description
                          }
                        </div>
                      )}

                      {isAdmin && (
                        <div className="truncate text-xs text-slate-400">
                          Owner:{' '}
                          {p.ownerName ||
                            '—'}
                        </div>
                      )}

                      <div className="text-xs text-slate-400">
                        Created:{' '}
                        {new Date(
                          p.createdAt,
                        ).toLocaleDateString()}
                      </div>

                      {isAdmin && (
                        <div className="text-xs text-slate-400">
                          Department:{' '}
                          {p.ownerDepartmentName ||
                            'Not set'}{' '}
                          / Branch:{' '}
                          {p.ownerBranchName ||
                            'Not set'}
                        </div>
                      )}
                    </Link>

                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge
                        value={
                          p.status
                        }
                        listType="project_status"
                      />

                      {canManage(
                        p,
                      ) &&
                        p.status !==
                          'Archived' && (
                          <button
                            className="btn-secondary px-3 py-1 text-xs"
                            onClick={() =>
                              startEdit(
                                p,
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                      {isAdmin &&
                        p.status !==
                          'Archived' && (
                          <button
                            className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
                            disabled={
                              busyId ===
                              p.id
                            }
                            onClick={() =>
                              handleArchive(
                                p.id,
                              )
                            }
                          >
                            {busyId ===
                            p.id
                              ? 'Archiving…'
                              : 'Archive'}
                          </button>
                        )}

                      {isAdmin &&
                        p.status ===
                          'Archived' && (
                          <button
                            className="btn-secondary px-3 py-1 text-xs disabled:opacity-50"
                            disabled={
                              busyId ===
                              p.id
                            }
                            onClick={() =>
                              handleUnarchive(
                                p.id,
                              )
                            }
                          >
                            {busyId ===
                            p.id
                              ? 'Unarchiving...'
                              : 'Unarchive'}
                          </button>
                        )}

                      {canManage(
                        p,
                      ) &&
                        (confirmDeleteId ===
                        p.id ? (
                          <>
                            <span className="text-xs text-slate-500">
                              Delete?
                            </span>

                            <button
                              className="btn-danger px-3 py-1 text-xs disabled:opacity-50"
                              disabled={
                                busyId ===
                                p.id
                              }
                              onClick={() =>
                                handleDelete(
                                  p.id,
                                )
                              }
                            >
                              {busyId ===
                              p.id
                                ? 'Deleting…'
                                : 'Confirm'}
                            </button>

                            <button
                              className="btn-secondary px-3 py-1 text-xs"
                              onClick={() =>
                                setConfirmDeleteId(
                                  null,
                                )
                              }
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            className="btn-danger px-3 py-1 text-xs"
                            onClick={() =>
                              setConfirmDeleteId(
                                p.id,
                              )
                            }
                          >
                            Delete
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {rowError?.id ===
                  p.id && (
                  <p className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-600">
                    {
                      rowError.message
                    }
                  </p>
                )}
              </div>
            ),
          )
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
          itemLabel="projects"
        />
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <ProjectsContent />
    </ProtectedRoute>
  );
}