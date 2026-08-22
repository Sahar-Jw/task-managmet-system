'use client';

import { uiText } from '@/lib/ui-text';


import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useRouter,
  useSearchParams,
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
import AvatarSelect from '@/components/AvatarSelect';


/*
 * ============================================================
 * COLORS
 * ============================================================
 */

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


function formatLocalDate(
  date:
    Date,
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      '0',
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      '0',
    );

  return `${year}-${month}-${day}`;
}


function getDefaultTaskDates() {
  const startDate =
    new Date();

  return {
    startDate:
      formatLocalDate(
        startDate,
      ),

    deadlineDate:
      '',
  };
}


/*
 * ============================================================
 * QUICK ADD
 * ============================================================
 */

type QuickAddType =
  | 'task_type'
  | 'task_priority'
  | 'department'
  | 'branch';


type QuickAddState = {
  open: boolean;

  type:
    QuickAddType | null;

  label: string;

  code: string;

  address: string;

  saving: boolean;

  error: string;
};


const EMPTY_QUICK_ADD:
  QuickAddState = {
  open: false,

  type: null,

  label: '',

  code: '',

  address: '',

  saving: false,

  error: '',
};


/*
 * ============================================================
 * SHARED UI
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
      <h2
        className="
          text-base
          font-semibold
          text-slate-900
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-1
            text-sm
            leading-6
            text-slate-500
          "
        >
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
  isArabic,
}: {
  children:
    React.ReactNode;

  optional?:
    boolean;

  action?:
    React.ReactNode;

  isArabic?:
    boolean;
}) {
  return (
    <div
      className="
        mb-1.5
        flex
        items-center
        justify-between
        gap-3
      "
    >
      <label
        className="
          text-sm
          font-medium
          text-slate-700
        "
      >
        {children}

        {optional && (
          <span
            className="
              ms-1
              font-normal
              text-slate-400
            "
          >
            {uiText(isArabic, 'text0062')}
          </span>
        )}
      </label>

      {action}
    </div>
  );
}


function AddButton({
  onClick,
  isArabic,
}: {
  onClick:
    () => void;

  isArabic:
    boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="
        inline-flex
        items-center
        gap-1
        rounded-lg
        px-2
        py-1
        text-xs
        font-semibold
        text-brand-700
        transition
        hover:bg-brand-50
        hover:text-brand-900
      "
    >
      +{' '}
      {uiText(isArabic, 'text0169')}
    </button>
  );
}


/*
 * ============================================================
 * TOGGLE SWITCH
 * ============================================================
 *
 * All boolean options on this page use this component.
 * No native checkboxes.
 * ============================================================
 */

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked:
    boolean;

  onChange:
    (
      value:
        boolean,
    ) => void;

  disabled?:
    boolean;

  label:
    string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={
        label
      }
      aria-checked={
        checked
      }
      disabled={
        disabled
      }
      onClick={() =>
        onChange(
          !checked,
        )
      }
      className={`
        relative
        inline-flex
        h-7
        w-12
        shrink-0
        items-center
        rounded-full
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2
        focus:ring-brand-200
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${
          checked
            ? 'bg-brand-600'
            : 'bg-slate-200'
        }
      `}
    >
      <span
        className={`
          absolute
          top-1
          h-5
          w-5
          rounded-full
          bg-white
          shadow-sm
          transition-all
          duration-200
          ${
            checked
              ? 'end-1'
              : 'start-1'
          }
        `}
      />
    </button>
  );
}


/*
 * ============================================================
 * MAIN
 * ============================================================
 */

