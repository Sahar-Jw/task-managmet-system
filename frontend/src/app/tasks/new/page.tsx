'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import {
  useLocale,
} from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  AssignmentsApi,
  AttachmentsApi,
  BranchesApi,
  DepartmentsApi,
  ProjectsApi,
  SettingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import {
  ATTACHMENT_ACCEPT,
  formatFileSize,
  getFileTypeLabel,
} from '@/lib/file-kind';

import type {
  Branch,
  Department,
  Project,
  Setting,
  Task,
  User,
} from '@/lib/types';

const COLORS = [
  {
    label: 'Blue',
    value: '#3B82F6',
  },
  {
    label: 'Green',
    value: '#22C55E',
  },
  {
    label: 'Amber',
    value: '#F59E0B',
  },
  {
    label: 'Red',
    value: '#EF4444',
  },
  {
    label: 'Purple',
    value: '#8B5CF6',
  },
  {
    label: 'Slate',
    value: '#64748B',
  },
];

type QuickAddType =
  | 'task_type'
  | 'task_priority'
  | 'department'
  | 'branch';

type QuickAddState = {
  open: boolean;
  type: QuickAddType | null;

  label: string;
  code: string;
  address: string;

  saving: boolean;
  error: string;
};

const EMPTY_QUICK_ADD: QuickAddState = {
  open: false,
  type: null,

  label: '',
  code: '',
  address: '',

  saving: false,
  error: '',
};

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-800">
        {title}
      </h2>

      {description && (
        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function FieldLabel({
  children,
  optional,
  action,
}: {
  children: React.ReactNode;
  optional?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-3">
      <label className="text-sm font-medium text-slate-700">
        {children}

        {optional && (
          <span className="ml-1 font-normal text-slate-400">
            {' '}
            (optional)
          </span>
        )}
      </label>

      {action}
    </div>
  );
}

function AddButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-900"
    >
      + Add
    </button>
  );
}

function SummaryRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-2.5">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <div className="text-right text-sm font-medium text-slate-700">
        {children}
      </div>
    </div>
  );
}

