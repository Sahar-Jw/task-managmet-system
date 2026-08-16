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
            {isArabic
              ? '(اختياري)'
              : '(optional)'}
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
      {isArabic
        ? 'إضافة'
        : 'Add'}
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
          inline-block
          h-5
          w-5
          rounded-full
          bg-white
          shadow-sm
          transition-transform
          duration-200
          ${
            checked
              ? 'translate-x-6'
              : 'translate-x-1'
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
    useState({
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
        '',

      parentTaskId:
        '',

      /*
       * Assignment is intentionally separate from Task creation.
       */
      assignmentUserId:
        '',

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
        '',

      deadlineDate:
        '',
    });


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
              : isArabic
                ? 'تعذر تحميل المستخدمين.'
                : 'Could not load the user directory.',
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
        : TasksApi.mine({
            limit:
              '100',
          });


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


  /*
   * Admins cannot be task assignees.
   */
  const assignableUsers =
    activeUsers.filter(
      (
        item,
      ) =>
        item.role.name !==
        'ADMIN',
    );


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
     * This matches the backend validation we added.
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
    setFiles(
      (
        current,
      ) => {
        const next =
          Array.from(
            incoming,
          ).filter(
            (
              file,
            ) =>
              !current.some(
                (
                  existing,
                ) =>
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
        (
          current,
        ) => ({
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
              : isArabic
                ? 'تعذر إضافة العنصر.'
                : 'Could not add the item.',
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
      return isArabic
        ? 'يرجى إدخال عنوان المهمة.'
        : 'Please enter a task title.';
    }


    if (
      !form.taskType
    ) {
      return isArabic
        ? 'يرجى اختيار نوع المهمة.'
        : 'Please choose a task type.';
    }


    if (
      !form.priority
    ) {
      return isArabic
        ? 'يرجى اختيار الأهمية.'
        : 'Please choose an importance level.';
    }


    if (
      !form.departmentId
    ) {
      return isArabic
        ? 'يرجى اختيار القسم.'
        : 'Please choose a department.';
    }


    if (
      form.startDate &&
      form.deadlineDate &&
      form.deadlineDate <
        form.startDate
    ) {
      return isArabic
        ? 'الموعد النهائي لا يمكن أن يكون قبل تاريخ البدء.'
        : 'Deadline cannot be before the start date.';
    }


    if (
      selectedParent?.startDate &&
      form.startDate &&
      form.startDate <
        selectedParent.startDate
    ) {
      return isArabic
        ? 'المهمة الفرعية لا يمكن أن تبدأ قبل المهمة الرئيسية.'
        : 'A subtask cannot start before its parent task.';
    }


    if (
      selectedParent?.deadlineDate &&
      form.deadlineDate &&
      form.deadlineDate >
        selectedParent.deadlineDate
    ) {
      return isArabic
        ? 'موعد المهمة الفرعية لا يمكن أن يتجاوز موعد المهمة الرئيسية.'
        : 'A subtask deadline cannot exceed its parent task deadline.';
    }


    if (
      form.needsApproval &&
      !form.approverId
    ) {
      return isArabic
        ? 'يرجى اختيار الموافق.'
        : 'Please choose an approver.';
    }


    if (
      form.needsApproval &&
      form.assignmentUserId &&
      form.approverId ===
        form.assignmentUserId
    ) {
      return isArabic
        ? 'المكلف والموافق لا يمكن أن يكونا نفس المستخدم.'
        : 'The assignee and approver cannot be the same person.';
    }


    if (
      form.needsBudget &&
      (
        !form.budgetMin ||
        !form.budgetMax
      )
    ) {
      return isArabic
        ? 'أدخل الحد الأدنى والأعلى للميزانية.'
        : 'Enter both minimum and maximum budget values.';
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
      return isArabic
        ? 'الحد الأدنى للميزانية لا يمكن أن يتجاوز الحد الأعلى.'
        : 'Budget minimum cannot exceed maximum.';
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

            form.deadlineDate ||
              undefined,
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
                  isArabic
                    ? `تم إنشاء المهمة، لكن تعذر التكليف: ${assignmentError.message}`
                    : `Task was created, but the assignment could not be created: ${assignmentError.message}`
                )
              : (
                  isArabic
                    ? 'تم إنشاء المهمة، لكن تعذر التكليف. يمكنك التكليف من تفاصيل المهمة.'
                    : 'Task was created, but the assignment could not be created. You can assign it from Task Details.'
                ),
          );


          router.push(
            `/tasks/${task.id}`,
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
        }
      }


      router.push(
        `/tasks/${task.id}`,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : isArabic
            ? 'تعذر إنشاء المهمة.'
            : 'Could not create the task.',
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

            {isArabic
              ? 'رجوع'
              : 'Back'}
          </button>


          <h1
            className="
              text-2xl
              font-semibold
              tracking-tight
              text-slate-900
            "
          >
            {isArabic
              ? 'مهمة جديدة'
              : 'New Task'}
          </h1>


          <p
            className="
              mt-1
              text-sm
              text-slate-500
            "
          >
            {isArabic
              ? 'أنشئ المهمة وحدد تفاصيلها وسير العمل.'
              : 'Create the task and configure its workflow.'}
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
            {isArabic
              ? 'الحالة الأولية'
              : 'Initial status'}
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
                  isArabic
                    ? 'تفاصيل المهمة'
                    : 'Task Details'
                }
                description={
                  isArabic
                    ? 'أدخل المعلومات الأساسية للمهمة.'
                    : 'Add the main information for the task.'
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
                    {isArabic
                      ? 'عنوان المهمة'
                      : 'Task title'}
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
                    optional
                    isArabic={
                      isArabic
                    }
                  >
                    {isArabic
                      ? 'الوصف'
                      : 'Description'}
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
                p-6
              "
            >
              <SectionHeader
                title={
                  isArabic
                    ? 'المرفقات'
                    : 'Attachments'
                }
                description={
                  isArabic
                    ? 'أضف الملفات المطلوبة للمهمة.'
                    : 'Add any files needed for this task.'
                }
              />


              <label
                className={`
                  mt-5
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
                  {isArabic
                    ? 'اسحب الملفات هنا أو اضغط للاختيار'
                    : 'Drop files here or click to browse'}
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


                    event.target.value =
                      '';
                  }}
                />
              </label>


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
                        key={`${file.name}-${index}`}
                        className="
                          flex
                          items-center
                          gap-3
                          border-b
                          border-slate-100
                          px-4
                          py-3
                          last:border-0
                        "
                      >
                        <span
                          className="
                            badge
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
                          >
                            {
                              file.name
                            }
                          </div>

                          <div
                            className="
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
                          onClick={() =>
                            removeFile(
                              index,
                            )
                          }
                          className="
                            flex
                            h-8
                            w-8
                            items-center
                            justify-center
                            rounded-lg
                            text-red-500
                            transition
                            hover:bg-red-50
                            hover:text-red-700
                          "
                        >
                          ✕
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
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
                    isArabic
                      ? 'الميزانية'
                      : 'Budget'
                  }
                  description={
                    isArabic
                      ? 'فعّل هذا الخيار فقط إذا كانت المهمة تحتاج إلى ميزانية.'
                      : 'Enable only when this task needs a budget.'
                  }
                />


                <ToggleSwitch
                  checked={
                    form.needsBudget
                  }
                  label={
                    isArabic
                      ? 'تفعيل الميزانية'
                      : 'Enable budget'
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
                        {isArabic
                          ? 'الحد الأدنى'
                          : 'Minimum'}
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
                        {isArabic
                          ? 'الحد الأعلى'
                          : 'Maximum'}
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
                        {isArabic
                          ? 'العملة'
                          : 'Currency'}
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
                          SAR
                        </option>

                        <option value="USD">
                          USD
                        </option>

                        <option value="EUR">
                          EUR
                        </option>

                        <option value="AED">
                          AED
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
                  isArabic
                    ? 'التصنيف'
                    : 'Classification'
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
                      isAdmin
                        ? (
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
                          )
                        : undefined
                    }
                  >
                    {isArabic
                      ? 'نوع المهمة'
                      : 'Task type'}
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
                      {isArabic
                        ? 'اختر…'
                        : 'Select…'}
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
                      isAdmin
                        ? (
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
                          )
                        : undefined
                    }
                  >
                    {isArabic
                      ? 'الأهمية'
                      : 'Importance'}
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
                      {isArabic
                        ? 'اختر…'
                        : 'Select…'}
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
                    {isArabic
                      ? 'لون المهمة'
                      : 'Task color'}
                  </FieldLabel>


                  <div
                    className="
                      grid
                      grid-cols-6
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
                  isArabic
                    ? 'التنظيم'
                    : 'Organization'
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
                  {isArabic
                    ? 'هذه مهمة فرعية، لذلك القسم والفرع والمشروع موروثة من المهمة الرئيسية.'
                    : 'This is a subtask, so Department, Branch and Project are inherited from the parent task.'}
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
                    {isArabic
                      ? 'القسم'
                      : 'Department'}
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
                      {isArabic
                        ? 'اختر…'
                        : 'Select…'}
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
                    {isArabic
                      ? 'الفرع'
                      : 'Branch'}
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
                      {isArabic
                        ? 'بدون فرع'
                        : 'No branch'}
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
                    {isArabic
                      ? 'المشروع'
                      : 'Project'}
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
                      {isArabic
                        ? 'بدون مشروع'
                        : 'No project'}
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
                  isArabic
                    ? 'الأشخاص'
                    : 'People'
                }
                description={
                  isArabic
                    ? 'يمكنك التكليف الآن أو ترك المهمة بدون تكليف.'
                    : 'Assign now or leave the task unassigned and assign it later from Task Details.'
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
                    {isArabic
                      ? 'تكليف إلى'
                      : 'Assign to'}
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

                        event.target.value,
                      )
                    }
                  >
                    <option value="">
                      {isArabic
                        ? 'بدون تكليف حالياً'
                        : 'Leave unassigned'}
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


                  {form.assignmentUserId ? (
                    <p
                      className="
                        mt-2
                        text-xs
                        leading-5
                        text-slate-500
                      "
                    >
                      {isArabic
                        ? 'سيستلم المستخدم المهمة بحالة انتظار القبول ويمكنه قبولها أو رفضها.'
                        : 'This user will receive the task as Pending Acceptance and can accept or reject it.'}
                    </p>
                  ) : (
                    <p
                      className="
                        mt-2
                        text-xs
                        text-slate-400
                      "
                    >
                      {isArabic
                        ? 'يمكن تكليف المهمة لاحقاً من صفحة تفاصيل المهمة.'
                        : 'You can assign the task later from Task Details.'}
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
                        {isArabic
                          ? 'تحتاج موافقة'
                          : 'Needs approval'}
                      </div>

                      <p
                        className="
                          mt-1
                          text-xs
                          leading-5
                          text-slate-400
                        "
                      >
                        {isArabic
                          ? 'يتطلب إكمال المهمة موافقة مستخدم آخر.'
                          : 'Require another user to approve final completion.'}
                      </p>
                    </div>


                    <ToggleSwitch
                      checked={
                        form.needsApproval
                      }
                      label={
                        isArabic
                          ? 'تفعيل الموافقة'
                          : 'Require approval'
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
                        {isArabic
                          ? 'الموافق'
                          : 'Approver'}
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
                          {isArabic
                            ? 'اختر الموافق…'
                            : 'Select approver…'}
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
                        {isArabic
                          ? 'المكلف بالمهمة لا يمكن أن يكون هو الموافق على نفس المهمة.'
                          : 'The task assignee cannot also approve the same task.'}
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
                    {isArabic
                      ? 'المهمة الرئيسية'
                      : 'Parent task'}
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
                      {isArabic
                        ? 'مهمة مستقلة'
                        : 'Standalone task'}
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
                          {isArabic
                            ? item.titleAr ||
                              item.titleEn
                            : item.titleEn ||
                              item.titleAr}
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
                      {isArabic
                        ? 'سيتم إنشاء هذه المهمة كمهمة فرعية ضمن المهمة الرئيسية المحددة.'
                        : 'This task will be created as a subtask of the selected parent.'}
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
                  isArabic
                    ? 'الجدول الزمني'
                    : 'Schedule'
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
                    {isArabic
                      ? 'تاريخ البدء'
                      : 'Start date'}
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
                    {isArabic
                      ? 'الموعد النهائي'
                      : 'Deadline'}
                  </FieldLabel>


                  <input
                    type="date"
                    className="input"
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
                      {isArabic
                        ? `يجب ألا يتجاوز موعد المهمة الرئيسية: ${selectedParent.deadlineDate}`
                        : `Must not exceed parent deadline: ${selectedParent.deadlineDate}`}
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
                isArabic
                  ? 'ملخص المهمة'
                  : 'Task Summary'
              }
            />
          </div>


          <div
            className="
              grid
              gap-5
              p-6
              sm:grid-cols-2
              lg:grid-cols-5
            "
          >
            <div>
              <div
                className="
                  text-xs
                  text-slate-400
                "
              >
                {isArabic
                  ? 'الحالة'
                  : 'Task status'}
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
                {isArabic
                  ? 'التكليف'
                  : 'Assignment'}
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
                      isArabic
                        ? `${selectedAssignee.fullName} · بانتظار القبول`
                        : `${selectedAssignee.fullName} · Pending Acceptance`
                    )
                  : (
                      isArabic
                        ? 'غير مسندة'
                        : 'Unassigned'
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
                {isArabic
                  ? 'الموافقة'
                  : 'Approval'}
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
                      isArabic
                        ? 'غير مطلوبة'
                        : 'Not required'
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
                {isArabic
                  ? 'الموعد النهائي'
                  : 'Deadline'}
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
                    isArabic
                      ? 'بدون موعد'
                      : 'No deadline'
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
                {isArabic
                  ? 'الميزانية'
                  : 'Budget'}
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
                      isArabic
                        ? 'غير مطلوبة'
                        : 'Not required'
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
              {isArabic
                ? 'إلغاء'
                : 'Cancel'}
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
                    isArabic
                      ? 'جاري الإنشاء…'
                      : 'Creating…'
                  )
                : (
                    isArabic
                      ? 'إنشاء المهمة'
                      : 'Create Task'
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
                    {isArabic
                      ? 'سيتم الحفظ باللغة المحددة حالياً فقط.'
                      : 'Saved only in the currently selected language.'}
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
                  {isArabic
                    ? 'الاسم'
                    : 'Name'}
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
                    {isArabic
                      ? 'الرمز'
                      : 'Code'}
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
                    {isArabic
                      ? 'العنوان'
                      : 'Address'}
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
                {isArabic
                  ? 'إلغاء'
                  : 'Cancel'}
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
                      isArabic
                        ? 'جاري الإضافة…'
                        : 'Adding…'
                    )
                  : (
                      isArabic
                        ? 'إضافة'
                        : 'Add'
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