function NewTaskContent() {
  const router =
    useRouter();


  const presetProjectId =
    useSearchParams().get(
      'projectId',
    ) ??
    '';


  const {
    user,
  } =
    useAuth();


  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  const isAdmin =
    user?.role.name ===
    'ADMIN';


  /*
   * ==========================================================
   * LOOKUP DATA
   * ==========================================================
   */

  const [
    branches,
    setBranches,
  ] =
    useState<Branch[]>(
      [],
    );


  const [
    departments,
    setDepartments,
  ] =
    useState<
      Department[]
    >(
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
    taskTypes,
    setTaskTypes,
  ] =
    useState<Setting[]>(
      [],
    );


  const [
    priorities,
    setPriorities,
  ] =
    useState<Setting[]>(
      [],
    );


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

  const [
    error,
    setError,
  ] =
    useState('');


  const [
    peopleError,
    setPeopleError,
  ] =
    useState('');


  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );


  const [
    files,
    setFiles,
  ] =
    useState<File[]>(
      [],
    );


  const [
    dragOver,
    setDragOver,
  ] =
    useState(
      false,
    );


  const [
    quickAdd,
    setQuickAdd,
  ] =
    useState<QuickAddState>(
      EMPTY_QUICK_ADD,
    );


  /*
   * ==========================================================
   * FORM
   * ==========================================================
   */

  const [
    form,
    setForm,
  ] =
    useState(() => {
      const defaultDates =
        getDefaultTaskDates();

      return {
      title:
        '',

      description:
        '',

      taskType:
        '',

      priority:
        '',

      color:
        COLORS[0].value,

      branchId:
        '',

      departmentId:
        '',

      projectId:
        presetProjectId,

      parentTaskId:
        '',

      /*
       * Assignment is intentionally separate from Task creation.
       */
      assignmentUserId:
        '',


      /*
       * ======================================================
       * ATTACHMENT DOWNLOAD PERMISSION
       * ======================================================
       *
       * Preview is always available to the assigned user.
       *
       * This controls DOWNLOAD only.
       * ======================================================
       */
      assigneeCanDownloadAttachments:
        true,


      needsApproval:
        false,

      approverId:
        '',

      needsBudget:
        false,

      budgetMin:
        '',

      budgetMax:
        '',

      budgetCurrency:
        'SAR',

      startDate:
        defaultDates.startDate,

      deadlineDate:
        defaultDates.deadlineDate,
      };
    });


  const creatorOrganizationApplied =
    useRef(
      false,
    );


  useEffect(() => {
    if (
      !user ||
      creatorOrganizationApplied.current
    ) {
      return;
    }


    creatorOrganizationApplied.current =
      true;


    setForm(
      (
        current,
      ) => ({
        ...current,

        branchId:
          current.branchId ||
          user.branchId ||
          '',

        departmentId:
          current.departmentId ||
          user.departmentId ||
          '',
      }),
    );
  }, [user]);


  function set<
    K extends keyof typeof form
  >(
    key:
      K,

    value:
      (typeof form)[K],
  ) {
    setForm(
      (
        current,
      ) => ({
        ...current,

        [key]:
          value,
      }),
    );
  }


  /*
   * ==========================================================
   * LOAD LOOKUPS
   * ==========================================================
   */

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
      limit:
        '100',

      excludeArchived:
        'true',
    })
      .then(
        (
          result,
        ) =>
          setProjects(
            result.items,
          ),
      )
      .catch(
        () => {},
      );


    UsersApi.list({
      limit:
        '100',
    })
      .then(
        (
          result,
        ) => {
          setUsers(
            result.items,
          );

          setPeopleError(
            '',
          );
        },
      )
      .catch(
        (
          err,
        ) => {
          setPeopleError(
            err instanceof
              ApiError
              ? err.message
              : uiText(isArabic, 'text0537'),
          );
        },
      );


    const tasksRequest =
      isAdmin
        ? TasksApi.list({
            limit:
              '100',

            excludeArchived:
              'true',
          })
        : Promise.all([
            TasksApi.mine({
              limit:
                '100',
            }),

            TasksApi.assignedByMe({
              limit:
                '100',
            }),
          ]).then(
            ([
              assignedToMe,
              createdByMe,
            ]) => {
              const byId =
                new Map(
                  [
                    ...assignedToMe.items,
                    ...createdByMe.items,
                  ].map(
                    (
                      item,
                    ) => [
                      item.id,
                      item,
                    ],
                  ),
                );


              const items =
                Array.from(
                  byId.values(),
                );


              return {
                items,
                total:
                  items.length,
                page:
                  1,
                limit:
                  100,
              };
            },
          );


    tasksRequest
      .then(
        (
          result,
        ) =>
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


  /*
   * ==========================================================
   * DEFAULT TYPE
   * ==========================================================
   */

  useEffect(() => {
    if (
      !form.taskType &&
      taskTypes.length >
        0
    ) {
      const normal =
        taskTypes.find(
          (
            item,
          ) =>
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


  /*
   * ==========================================================
   * DEFAULT PRIORITY
   * ==========================================================
   */

  useEffect(() => {
    if (
      !form.priority &&
      priorities.length >
        0
    ) {
      const normal =
        priorities.find(
          (
            item,
          ) =>
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


  /*
   * ==========================================================
   * LANGUAGE-SPECIFIC OPTIONS
   * ==========================================================
   */

  const visibleTaskTypes =
    useMemo(
      () =>
        taskTypes.filter(
          (
            item,
          ) =>
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
          (
            item,
          ) =>
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
          (
            item,
          ) =>
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
          (
            item,
          ) =>
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


  /*
   * ==========================================================
   * USERS
   * ==========================================================
   */

  const activeUsers =
    useMemo(
      () =>
        users
          .filter(
            (
              item,
            ) =>
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


  const assignableUsers =
    activeUsers;


  /*
   * Admins ARE allowed to approve.
   */
  const approvers =
    activeUsers.filter(
      (
        item,
      ) =>
        item.id !==
        form.assignmentUserId,
    );


  /*
   * ==========================================================
   * MAIN TASKS ONLY FOR PARENT OPTIONS
   * ==========================================================
   *
   * Prevent creating Sub-subtasks from this page.
   * ==========================================================
   */

  const parentTaskOptions =
    useMemo(
      () =>
        tasks.filter(
          (
            item,
          ) =>
            !item.parentTaskId &&
            ![
              'Completed',
              'Finished',
              'Archived',
            ].includes(
              item.status,
            ),
        ),

      [
        tasks,
      ],
    );


  /*
   * ==========================================================
   * APPROVER / ASSIGNEE CONFLICT
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * LABEL
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


  /*
   * ==========================================================
   * PARENT TASK
   * ==========================================================
   */

  function handleParentTaskChange(
    parentTaskId:
      string,
  ) {
    if (
      !parentTaskId
    ) {
      set(
        'parentTaskId',
        '',
      );

      return;
    }


    const parent =
      parentTaskOptions.find(
        (
          item,
        ) =>
          item.id ===
          parentTaskId,
      );


    if (!parent) {
      set(
        'parentTaskId',
        parentTaskId,
      );

      return;
    }


    /*
     * Subtasks must stay in the Parent's organization.
     *
     * This matches the backend validation.
     */
    setForm(
      (
        current,
      ) => ({
        ...current,

        parentTaskId:
          parent.id,

        departmentId:
          parent.departmentId ||
          '',

        branchId:
          parent.branchId ||
          '',

        projectId:
          parent.projectId ||
          '',

        startDate:
          parent.startDate ||
          current.startDate,

        deadlineDate:
          parent.deadlineDate ||
          current.deadlineDate,
      }),
    );
  }


  const selectedParent =
    parentTaskOptions.find(
      (
        item,
      ) =>
        item.id ===
        form.parentTaskId,
    );


  /*
   * ==========================================================
   * FILES
   * ==========================================================
   */

  function addFiles(
    incoming:
      | FileList
      | File[],
  ) {
    const incomingFiles =
      Array.from(
        incoming,
      );


    const emptyFiles =
      incomingFiles.filter(
        (
          file,
        ) =>
          file.size ===
          0,
      );


    if (
      emptyFiles.length >
      0
    ) {
      setError(
        isArabic
          ? `لا يمكن رفع ملف فارغ: ${emptyFiles.map((file) => file.name).join('، ')}`
          : `Empty files cannot be uploaded: ${emptyFiles.map((file) => file.name).join(', ')}`,
      );
    }


    setFiles(
      (
        current,
      ) => {
        const next =
          incomingFiles.filter(
            (
              file,
            ) =>
              file.size >
                0 &&
              !current.some(
                (
                  existing,
                ) =>
                  existing.name ===
                    file.name &&
                  existing.size ===
                    file.size &&
                  existing.lastModified ===
                    file.lastModified,
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
    index:
      number,
  ) {
    setFiles(
      (
        current,
      ) =>
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


  /*
   * ==========================================================
   * QUICK ADD
   * ==========================================================
   */

  function openQuickAdd(
    type:
      QuickAddType,
  ) {
    setQuickAdd({
      ...EMPTY_QUICK_ADD,

      open:
        true,

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
        return uiText(isArabic, 'text0170');

      case 'task_priority':
        return uiText(isArabic, 'text0538');

      case 'department':
        return uiText(isArabic, 'text0539');

      case 'branch':
        return uiText(isArabic, 'text0540');

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
        (
          current,
        ) => ({
          ...current,

          error:
            uiText(isArabic, 'text0541'),
        }),
      );

      return;
    }


    setQuickAdd(
      (
        current,
      ) => ({
        ...current,

        saving:
          true,

        error:
          '',
      }),
    );


    try {
      /*
       * ======================================================
       * TYPE / PRIORITY
       * ======================================================
       */

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


      /*
       * ======================================================
       * DEPARTMENT
       * ======================================================
       */

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


      /*
       * ======================================================
       * BRANCH
       * ======================================================
       */

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
        (
          current,
        ) => ({
          ...current,

          saving:
            false,

          error:
            err instanceof
              ApiError
              ? err.message
              : uiText(isArabic, 'text0171'),
        }),
      );
    }
  }


  /*
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  function validate() {
    if (
      !form.title.trim()
    ) {
      return uiText(isArabic, 'text0542');
    }


    if (
      !form.taskType
    ) {
      return uiText(isArabic, 'text0172');
    }


    if (
      !form.priority
    ) {
      return uiText(isArabic, 'text0543');
    }


    if (
      !form.departmentId
    ) {
      return uiText(isArabic, 'text0544');
    }

    if (
      !form.deadlineDate
    ) {
      return uiText(isArabic, 'text1062');
    }


    if (
      form.startDate &&
      form.deadlineDate &&
      form.deadlineDate <
        form.startDate
    ) {
      return uiText(isArabic, 'text0545');
    }


    if (
      selectedParent?.startDate &&
      form.startDate &&
      form.startDate <
        selectedParent.startDate
    ) {
      return uiText(isArabic, 'text0546');
    }


    if (
      selectedParent?.deadlineDate &&
      form.deadlineDate &&
      form.deadlineDate >
        selectedParent.deadlineDate
    ) {
      return uiText(isArabic, 'text0547');
    }


    if (
      form.needsApproval &&
      !form.approverId
    ) {
      return uiText(isArabic, 'text0548');
    }


    if (
      form.needsApproval &&
      form.assignmentUserId &&
      form.approverId ===
        form.assignmentUserId
    ) {
      return uiText(isArabic, 'text0549');
    }


    if (
      form.needsBudget &&
      (
        !form.budgetMin ||
        !form.budgetMax
      )
    ) {
      return uiText(isArabic, 'text0550');
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
      return uiText(isArabic, 'text0173');
    }


    return '';
  }


  /*
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  async function handleSubmit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    setError('');


    const validation =
      validate();


    if (
      validation
    ) {
      setError(
        validation,
      );


      window.scrollTo({
        top:
          0,

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
       * ======================================================
       * CREATE TASK
       * ======================================================
       */

      const task =
        await TasksApi.create({
          title:
            form.title.trim(),

          description:
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
            form.deadlineDate,
        });


      /*
       * ======================================================
       * ATTACHMENT DOWNLOAD PERMISSION
       * ======================================================
       *
       * Save this BEFORE creating the assignment and before
       * uploading the selected attachments.
       *
       * Assigned users may always preview.
       * This setting controls download only.
       * ======================================================
       */

      try {
        await TasksApi.updateAttachmentPermissions(
          task.id,
          form.assigneeCanDownloadAttachments,
        );
      } catch (
        permissionError
      ) {
        console.error(
          'Task created but attachment permission could not be saved:',

          permissionError,
        );


        window.alert(
          permissionError instanceof
            ApiError
            ? (
                uiText(isArabic, 'text0740', { value0: permissionError.message })
              )
            : (
                uiText(isArabic, 'text0551')
              ),
        );


        router.push(
          `/tasks/view?id=${task.id}`,
        );

        return;
      }


      /*
       * ======================================================
       * ASSIGNMENT
       * ======================================================
       */

      if (
        form.assignmentUserId
      ) {
        try {
          await AssignmentsApi.assign(
            task.id,

            form.assignmentUserId,

            form.deadlineDate,
          );
        } catch (
          assignmentError
        ) {
          console.error(
            'Task created but assignment failed:',

            assignmentError,
          );


          window.alert(
            assignmentError instanceof
              ApiError
              ? (
                  uiText(isArabic, 'text0741', { value0: assignmentError.message })
                )
              : (
                  uiText(isArabic, 'text0552')
                ),
          );


          router.push(
            `/tasks/view?id=${task.id}`,
          );

          return;
        }
      }


      /*
       * ======================================================
       * ATTACHMENTS
       * ======================================================
       */

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


          window.alert(
            attachmentError instanceof
              ApiError
              ? (
                  uiText(isArabic, 'text0742', { value0: attachmentError.message })
                )
              : (
                  uiText(isArabic, 'text0553')
                ),
          );
        }
      }


      router.push(
        `/tasks/view?id=${task.id}`,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0554'),
      );


      setSubmitting(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * SUMMARY
   * ==========================================================
   */

  const selectedAssignee =
    assignableUsers.find(
      (
        item,
      ) =>
        item.id ===
        form.assignmentUserId,
    );


  const selectedApprover =
    approvers.find(
      (
        item,
      ) =>
        item.id ===
        form.approverId,
    );


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="
        mx-auto
        max-w-7xl
        pb-16
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

      <div
        className="
          mb-6
          flex
          flex-col
          gap-4
          sm:flex-row
          sm:items-end
          sm:justify-between
        "
      >
        <div>
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="
              mb-3
              inline-flex
              items-center
              gap-2
              text-sm
              text-slate-500
              transition
              hover:text-brand-700
            "
          >
            {isArabic
              ? '→'
              : '←'}

            {uiText(isArabic, 'text0111')}
          </button>


          <h1
            className="
              text-xl
              font-semibold
              tracking-tight
              text-slate-900
            "
          >
            {uiText(isArabic, 'text0174')}
          </h1>


          <p
            className="
              mt-1
              text-sm
              text-slate-500
            "
          >
            {uiText(isArabic, 'text0555')}
          </p>
        </div>


        <div
          className="
            flex
            items-center
            gap-2
            rounded-full
            border
            border-slate-200
            bg-white
            px-3
            py-1.5
          "
        >
          <span
            className="
              text-xs
              text-slate-400
            "
          >
            {uiText(isArabic, 'text0175')}
          </span>

          <StatusBadge
            value="Pending"
            listType="task_status"
          />
        </div>
      </div>


      {/*
       * ======================================================
       * ERROR
       * ======================================================
       */}

      {error && (
        <div
          className="
            mb-5
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700
          "
        >
          {error}
        </div>
      )}


      <form
        onSubmit={
          handleSubmit
        }
      >
        <div
          className="
            grid
            gap-6
            xl:grid-cols-[minmax(0,1fr)_380px]
          "
        >
          {/*
           * ==================================================
           * LEFT
           * ==================================================
           */}

          <div
            className="
              space-y-6
            "
          >
            {/*
             * =================================================
             * DETAILS
             * =================================================
             */}

            <section
              className="
                card
                p-6
              "
            >
              <SectionHeader
                title={
                  uiText(isArabic, 'text0176')
                }
                description={
                  uiText(isArabic, 'text0556')
                }
              />


              <div
                className="
                  mt-6
                  space-y-5
                "
              >
                <div>
                  <FieldLabel
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0177')}
                  </FieldLabel>


                  <input
                    className="
                      input
                      text-base
                    "
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

                        event.target.value,
                      )
                    }
                  />
                </div>


                <div>
                  <FieldLabel
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0438')}
                  </FieldLabel>


                  <textarea
                    className="
                      input
                      min-h-[140px]
                      resize-y
                    "
                    rows={
                      5
                    }
                    value={
                      form.description
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'description',

                        event.target.value,
                      )
                    }
                  />
                </div>
              </div>
            </section>


            {/*
             * =================================================
             * ATTACHMENTS
             * =================================================
             */}

            <section
              className="
                card
                overflow-hidden
              "
            >
              <div
                className="
                  border-b
                  border-slate-100
                  p-6
                "
              >
                <SectionHeader
                  title={
                    uiText(isArabic, 'text0178')
                  }
                  description={
                    uiText(isArabic, 'text0557')
                  }
                />
              </div>


              {/*
               * ===============================================
               * ASSIGNEE DOWNLOAD PERMISSION
               * ===============================================
               */}

              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-5
                  border-b
                  border-slate-100
                  bg-slate-50/50
                  px-6
                  py-5
                "
              >
                <div>
                  <div
                    className="
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    {uiText(isArabic, 'text0179')}
                  </div>

                  <p
                    className="
                      mt-1
                      text-xs
                      leading-5
                      text-slate-400
                    "
                  >
                    {uiText(isArabic, 'text0558')}
                  </p>
                </div>


                <ToggleSwitch
                  checked={
                    form.assigneeCanDownloadAttachments
                  }
                  label={
                    uiText(isArabic, 'text0180')
                  }
                  onChange={(
                    checked,
                  ) =>
                    set(
                      'assigneeCanDownloadAttachments',

                      checked,
                    )
                  }
                />
              </div>


              <div
                className="
                  p-6
                "
              >
                <label
                  className={`
                    flex
                    cursor-pointer
                    flex-col
                    items-center
                    justify-center
                    rounded-xl
                    border-2
                    border-dashed
                    px-6
                    py-10
                    text-center
                    transition
                    ${
                      dragOver
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/30'
                    }
                  `}
                  onDragOver={(
                    event,
                  ) => {
                    event.preventDefault();

                    setDragOver(
                      true,
                    );
                  }}
                  onDragLeave={() =>
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
                      event.dataTransfer.files.length
                    ) {
                      addFiles(
                        event.dataTransfer.files,
                      );
                    }
                  }}
                >
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      items-center
                      justify-center
                      rounded-xl
                      bg-white
                      text-xl
                      text-brand-600
                      shadow-sm
                    "
                  >
                    ↑
                  </div>


                  <div
                    className="
                      mt-3
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    {uiText(isArabic, 'text0559')}
                  </div>


                  <div
                    className="
                      mt-1
                      text-xs
                      text-slate-400
                    "
                  >
                    {uiText(isArabic, 'text0560')}
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
                        event.target.files?.length
                      ) {
                        addFiles(
                          event.target.files,
                        );
                      }


                      /*
                       * Allows selecting the same file again
                       * after it has been removed from the list.
                       */
                      event.target.value =
                        '';
                    }}
                  />
                </label>


                {/*
                 * =============================================
                 * SELECTED FILE ROWS
                 * =============================================
                 *
                 * Every selected file gets its own row,
                 * regardless of file type.
                 * =============================================
                 */}

                {files.length >
                  0 && (
                  <div
                    className="
                      mt-4
                      overflow-hidden
                      rounded-xl
                      border
                      border-slate-200
                    "
                  >
                    {files.map(
                      (
                        file,
                        index,
                      ) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="
                            flex
                            items-center
                            gap-3
                            border-b
                            border-slate-100
                            bg-white
                            px-4
                            py-3
                            last:border-0
                          "
                        >
                          <span
                            className="
                              badge
                              shrink-0
                              bg-slate-100
                              text-slate-600
                            "
                          >
                            {getFileTypeLabel(
                              file.type,

                              file.name,
                            )}
                          </span>


                          <div
                            className="
                              min-w-0
                              flex-1
                            "
                          >
                            <div
                              className="
                                truncate
                                text-sm
                                font-medium
                                text-slate-700
                              "
                              title={
                                file.name
                              }
                            >
                              {
                                file.name
                              }
                            </div>

                            <div
                              className="
                                mt-0.5
                                text-xs
                                text-slate-400
                              "
                            >
                              {formatFileSize(
                                file.size,
                              )}
                            </div>
                          </div>


                          <button
                            type="button"
                            disabled={
                              submitting
                            }
                            onClick={() =>
                              removeFile(
                                index,
                              )
                            }
                            title={
                              uiText(isArabic, 'text0181')
                            }
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              text-red-500
                              transition
                              hover:bg-red-50
                              hover:text-red-700
                              disabled:cursor-not-allowed
                              disabled:opacity-40
                            "
                          >
                            ✕
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}


                {files.length >
                  0 && (
                  <div
                    className="
                      mt-3
                      text-xs
                      text-slate-400
                    "
                  >
                    <span
                      className="
                        font-semibold
                        text-slate-600
                      "
                    >
                      {files.length}
                    </span>{' '}

                    {isArabic
                      ? 'ملف محدد'
                      : (
                          files.length ===
                          1
                            ? 'file selected'
                            : 'files selected'
                        )}
                  </div>
                )}
              </div>
            </section>


            {/*
             * =================================================
             * BUDGET — TOGGLE
             * =================================================
             */}

            <section
              className="
                card
                overflow-hidden
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-5
                  p-6
                "
              >
                <SectionHeader
                  title={
                    uiText(isArabic, 'text0150')
                  }
                  description={
                    uiText(isArabic, 'text0182')
                  }
                />


                <ToggleSwitch
                  checked={
                    form.needsBudget
                  }
                  label={
                    uiText(isArabic, 'text0183')
                  }
                  onChange={(
                    checked,
                  ) => {
                    set(
                      'needsBudget',

                      checked,
                    );


                    if (
                      !checked
                    ) {
                      set(
                        'budgetMin',
                        '',
                      );

                      set(
                        'budgetMax',
                        '',
                      );

                      set(
                        'budgetCurrency',
                        'SAR',
                      );
                    }
                  }}
                />
              </div>


              {form.needsBudget && (
                <div
                  className="
                    border-t
                    border-slate-100
                    bg-slate-50/50
                    p-6
                  "
                >
                  <div
                    className="
                      grid
                      gap-4
                      sm:grid-cols-3
                    "
                  >
                    <div>
                      <FieldLabel
                        isArabic={
                          isArabic
                        }
                      >
                        {uiText(isArabic, 'text0184')}
                      </FieldLabel>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={
                          form.budgetMin
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'budgetMin',

                            event.target.value,
                          )
                        }
                      />
                    </div>


                    <div>
                      <FieldLabel
                        isArabic={
                          isArabic
                        }
                      >
                        {uiText(isArabic, 'text0185')}
                      </FieldLabel>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={
                          form.budgetMax
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'budgetMax',

                            event.target.value,
                          )
                        }
                      />
                    </div>


                    <div>
                      <FieldLabel
                        isArabic={
                          isArabic
                        }
                      >
                        {uiText(isArabic, 'text0561')}
                      </FieldLabel>

                      <select
                        className="input"
                        value={
                          form.budgetCurrency
                        }
                        onChange={(
                          event,
                        ) =>
                          set(
                            'budgetCurrency',

                            event.target.value,
                          )
                        }
                      >
                        <option value="SAR">
                          {uiText(isArabic, 'text1040')}
                        </option>

                        <option value="SYP">
                          {uiText(isArabic, 'text1039')}
                        </option>

                        <option value="USD">
                          {uiText(isArabic, 'text1041')}
                        </option>

                        <option value="EUR">
                          {uiText(isArabic, 'text1042')}
                        </option>

                        <option value="AED">
                          {uiText(isArabic, 'text1043')}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>


          {/*
           * ==================================================
           * SIDEBAR
           * ==================================================
           */}

          <aside
            className="
              space-y-6
            "
          >
            {/*
             * =================================================
             * CLASSIFICATION
             * =================================================
             */}

            <section
              className="
                card
                p-5
              "
            >
              <SectionHeader
                title={
                  uiText(isArabic, 'text0186')
                }
              />


              <div
                className="
                  mt-5
                  space-y-4
                "
              >
                <div>
                  <FieldLabel
                    isArabic={
                      isArabic
                    }
                    action={
                      <AddButton
                        isArabic={
                          isArabic
                        }
                        onClick={() =>
                          openQuickAdd(
                            'task_type',
                          )
                        }
                      />
                    }
                  >
                    {uiText(isArabic, 'text0163')}
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

                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0187')}
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
                    isArabic={
                      isArabic
                    }
                    action={
                      <AddButton
                        isArabic={
                          isArabic
                        }
                        onClick={() =>
                          openQuickAdd(
                            'task_priority',
                          )
                        }
                      />
                    }
                  >
                    {uiText(isArabic, 'text0297')}
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

                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0187')}
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
                </div>


                <div>
                  <FieldLabel
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0562')}
                  </FieldLabel>


                  <div
                    className="
                      grid
                      grid-cols-3
                      sm:grid-cols-6
                      gap-2
                    "
                  >
                    {COLORS.map(
                      (
                        color,
                      ) => (
                        <button
                          key={
                            color.value
                          }
                          type="button"
                          title={
                            color.label
                          }
                          onClick={() =>
                            set(
                              'color',

                              color.value,
                            )
                          }
                          className={`
                            relative
                            h-9
                            rounded-lg
                            border-2
                            transition
                            ${
                              form.color ===
                              color.value
                                ? 'scale-105 border-slate-800 shadow-sm'
                                : 'border-transparent hover:scale-105'
                            }
                          `}
                          style={{
                            backgroundColor:
                              color.value,
                          }}
                        >
                          {form.color ===
                            color.value && (
                            <span
                              className="
                                absolute
                                inset-0
                                flex
                                items-center
                                justify-center
                                text-sm
                                font-bold
                                text-white
                              "
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </section>


            {/*
             * =================================================
             * ORGANIZATION
             * =================================================
             */}

            <section
              className="
                card
                p-5
              "
            >
              <SectionHeader
                title={
                  uiText(isArabic, 'text0518')
                }
              />


              {selectedParent && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-brand-100
                    bg-brand-50/50
                    px-3
                    py-3
                    text-xs
                    leading-5
                    text-brand-700
                  "
                >
                  {uiText(isArabic, 'text0563')}
                </div>
              )}


              <div
                className="
                  mt-5
                  space-y-4
                "
              >
                <div>
                  <FieldLabel
                    isArabic={
                      isArabic
                    }
                    action={
                      isAdmin &&
                      !selectedParent
                        ? (
                            <AddButton
                              isArabic={
                                isArabic
                              }
                              onClick={() =>
                                openQuickAdd(
                                  'department',
                                )
                              }
                            />
                          )
                        : undefined
                    }
                  >
                    {uiText(isArabic, 'text0374')}
                  </FieldLabel>


                  <select
                    className="input"
                    required
                    disabled={
                      Boolean(
                        selectedParent,
                      )
                    }
                    value={
                      form.departmentId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'departmentId',

                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0187')}
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
                    isArabic={
                      isArabic
                    }
                    action={
                      isAdmin &&
                      !selectedParent
                        ? (
                            <AddButton
                              isArabic={
                                isArabic
                              }
                              onClick={() =>
                                openQuickAdd(
                                  'branch',
                                )
                              }
                            />
                          )
                        : undefined
                    }
                  >
                    {uiText(isArabic, 'text0371')}
                  </FieldLabel>


                  <select
                    className="input"
                    disabled={
                      Boolean(
                        selectedParent,
                      )
                    }
                    value={
                      form.branchId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'branchId',

                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0430')}
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
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0432')}
                  </FieldLabel>


                  <select
                    className="input"
                    disabled={
                      Boolean(
                        selectedParent,
                      )
                    }
                    value={
                      form.projectId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'projectId',

                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0564')}
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


            {/*
             * =================================================
             * PEOPLE
             * =================================================
             */}

            <section
              className="
                card
                p-5
              "
            >
              <SectionHeader
                title={
                  uiText(isArabic, 'text0145')
                }
                description={
                  uiText(isArabic, 'text0565')
                }
              />


              {peopleError && (
                <div
                  className="
                    mt-4
                    rounded-lg
                    bg-red-50
                    p-3
                    text-xs
                    text-red-600
                  "
                >
                  {peopleError}
                </div>
              )}


              <div
                className="
                  mt-5
                  space-y-4
                "
              >
                <div>
                  <FieldLabel
                    optional
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0188')}
                  </FieldLabel>


                  <AvatarSelect
                    users={assignableUsers}
                    value={form.assignmentUserId}
                    onChange={(value) =>
                      set('assignmentUserId', value)
                    }
                    placeholder={uiText(isArabic, 'text0189')}
                    disabled={Boolean(selectedParent)}
                  />


                  {form.assignmentUserId ? (
                    <p
                      className="
                        mt-2
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      {uiText(isArabic, 'text0566')}
                    </p>
                  ) : (
                    <p
                      className="
                        mt-2
                        text-xs
                        text-slate-400
                      "
                    >
                      {uiText(isArabic, 'text0567')}
                    </p>
                  )}
                </div>


                {/*
                 * ===============================================
                 * APPROVAL — TOGGLE
                 * ===============================================
                 */}

                <div
                  className={`
                    overflow-hidden
                    rounded-xl
                    border
                    transition
                    ${
                      form.needsApproval
                        ? 'border-brand-200 bg-brand-50/20'
                        : 'border-slate-200 bg-white'
                    }
                  `}
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      gap-4
                      p-4
                    "
                  >
                    <div>
                      <div
                        className="
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {uiText(isArabic, 'text0568')}
                      </div>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-slate-400
                        "
                      >
                        {uiText(isArabic, 'text0569')}
                      </p>
                    </div>


                    <ToggleSwitch
                      checked={
                        form.needsApproval
                      }
                      label={
                        uiText(isArabic, 'text0570')
                      }
                      onChange={(
                        checked,
                      ) => {
                        set(
                          'needsApproval',

                          checked,
                        );


                        if (
                          !checked
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
                    <div
                      className="
                        border-t
                        border-brand-100
                        bg-white
                        p-4
                      "
                    >
                      <FieldLabel
                        isArabic={
                          isArabic
                        }
                      >
                        {uiText(isArabic, 'text0511')}
                      </FieldLabel>


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

                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          {uiText(isArabic, 'text0571')}
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

                              {item.role.name ===
                              'ADMIN'
                                ? ' — Admin'
                                : ''}
                            </option>
                          ),
                        )}
                      </select>


                      <p
                        className="
                          mt-2
                          text-xs
                          text-slate-400
                        "
                      >
                        {uiText(isArabic, 'text0572')}
                      </p>
                    </div>
                  )}
                </div>


                {/*
                 * ===============================================
                 * PARENT TASK
                 * ===============================================
                 */}

                <div>
                  <FieldLabel
                    optional
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0519')}
                  </FieldLabel>


                  <select
                    className="input"
                    value={
                      form.parentTaskId
                    }
                    onChange={(
                      event,
                    ) =>
                      handleParentTaskChange(
                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {uiText(isArabic, 'text0190')}
                    </option>


                    {parentTaskOptions.map(
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
                          {item.title}
                        </option>
                      ),
                    )}
                  </select>


                  {selectedParent && (
                    <div
                      className="
                        mt-2
                        rounded-lg
                        bg-brand-50
                        px-3
                        py-2
                        text-xs
                        leading-5
                        text-brand-700
                      "
                    >
                      {uiText(isArabic, 'text0573')}
                    </div>
                  )}
                </div>
              </div>
            </section>


            {/*
             * =================================================
             * SCHEDULE
             * =================================================
             */}

            <section
              className="
                card
                p-5
              "
            >
              <SectionHeader
                title={
                  uiText(isArabic, 'text0147')
                }
              />


              <div
                className="
                  mt-5
                  space-y-4
                "
              >
                <div>
                  <FieldLabel
                    optional
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0415')}
                  </FieldLabel>


                  <input
                    type="date"
                    className="input"
                    min={
                      selectedParent?.startDate ||
                      undefined
                    }
                    max={
                      form.deadlineDate ||
                      selectedParent?.deadlineDate ||
                      undefined
                    }
                    value={
                      form.startDate
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'startDate',

                        event.target.value,
                      )
                    }
                  />
                </div>


                <div>
                  <FieldLabel
                    optional
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0148')}
                  </FieldLabel>


                  <input
                    type="date"
                    className="input"
                    required
                    min={
                      form.startDate ||
                      selectedParent?.startDate ||
                      undefined
                    }
                    max={
                      selectedParent?.deadlineDate ||
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

                        event.target.value,
                      )
                    }
                  />


                  {selectedParent?.deadlineDate && (
                    <p
                      className="
                        mt-2
                        text-xs
                        text-slate-400
                      "
                    >
                      {uiText(isArabic, 'text0743', { value0: selectedParent.deadlineDate })}
                    </p>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>


        {/*
         * ====================================================
         * SUMMARY
         * ====================================================
         */}

        <section
          className="
            card
            mt-6
            overflow-hidden
          "
        >
          <div
            className="
              border-b
              border-slate-100
              bg-slate-50
              px-6
              py-4
            "
          >
            <SectionHeader
              title={
                uiText(isArabic, 'text0574')
              }
            />
          </div>


          <div
            className="
              grid
              gap-5
              p-6
              sm:grid-cols-2
              sm:grid-cols-2
              lg:grid-cols-3
              2xl:grid-cols-6
            "
          >
            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {uiText(isArabic, 'text0191')}
              </div>

              <div
                className="
                  mt-2
                "
              >
                <StatusBadge
                  value="Pending"
                  listType="task_status"
                />
              </div>
            </div>


            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {uiText(isArabic, 'text0117')}
              </div>

              <div
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                {selectedAssignee
                  ? (
                      uiText(isArabic, 'text0744', { value0: selectedAssignee.fullName })
                    )
                  : (
                      uiText(isArabic, 'text0115')
                    )}
              </div>
            </div>


            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {uiText(isArabic, 'text0509')}
              </div>

              <div
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                {form.needsApproval
                  ? (
                      isArabic
                        ? `مطلوبة · ${selectedApprover?.fullName || 'لم يتم الاختيار'}`
                        : `Required · ${selectedApprover?.fullName || 'No approver'}`
                    )
                  : (
                      uiText(isArabic, 'text0575')
                    )}
              </div>
            </div>


            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {uiText(isArabic, 'text0148')}
              </div>

              <div
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                {form.deadlineDate ||
                  (
                    uiText(isArabic, 'text0192')
                  )}
              </div>
            </div>


            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {uiText(isArabic, 'text0178')}
              </div>

              <div
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                {files.length}{' '}

                {isArabic
                  ? 'ملف'
                  : (
                      files.length ===
                      1
                        ? 'file'
                        : 'files'
                    )}
              </div>

              <div
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                {form.assigneeCanDownloadAttachments
                  ? (
                      uiText(isArabic, 'text0193')
                    )
                  : (
                      uiText(isArabic, 'text0576')
                    )}
              </div>
            </div>


            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {uiText(isArabic, 'text0150')}
              </div>

              <div
                className="
                  mt-2
                  text-sm
                  font-medium
                  text-slate-700
                "
              >
                {form.needsBudget
                  ? `${form.budgetMin || '—'} – ${form.budgetMax || '—'} ${form.budgetCurrency}`
                  : (
                      uiText(isArabic, 'text0575')
                    )}
              </div>
            </div>
          </div>
        </section>


        {/*
         * ====================================================
         * ACTION BAR
         * ====================================================
         */}

        <div
          className="
            sticky
            bottom-4
            z-20
            mt-6
          "
        >
          <div
            className="
              flex
              justify-end
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white/95
              p-4
              shadow-lg
              backdrop-blur
            "
          >
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
              {uiText(isArabic, 'text0080')}
            </button>


            <button
              type="submit"
              className="btn-primary"
              disabled={
                submitting
              }
            >
              {submitting
                ? (
                    uiText(isArabic, 'text0439')
                  )
                : (
                    uiText(isArabic, 'text0577')
                  )}
            </button>
          </div>
        </div>
      </form>


      {/*
       * ======================================================
       * QUICK ADD MODAL
       * ======================================================
       */}

      {quickAdd.open && (
        <div
          className="
            fixed
            inset-0
            z-[150]
            flex
            items-center
            justify-center
            bg-slate-950/40
            p-4
            backdrop-blur-sm
          "
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
          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                border-b
                border-slate-100
                p-6
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div>
                  <h2
                    className="
                      text-lg
                      font-semibold
                      text-slate-900
                    "
                  >
                    {quickAddTitle()}
                  </h2>

                  <p
                    className="
                      mt-1
                      text-sm
                      leading-6
                      text-slate-500
                    "
                  >
                    {uiText(isArabic, 'text0578')}
                  </p>
                </div>


                <button
                  type="button"
                  disabled={
                    quickAdd.saving
                  }
                  onClick={
                    closeQuickAdd
                  }
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                >
                  ✕
                </button>
              </div>
            </div>


            <div
              className="
                space-y-4
                p-6
              "
            >
              <div>
                <FieldLabel
                  isArabic={
                    isArabic
                  }
                >
                  {uiText(isArabic, 'text0070')}
                </FieldLabel>


                <input
                  className="input"
                  autoFocus
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
                          event.target.value,
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
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0085')}
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
                            event.target.value,
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
                    isArabic={
                      isArabic
                    }
                  >
                    {uiText(isArabic, 'text0463')}
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
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              )}


              {quickAdd.error && (
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    px-4
                    py-3
                    text-sm
                    text-red-600
                  "
                >
                  {
                    quickAdd.error
                  }
                </div>
              )}
            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-slate-100
                bg-slate-50/70
                p-4
              "
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  quickAdd.saving
                }
                onClick={
                  closeQuickAdd
                }
              >
                {uiText(isArabic, 'text0080')}
              </button>


              <button
                type="button"
                className="btn-primary"
                disabled={
                  quickAdd.saving ||
                  !quickAdd.label.trim()
                }
                onClick={
                  saveQuickAdd
                }
              >
                {quickAdd.saving
                  ? (
                      uiText(isArabic, 'text0090')
                    )
                  : (
                      uiText(isArabic, 'text0169')
                    )}
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

export default function NewTaskPage() {
  return (
    <ProtectedRoute>
      <NewTaskContent />
    </ProtectedRoute>
  );
}