function NewTaskContent() {
  const router =
    useRouter();

  const {
    user,
  } = useAuth();

  const locale =
    useLocale();

  const isArabic =
    locale === 'ar';

  const isAdmin =
    user?.role.name ===
    'ADMIN';

  const [
    branches,
    setBranches,
  ] = useState<Branch[]>(
    [],
  );

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>(
    [],
  );

  const [
    projects,
    setProjects,
  ] = useState<Project[]>(
    [],
  );

  const [
    users,
    setUsers,
  ] = useState<User[]>(
    [],
  );

  const [
    tasks,
    setTasks,
  ] = useState<Task[]>(
    [],
  );

  const [
    taskTypes,
    setTaskTypes,
  ] = useState<Setting[]>(
    [],
  );

  const [
    priorities,
    setPriorities,
  ] = useState<Setting[]>(
    [],
  );

  const [
    error,
    setError,
  ] = useState('');

  const [
    peopleError,
    setPeopleError,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    files,
    setFiles,
  ] = useState<File[]>(
    [],
  );

  const [
    dragOver,
    setDragOver,
  ] = useState(false);

  const [
    quickAdd,
    setQuickAdd,
  ] = useState<QuickAddState>(
    EMPTY_QUICK_ADD,
  );

  const [
    form,
    setForm,
  ] = useState({
    title: '',
    description: '',

    taskType: '',
    priority: '',
    color:
      COLORS[0].value,

    branchId: '',
    departmentId: '',
    projectId: '',

    parentTaskId: '',

    /*
     * IMPORTANT:
     *
     * This is only the user selected for the Assignment workflow.
     *
     * It is NOT sent as Task.assignedToId during Task creation.
     */
    assignmentUserId: '',

    needsApproval: false,
    approverId: '',

    needsBudget: false,
    budgetMin: '',
    budgetMax: '',
    budgetCurrency: 'SAR',

    startDate: '',
    deadlineDate: '',
  });

  function set<
    K extends keyof typeof form
  >(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]:
          value,
      }),
    );
  }

  async function loadBranches() {
    try {
      setBranches(
        await BranchesApi.list(),
      );
    } catch {}
  }

  async function loadDepartments() {
    try {
      setDepartments(
        await DepartmentsApi.list(),
      );
    } catch {}
  }

  async function loadTaskTypes() {
    try {
      setTaskTypes(
        await SettingsApi.list(
          'task_type',
          true,
        ),
      );
    } catch {}
  }

  async function loadPriorities() {
    try {
      setPriorities(
        await SettingsApi.list(
          'task_priority',
          true,
        ),
      );
    } catch {}
  }

  useEffect(() => {
    loadBranches();
    loadDepartments();
    loadTaskTypes();
    loadPriorities();

    ProjectsApi.list({
      limit: '100',
      excludeArchived: 'true',
    })
      .then(
        (result) =>
          setProjects(
            result.items,
          ),
      )
      .catch(
        () => {},
      );

    /*
     * No isActive query parameter.
     * We filter inactive users below.
     */
    UsersApi.list({
      limit: '100',
    })
      .then(
        (result) => {
          setUsers(
            result.items,
          );

          setPeopleError('');
        },
      )
      .catch(
        (err) => {
          setPeopleError(
            err instanceof ApiError
              ? err.message
              : 'Could not load the user directory.',
          );
        },
      );

    const tasksRequest =
      isAdmin
        ? TasksApi.list({
            limit: '100',
            excludeArchived:
              'true',
          })
        : TasksApi.mine({
            limit: '100',
          });

    tasksRequest
      .then(
        (result) =>
          setTasks(
            result.items,
          ),
      )
      .catch(
        () => {},
      );
  }, [
    isAdmin,
  ]);

  useEffect(() => {
    if (
      !form.taskType &&
      taskTypes.length >
        0
    ) {
      const normal =
        taskTypes.find(
          (item) =>
            item.key ===
            'General',
        );

      set(
        'taskType',
        normal?.key ||
          taskTypes[0]
            .key ||
          '',
      );
    }
  }, [
    taskTypes,
  ]);

  useEffect(() => {
    if (
      !form.priority &&
      priorities.length >
        0
    ) {
      const normal =
        priorities.find(
          (item) =>
            item.key ===
            'Medium',
        );

      set(
        'priority',
        normal?.key ||
          priorities[0]
            .key ||
          '',
      );
    }
  }, [
    priorities,
  ]);

  const visibleTaskTypes =
    useMemo(
      () =>
        taskTypes.filter(
          (item) =>
            Boolean(
              isArabic
                ? item.codeAr?.trim()
                : item.codeEn?.trim(),
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
        priorities.filter(
          (item) =>
            Boolean(
              isArabic
                ? item.codeAr?.trim()
                : item.codeEn?.trim(),
            ),
        ),
      [
        priorities,
        isArabic,
      ],
    );

  const visibleDepartments =
    useMemo(
      () =>
        departments.filter(
          (item) =>
            item.isActive !==
              false &&
            Boolean(
              isArabic
                ? item.codeAr?.trim()
                : item.codeEn?.trim(),
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
          (item) =>
            item.isActive !==
              false &&
            Boolean(
              isArabic
                ? item.codeAr?.trim()
                : item.codeEn?.trim(),
            ),
        ),
      [
        branches,
        isArabic,
      ],
    );

  const activeUsers =
    useMemo(
      () =>
        users
          .filter(
            (item) =>
              item.isActive,
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
      ],
    );

  /*
   * Admin cannot be Task assignee.
   */
  const assignableUsers =
    activeUsers.filter(
      (item) =>
        item.role.name !==
        'ADMIN',
    );

  /*
   * Approvers can be Admin or normal User.
   *
   * The selected assignment user cannot approve their own Task.
   */
  const approvers =
    activeUsers.filter(
      (item) =>
        item.id !==
        form.assignmentUserId,
    );

  useEffect(() => {
    if (
      form.assignmentUserId &&
      form.approverId ===
        form.assignmentUserId
    ) {
      set(
        'approverId',
        '',
      );
    }
  }, [
    form.assignmentUserId,
  ]);

  function settingLabel(
    item:
      | Setting
      | undefined,
  ) {
    if (!item) {
      return '—';
    }

    return (
      isArabic
        ? item.valueAr ||
          item.codeAr ||
          item.valueEn ||
          item.codeEn
        : item.valueEn ||
          item.codeEn ||
          item.valueAr ||
          item.codeAr
    ) || '—';
  }

  function addFiles(
    incoming:
      | FileList
      | File[],
  ) {
    setFiles(
      (current) => {
        const next =
          Array.from(
            incoming,
          ).filter(
            (file) =>
              !current.some(
                (existing) =>
                  existing.name ===
                    file.name &&
                  existing.size ===
                    file.size,
              ),
          );

        return [
          ...current,
          ...next,
        ];
      },
    );
  }

  function removeFile(
    index: number,
  ) {
    setFiles(
      (current) =>
        current.filter(
          (
            _,
            currentIndex,
          ) =>
            currentIndex !==
            index,
        ),
    );
  }

  function openQuickAdd(
    type: QuickAddType,
  ) {
    setQuickAdd({
      ...EMPTY_QUICK_ADD,
      open: true,
      type,
    });
  }

  function closeQuickAdd() {
    if (
      quickAdd.saving
    ) {
      return;
    }

    setQuickAdd(
      EMPTY_QUICK_ADD,
    );
  }

  function quickAddTitle() {
    switch (
      quickAdd.type
    ) {
      case 'task_type':
        return isArabic
          ? 'إضافة نوع مهمة'
          : 'Add Task Type';

      case 'task_priority':
        return isArabic
          ? 'إضافة أهمية'
          : 'Add Importance';

      case 'department':
        return isArabic
          ? 'إضافة قسم'
          : 'Add Department';

      case 'branch':
        return isArabic
          ? 'إضافة فرع'
          : 'Add Branch';

      default:
        return '';
    }
  }

  async function saveQuickAdd() {
    if (
      !quickAdd.type
    ) {
      return;
    }

    const label =
      quickAdd.label.trim();

    if (!label) {
      setQuickAdd(
        (current) => ({
          ...current,
          error:
            isArabic
              ? 'يرجى إدخال الاسم.'
              : 'Please enter a name.',
        }),
      );

      return;
    }

    setQuickAdd(
      (current) => ({
        ...current,
        saving: true,
        error: '',
      }),
    );

    try {
      if (
        quickAdd.type ===
          'task_type' ||
        quickAdd.type ===
          'task_priority'
      ) {
        const created =
          await SettingsApi.create({
            type:
              quickAdd.type,

            ...(isArabic
              ? {
                  codeAr:
                    label,
                }
              : {
                  codeEn:
                    label,
                }),
          });

        if (
          quickAdd.type ===
          'task_type'
        ) {
          await loadTaskTypes();

          set(
            'taskType',
            created.key ||
              '',
          );
        } else {
          await loadPriorities();

          set(
            'priority',
            created.key ||
              '',
          );
        }
      }

      if (
        quickAdd.type ===
        'department'
      ) {
        const code =
          quickAdd.code.trim() ||
          label;

        const created =
          await DepartmentsApi.create({
            valueType:
              'string',

            ...(isArabic
              ? {
                  codeAr:
                    code,
                  valueAr:
                    label,
                }
              : {
                  codeEn:
                    code,
                  valueEn:
                    label,
                }),
          });

        await loadDepartments();

        set(
          'departmentId',
          created.id,
        );
      }

      if (
        quickAdd.type ===
        'branch'
      ) {
        const code =
          quickAdd.code.trim() ||
          label;

        const created =
          await BranchesApi.create({
            valueType:
              'string',

            ...(isArabic
              ? {
                  codeAr:
                    code,
                  valueAr:
                    label,
                }
              : {
                  codeEn:
                    code,
                  valueEn:
                    label,
                }),

            address:
              quickAdd.address.trim() ||
              undefined,
          });

        await loadBranches();

        set(
          'branchId',
          created.id,
        );
      }

      setQuickAdd(
        EMPTY_QUICK_ADD,
      );
    } catch (
      err
    ) {
      setQuickAdd(
        (current) => ({
          ...current,

          saving: false,

          error:
            err instanceof ApiError
              ? err.message
              : 'Could not add the item.',
        }),
      );
    }
  }

  function validate() {
    if (
      !form.title.trim()
    ) {
      return isArabic
        ? 'يرجى إدخال عنوان المهمة.'
        : 'Please enter a task title.';
    }

    if (
      !form.taskType
    ) {
      return 'Please choose a task type.';
    }

    if (
      !form.priority
    ) {
      return 'Please choose an importance level.';
    }

    if (
      !form.departmentId
    ) {
      return 'Please choose a department.';
    }

    if (
      form.startDate &&
      form.deadlineDate &&
      form.deadlineDate <
        form.startDate
    ) {
      return 'Deadline cannot be before the start date.';
    }

    if (
      form.needsApproval &&
      !form.approverId
    ) {
      return 'Please choose an approver.';
    }

    if (
      form.needsApproval &&
      form.assignmentUserId &&
      form.approverId ===
        form.assignmentUserId
    ) {
      return 'The assignee and approver cannot be the same person.';
    }

    if (
      form.needsBudget &&
      (
        !form.budgetMin ||
        !form.budgetMax
      )
    ) {
      return 'Enter both minimum and maximum budget values.';
    }

    if (
      form.needsBudget &&
      Number(
        form.budgetMin,
      ) >
        Number(
          form.budgetMax,
        )
    ) {
      return 'Budget minimum cannot exceed maximum.';
    }

    return '';
  }

  async function handleSubmit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();

    setError('');

    const validation =
      validate();

    if (validation) {
      setError(
        validation,
      );

      window.scrollTo({
        top: 0,
        behavior:
          'smooth',
      });

      return;
    }

    setSubmitting(
      true,
    );

    try {
      /*
       * IMPORTANT:
       *
       * assignedToId is NOT used here.
       *
       * Assignment is created below using AssignmentsApi.
       */
      const task =
        await TasksApi.create({
          titleAr:
            form.title.trim(),

          titleEn:
            form.title.trim(),

          descriptionAr:
            form.description.trim() ||
            undefined,

          descriptionEn:
            form.description.trim() ||
            undefined,

          taskType:
            form.taskType,

          priority:
            form.priority,

          color:
            form.color,

          branchId:
            form.branchId ||
            undefined,

          departmentId:
            form.departmentId,

          projectId:
            form.projectId ||
            undefined,

          parentTaskId:
            form.parentTaskId ||
            undefined,

          needsApproval:
            form.needsApproval,

          approverId:
            form.needsApproval
              ? form.approverId
              : undefined,

          needsBudget:
            form.needsBudget,

          budgetMin:
            form.needsBudget
              ? form.budgetMin
              : undefined,

          budgetMax:
            form.needsBudget
              ? form.budgetMax
              : undefined,

          budgetCurrency:
            form.needsBudget
              ? form.budgetCurrency ||
                'SAR'
              : undefined,

          startDate:
            form.startDate ||
            undefined,

          deadlineDate:
            form.deadlineDate ||
            undefined,
        });

      /*
       * Unified assignment workflow.
       *
       * The Task already exists, so now create the Assignment:
       *
       * PendingAcceptance -> Accept / Reject -> Reassign.
       */
      if (
        form.assignmentUserId
      ) {
        try {
          await AssignmentsApi.assign(
            task.id,
            form.assignmentUserId,
            form.deadlineDate ||
              undefined,
          );
        } catch (
          assignmentError
        ) {
          /*
           * Do NOT create the Task again.
           *
           * Take the user to Task Details where assignment can
           * be retried safely.
           */
          console.error(
            'Task created but assignment failed:',
            assignmentError,
          );

          window.alert(
            assignmentError instanceof
              ApiError
              ? `Task was created, but the assignment could not be created: ${assignmentError.message}`
              : 'Task was created, but the assignment could not be created. You can assign the Task from Task Details.',
          );

          router.push(
            `/tasks/${task.id}`,
          );

          return;
        }
      }

      if (
        files.length >
        0
      ) {
        try {
          await AttachmentsApi.uploadToTask(
            task.id,
            files,
          );
        } catch (
          attachmentError
        ) {
          console.error(
            'Task created but attachments failed:',
            attachmentError,
          );
        }
      }

      router.push(
        `/tasks/${task.id}`,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not create the task.',
      );

      setSubmitting(
        false,
      );
    }
  }

  const selectedAssignee =
    assignableUsers.find(
      (item) =>
        item.id ===
        form.assignmentUserId,
    );

  const selectedApprover =
    approvers.find(
      (item) =>
        item.id ===
        form.approverId,
    );

  return (
    <div
      className="mx-auto max-w-7xl pb-16"
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mb-3 text-sm text-slate-500 hover:text-brand-700"
          >
            ←{' '}
            {isArabic
              ? 'رجوع'
              : 'Back'}
          </button>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isArabic
              ? 'مهمة جديدة'
              : 'New Task'}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isArabic
              ? 'أنشئ المهمة وحدد تفاصيلها وسير العمل.'
              : 'Create the task and configure its workflow.'}
          </p>
        </div>

        <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
          <span className="mr-2 text-xs text-slate-400">
            Initial status
          </span>

          <StatusBadge
            value="Pending"
            listType="task_status"
          />
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={
          handleSubmit
        }
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <section className="card p-6">
              <SectionHeader
                title={
                  isArabic
                    ? 'تفاصيل المهمة'
                    : 'Task Details'
                }
                description="Add the main information for the task."
              />

              <div className="mt-6 space-y-5">
                <div>
                  <FieldLabel>
                    {isArabic
                      ? 'عنوان المهمة'
                      : 'Task title'}
                  </FieldLabel>

                  <input
                    className="input text-base"
                    required
                    autoFocus
                    maxLength={
                      255
                    }
                    value={
                      form.title
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'title',
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel
                    optional
                  >
                    {isArabic
                      ? 'الوصف'
                      : 'Description'}
                  </FieldLabel>

                  <textarea
                    className="input min-h-[140px]"
                    rows={5}
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'description',
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <section className="card p-6">
              <SectionHeader
                title={
                  isArabic
                    ? 'المرفقات'
                    : 'Attachments'
                }
              />

              <label
                className={`mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center ${
                  dragOver
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-300 bg-slate-50/60'
                }`}
                onDragOver={(
                  event,
                ) => {
                  event.preventDefault();

                  setDragOver(
                    true,
                  );
                }}
                onDragLeave={
                  () =>
                    setDragOver(
                      false,
                    )
                }
                onDrop={(
                  event,
                ) => {
                  event.preventDefault();

                  setDragOver(
                    false,
                  );

                  if (
                    event
                      .dataTransfer
                      .files
                      .length
                  ) {
                    addFiles(
                      event
                        .dataTransfer
                        .files,
                    );
                  }
                }}
              >
                <div className="text-sm font-medium text-slate-700">
                  Drop files here or click to browse
                </div>

                <input
                  type="file"
                  multiple
                  accept={
                    ATTACHMENT_ACCEPT
                  }
                  className="hidden"
                  onChange={(
                    event,
                  ) => {
                    if (
                      event
                        .target
                        .files
                        ?.length
                    ) {
                      addFiles(
                        event
                          .target
                          .files,
                      );
                    }

                    event.target.value =
                      '';
                  }}
                />
              </label>

              {files.length >
                0 && (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                  {files.map(
                    (
                      file,
                      index,
                    ) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-0"
                      >
                        <span className="badge bg-slate-100 text-slate-600">
                          {getFileTypeLabel(
                            file.type,
                            file.name,
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-700">
                            {
                              file.name
                            }
                          </div>

                          <div className="text-xs text-slate-400">
                            {formatFileSize(
                              file.size,
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFile(
                              index,
                            )
                          }
                          className="text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="card p-6">
              <div className="flex items-start justify-between">
                <SectionHeader
                  title={
                    isArabic
                      ? 'الميزانية'
                      : 'Budget'
                  }
                  description="Enable only when this task needs a budget."
                />

                <input
                  type="checkbox"
                  checked={
                    form.needsBudget
                  }
                  onChange={(
                    event,
                  ) =>
                    set(
                      'needsBudget',
                      event
                        .target
                        .checked,
                    )
                  }
                />
              </div>

              {form.needsBudget && (
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <input
                    type="number"
                    className="input"
                    placeholder="Minimum"
                    value={
                      form.budgetMin
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'budgetMin',
                        event
                          .target
                          .value,
                      )
                    }
                  />

                  <input
                    type="number"
                    className="input"
                    placeholder="Maximum"
                    value={
                      form.budgetMax
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'budgetMax',
                        event
                          .target
                          .value,
                      )
                    }
                  />

                  <input
                    className="input"
                    value={
                      form.budgetCurrency
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'budgetCurrency',
                        event
                          .target
                          .value
                          .toUpperCase(),
                      )
                    }
                  />
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="card p-5">
              <SectionHeader
                title="Classification"
              />

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel
                    action={
                      isAdmin ? (
                        <AddButton
                          onClick={() =>
                            openQuickAdd(
                              'task_type',
                            )
                          }
                        />
                      ) : undefined
                    }
                  >
                    Task type
                  </FieldLabel>

                  <select
                    className="input"
                    required
                    value={
                      form.taskType
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'taskType',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Select…
                    </option>

                    {visibleTaskTypes.map(
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
                  <FieldLabel
                    action={
                      isAdmin ? (
                        <AddButton
                          onClick={() =>
                            openQuickAdd(
                              'task_priority',
                            )
                          }
                        />
                      ) : undefined
                    }
                  >
                    Importance
                  </FieldLabel>

                  <select
                    className="input"
                    required
                    value={
                      form.priority
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'priority',
                        event
                          .target
                          .value,
                      )
                    }
                  >
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
                </div>

                <div>
                  <FieldLabel>
                    Task color
                  </FieldLabel>

                  <div className="grid grid-cols-6 gap-2">
                    {COLORS.map(
                      (
                        color,
                      ) => (
                        <button
                          key={
                            color.value
                          }
                          type="button"
                          onClick={() =>
                            set(
                              'color',
                              color.value,
                            )
                          }
                          className={`h-9 rounded-lg border-2 ${
                            form.color ===
                            color.value
                              ? 'border-slate-800'
                              : 'border-transparent'
                          }`}
                          style={{
                            backgroundColor:
                              color.value,
                          }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <SectionHeader
                title="Organization"
              />

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel
                    action={
                      isAdmin ? (
                        <AddButton
                          onClick={() =>
                            openQuickAdd(
                              'department',
                            )
                          }
                        />
                      ) : undefined
                    }
                  >
                    Department
                  </FieldLabel>

                  <select
                    className="input"
                    required
                    value={
                      form.departmentId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'departmentId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Select…
                    </option>

                    {visibleDepartments.map(
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
                          {settingLabel(
                            item,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <FieldLabel
                    optional
                    action={
                      isAdmin ? (
                        <AddButton
                          onClick={() =>
                            openQuickAdd(
                              'branch',
                            )
                          }
                        />
                      ) : undefined
                    }
                  >
                    Branch
                  </FieldLabel>

                  <select
                    className="input"
                    value={
                      form.branchId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'branchId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      No branch
                    </option>

                    {visibleBranches.map(
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
                          {settingLabel(
                            item,
                          )}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div>
                  <FieldLabel
                    optional
                  >
                    Project
                  </FieldLabel>

                  <select
                    className="input"
                    value={
                      form.projectId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'projectId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      No project
                    </option>

                    {projects.map(
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
                          {
                            item.name
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <SectionHeader
                title="People"
                description="You can assign now or leave it unassigned and assign later from Task Details."
              />

              {peopleError && (
                <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">
                  {peopleError}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel
                    optional
                  >
                    Assign to
                  </FieldLabel>

                  <select
                    className="input"
                    value={
                      form.assignmentUserId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'assignmentUserId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Leave unassigned
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
                          {' — '}
                          {item.email}
                        </option>
                      ),
                    )}
                  </select>

                  {form.assignmentUserId && (
                    <p className="mt-2 text-xs text-slate-500">
                      This user will receive the task as{' '}
                      <strong>
                        Pending Acceptance
                      </strong>
                      . They can accept or reject it.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        Needs approval
                      </div>

                      <p className="mt-1 text-xs text-slate-400">
                        Require another user to approve final completion.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={
                        form.needsApproval
                      }
                      onChange={(
                        event,
                      ) => {
                        set(
                          'needsApproval',
                          event
                            .target
                            .checked,
                        );

                        if (
                          !event
                            .target
                            .checked
                        ) {
                          set(
                            'approverId',
                            '',
                          );
                        }
                      }}
                    />
                  </div>

                  {form.needsApproval && (
                    <div className="mt-4">
                      <select
                        className="input"
                        required
                        value={
                          form.approverId
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'approverId',
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          Select approver…
                        </option>

                        {approvers.map(
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
                              {
                                item.fullName
                              }
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <FieldLabel
                    optional
                  >
                    Parent task
                  </FieldLabel>

                  <select
                    className="input"
                    value={
                      form.parentTaskId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'parentTaskId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      Standalone task
                    </option>

                    {tasks.map(
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
                          {isArabic
                            ? item.titleAr ||
                              item.titleEn
                            : item.titleEn ||
                              item.titleAr}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </section>

            <section className="card p-5">
              <SectionHeader
                title="Schedule"
              />

              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel
                    optional
                  >
                    Start date
                  </FieldLabel>

                  <input
                    type="date"
                    className="input"
                    value={
                      form.startDate
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'startDate',
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>

                <div>
                  <FieldLabel
                    optional
                  >
                    Deadline
                  </FieldLabel>

                  <input
                    type="date"
                    className="input"
                    min={
                      form.startDate ||
                      undefined
                    }
                    value={
                      form.deadlineDate
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'deadlineDate',
                        event
                          .target
                          .value,
                      )
                    }
                  />
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className="card mt-6 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <SectionHeader
              title="Task Summary"
            />
          </div>

          <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-slate-400">
                Task status
              </div>

              <div className="mt-2">
                <StatusBadge
                  value="Pending"
                  listType="task_status"
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">
                Assignment
              </div>

              <div className="mt-2 text-sm font-medium text-slate-700">
                {selectedAssignee
                  ? `${selectedAssignee.fullName} · Pending Acceptance`
                  : 'Unassigned'}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">
                Approval
              </div>

              <div className="mt-2 text-sm font-medium text-slate-700">
                {form.needsApproval
                  ? `Required · ${selectedApprover?.fullName || 'No approver'}`
                  : 'Not required'}
              </div>
            </div>

            <div>
              <div className="text-xs text-slate-400">
                Deadline
              </div>

              <div className="mt-2 text-sm font-medium text-slate-700">
                {form.deadlineDate ||
                  'No deadline'}
              </div>
            </div>
          </div>
        </section>

        <div className="sticky bottom-4 z-20 mt-6">
          <div className="flex justify-end gap-2 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <button
              type="button"
              className="btn-secondary"
              disabled={
                submitting
              }
              onClick={() =>
                router.back()
              }
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={
                submitting
              }
            >
              {submitting
                ? 'Creating…'
                : 'Create Task'}
            </button>
          </div>
        </div>
      </form>

      {quickAdd.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeQuickAdd();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-lg font-semibold">
                {quickAddTitle()}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Saved only in the currently selected language.
              </p>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <FieldLabel>
                  Name
                </FieldLabel>

                <input
                  className="input"
                  value={
                    quickAdd.label
                  }
                  onChange={(
                    event,
                  ) =>
                    setQuickAdd(
                      (
                        current,
                      ) => ({
                        ...current,

                        label:
                          event
                            .target
                            .value,
                      }),
                    )
                  }
                />
              </div>

              {(
                quickAdd.type ===
                  'department' ||
                quickAdd.type ===
                  'branch'
              ) && (
                <div>
                  <FieldLabel
                    optional
                  >
                    Code
                  </FieldLabel>

                  <input
                    className="input"
                    value={
                      quickAdd.code
                    }
                    onChange={(
                      event,
                    ) =>
                      setQuickAdd(
                        (
                          current,
                        ) => ({
                          ...current,

                          code:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>
              )}

              {quickAdd.type ===
                'branch' && (
                <div>
                  <FieldLabel
                    optional
                  >
                    Address
                  </FieldLabel>

                  <input
                    className="input"
                    value={
                      quickAdd.address
                    }
                    onChange={(
                      event,
                    ) =>
                      setQuickAdd(
                        (
                          current,
                        ) => ({
                          ...current,

                          address:
                            event
                              .target
                              .value,
                        }),
                      )
                    }
                  />
                </div>
              )}

              {quickAdd.error && (
                <p className="text-sm text-red-600">
                  {
                    quickAdd.error
                  }
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 p-4">
              <button
                type="button"
                className="btn-secondary"
                onClick={
                  closeQuickAdd
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary"
                disabled={
                  quickAdd.saving
                }
                onClick={
                  saveQuickAdd
                }
              >
                {quickAdd.saving
                  ? 'Adding…'
                  : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <ProtectedRoute>
      <NewTaskContent />
    </ProtectedRoute>
  );
}