// frontend/src/app/tasks/new/page.tsx

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
  SettingType,
  Task,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * CONSTANTS
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
 * These are the settings we allow the Admin to create
 * directly from the New Task page.
 */
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


/*
 * ============================================================
 * SMALL UI COMPONENTS
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
      className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition hover:text-brand-900"
    >
      <span className="text-base leading-none">
        +
      </span>

      Add
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


/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

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


  /*
   * ==========================================================
   * LOOKUP DATA
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

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


  /*
   * ==========================================================
   * TASK FORM
   * ==========================================================
   */

  const [
    form,
    setForm,
  ] = useState({
    /*
     * Main task content
     */
    title: '',
    description: '',

    /*
     * Classification
     */
    taskType: '',
    priority: '',
    color:
      COLORS[0].value,

    /*
     * Organization
     */
    branchId: '',
    departmentId: '',
    projectId: '',

    /*
     * Hierarchy
     */
    parentTaskId: '',

    /*
     * People
     */
    assignedToId: '',

    /*
     * Approval
     */
    needsApproval: false,
    approverId: '',

    /*
     * Budget
     */
    needsBudget: false,
    budgetMin: '',
    budgetMax: '',
    budgetCurrency: 'SAR',

    /*
     * Dates
     */
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
        [key]: value,
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
      const data =
        await BranchesApi.list();

      setBranches(
        data,
      );
    } catch {
      /*
       * Keep the form usable even if one lookup fails.
       */
    }
  }


  async function loadDepartments() {
    try {
      const data =
        await DepartmentsApi.list();

      setDepartments(
        data,
      );
    } catch {
      /*
       * Keep the form usable even if one lookup fails.
       */
    }
  }


  async function loadTaskTypes() {
    try {
      const data =
        await SettingsApi.list(
          'task_type',
          true,
        );

      setTaskTypes(
        data,
      );
    } catch {
      /*
       * Keep the form usable even if one lookup fails.
       */
    }
  }


  async function loadPriorities() {
    try {
      const data =
        await SettingsApi.list(
          'task_priority',
          true,
        );

      setPriorities(
        data,
      );
    } catch {
      /*
       * Keep the form usable even if one lookup fails.
       */
    }
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
        (result) => {
          setProjects(
            result.items,
          );
        },
      )
      .catch(
        () => {},
      );


    /*
     * --------------------------------------------------------
     * IMPORTANT APPROVER / ASSIGNEE FIX
     * --------------------------------------------------------
     *
     * The old page silently swallowed the Users request error
     * and then fell back to the current account only.
     *
     * That could make the approval dropdown look like it only
     * contained the Admin.
     *
     * We now:
     *
     * - request all active users,
     * - store them properly,
     * - surface an error if the directory does not load,
     * - still include the current logged-in account if needed.
     */
    UsersApi.list({
      limit: '200',
      isActive: 'true',
    })
      .then(
        (result) => {
          setUsers(
            result.items,
          );

          setPeopleError(
            '',
          );
        },
      )
      .catch(
        (err) => {
          setPeopleError(
            err instanceof ApiError
              ? err.message
              : 'Could not load the user directory.',
          );

          if (user) {
            setUsers([
              user,
            ]);
          }
        },
      );


    /*
     * Parent task selection:
     *
     * Admin -> all tasks
     * Regular User -> their own tasks
     */
    const taskRequest =
      isAdmin
        ? TasksApi.list({
            limit: '100',
            excludeArchived: 'true',
          })
        : TasksApi.mine({
            limit: '100',
          });

    taskRequest
      .then(
        (result) => {
          setTasks(
            result.items,
          );
        },
      )
      .catch(
        () => {},
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAdmin,
    user?.id,
  ]);


  /*
   * ==========================================================
   * INITIAL DEFAULTS FROM SETTINGS
   * ==========================================================
   *
   * Instead of assuming General / Medium always exist,
   * use the first available active item if necessary.
   */

  useEffect(() => {
    if (
      !form.taskType &&
      taskTypes.length >
        0
    ) {
      const general =
        taskTypes.find(
          (item) =>
            item.key ===
            'General',
        );

      set(
        'taskType',
        general?.key ??
          taskTypes[0].key ??
          '',
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    taskTypes,
  ]);


  useEffect(() => {
    if (
      !form.priority &&
      priorities.length >
        0
    ) {
      const medium =
        priorities.find(
          (item) =>
            item.key ===
            'Medium',
        );

      set(
        'priority',
        medium?.key ??
          priorities[0].key ??
          '',
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    priorities,
  ]);


  /*
   * ==========================================================
   * LANGUAGE-AWARE LOOKUPS
   * ==========================================================
   */

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
   * PEOPLE
   * ==========================================================
   */

  const activeUsers =
    useMemo(
      () => {
        const map =
          new Map<
            string,
            User
          >();

        for (
          const item
          of users
        ) {
          if (
            item.isActive
          ) {
            map.set(
              item.id,
              item,
            );
          }
        }

        /*
         * Ensure current user is represented if the API response
         * did not include them for some reason.
         */
        if (
          user?.isActive
        ) {
          map.set(
            user.id,
            user,
          );
        }

        return Array.from(
          map.values(),
        ).sort(
          (
            a,
            b,
          ) =>
            a.fullName.localeCompare(
              b.fullName,
            ),
        );
      },
      [
        users,
        user,
      ],
    );


  /*
   * Backend explicitly rejects Admin as a task assignee.
   *
   * So the Assignee dropdown must contain regular Users only.
   */
  const assignableUsers =
    activeUsers.filter(
      (item) =>
        item.role.name !==
        'ADMIN',
    );


  /*
   * Approvers may be Admin OR regular User.
   *
   * Do not limit this list to Admin.
   */
  const approvers =
    activeUsers.filter(
      (item) =>
        item.id !==
        form.assignedToId,
    );


  /*
   * If the selected approver later becomes the assignee,
   * automatically clear the approver so the user must
   * make an intentional valid choice.
   */
  useEffect(() => {
    if (
      form.assignedToId &&
      form.approverId ===
        form.assignedToId
    ) {
      set(
        'approverId',
        '',
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.assignedToId,
  ]);


  /*
   * ==========================================================
   * FILE HANDLING
   * ==========================================================
   */

  function addFiles(
    incoming:
      | FileList
      | File[],
  ) {
    const incomingArray =
      Array.from(
        incoming,
      );

    setFiles(
      (current) => {
        const uniqueFiles =
          incomingArray.filter(
            (file) =>
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
          ...uniqueFiles,
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


  /*
   * ==========================================================
   * QUICK ADD
   * ==========================================================
   */

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


  function getQuickAddTitle() {
    switch (
      quickAdd.type
    ) {
      case 'task_type':
        return isArabic
          ? 'إضافة نوع مهمة'
          : 'Add Task Type';

      case 'task_priority':
        return isArabic
          ? 'إضافة مستوى أهمية'
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

    const code =
      quickAdd.code.trim();

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
      /*
       * ------------------------------------------------------
       * TASK TYPE / PRIORITY
       * ------------------------------------------------------
       *
       * List settings use their code as their visible label.
       *
       * Save only the current language.
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
            created.key ??
              '',
          );
        } else {
          await loadPriorities();

          set(
            'priority',
            created.key ??
              '',
          );
        }
      }


      /*
       * ------------------------------------------------------
       * DEPARTMENT / BRANCH
       * ------------------------------------------------------
       *
       * This follows the language behavior from the Data tab:
       *
       * English UI -> only English fields.
       * Arabic UI -> only Arabic fields.
       *
       * The "Code" is optional in this popup.
       * If empty, use the visible name as the code too.
       */
      if (
        quickAdd.type ===
        'department'
      ) {
        const finalCode =
          code ||
          label;

        const created =
          await DepartmentsApi.create({
            valueType:
              'string',

            ...(isArabic
              ? {
                  codeAr:
                    finalCode,

                  valueAr:
                    label,
                }
              : {
                  codeEn:
                    finalCode,

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
        const finalCode =
          code ||
          label;

        const created =
          await BranchesApi.create({
            valueType:
              'string',

            ...(isArabic
              ? {
                  codeAr:
                    finalCode,

                  valueAr:
                    label,
                }
              : {
                  codeEn:
                    finalCode,

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
              : isArabic
                ? 'تعذر إضافة العنصر.'
                : 'Could not add the item.',
        }),
      );
    }
  }


  /*
   * ==========================================================
   * SELECTED VALUES FOR SUMMARY
   * ==========================================================
   */

  const selectedTaskType =
    visibleTaskTypes.find(
      (item) =>
        item.key ===
        form.taskType,
    );


  const selectedPriority =
    visiblePriorities.find(
      (item) =>
        item.key ===
        form.priority,
    );


  const selectedDepartment =
    visibleDepartments.find(
      (item) =>
        item.id ===
        form.departmentId,
    );


  const selectedBranch =
    visibleBranches.find(
      (item) =>
        item.id ===
        form.branchId,
    );


  const selectedProject =
    projects.find(
      (item) =>
        item.id ===
        form.projectId,
    );


  const selectedAssignee =
    assignableUsers.find(
      (item) =>
        item.id ===
        form.assignedToId,
    );


  const selectedApprover =
    approvers.find(
      (item) =>
        item.id ===
        form.approverId,
    );


  function settingLabel(
    item:
      | Setting
      | undefined,
  ) {
    if (!item) {
      return '—';
    }

    return (
      (isArabic
        ? item.valueAr ||
          item.codeAr
        : item.valueEn ||
          item.codeEn) ||
      '—'
    );
  }


  /*
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  function validateForm() {
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
        ? 'يرجى اختيار مستوى الأهمية.'
        : 'Please choose the importance level.';
    }


    if (
      !form.departmentId
    ) {
      return isArabic
        ? 'يرجى اختيار القسم.'
        : 'Please choose a department.';
    }


    if (
      form.needsApproval &&
      !form.approverId
    ) {
      return isArabic
        ? 'يرجى اختيار الشخص المسؤول عن الموافقة.'
        : 'Please choose who needs to approve this task.';
    }


    if (
      form.needsApproval &&
      form.approverId ===
        form.assignedToId
    ) {
      return isArabic
        ? 'لا يمكن أن يكون الشخص المكلّف بالمهمة هو نفس الشخص المسؤول عن الموافقة.'
        : 'The assignee and approver should not be the same person.';
    }


    /*
     * Date consistency.
     */
    if (
      form.startDate &&
      form.deadlineDate &&
      form.deadlineDate <
        form.startDate
    ) {
      return isArabic
        ? 'لا يمكن أن يكون الموعد النهائي قبل تاريخ البدء.'
        : 'The deadline cannot be before the start date.';
    }


    /*
     * Budget validation.
     */
    if (
      form.needsBudget &&
      (
        !form.budgetMin ||
        !form.budgetMax
      )
    ) {
      return isArabic
        ? 'يرجى إدخال الحد الأدنى والحد الأقصى للميزانية.'
        : 'Enter both minimum and maximum amounts when this task needs a budget.';
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
        ? 'لا يمكن أن يكون الحد الأدنى أكبر من الحد الأقصى.'
        : 'The money range minimum cannot exceed the maximum.';
    }


    return '';
  }


  /*
   * ==========================================================
   * SUBMIT
   * ==========================================================
   */

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError('');


    const validationError =
      validateForm();

    if (
      validationError
    ) {
      setError(
        validationError,
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      return;
    }


    setSubmitting(
      true,
    );


    try {
      /*
       * ------------------------------------------------------
       * LANGUAGE LOGIC FOR TASK TITLE / DESCRIPTION
       * ------------------------------------------------------
       *
       * The Task entity still requires both bilingual DB columns.
       *
       * Until task content itself is migrated to nullable language
       * columns, we retain the current system behavior and write
       * the entered title/description into both columns.
       *
       * The +Add lookup fields DO follow the one-language rule.
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

          assignedToId:
            form.assignedToId ||
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
              ? form.budgetMin ||
                undefined
              : undefined,

          budgetMax:
            form.needsBudget
              ? form.budgetMax ||
                undefined
              : undefined,

          budgetCurrency:
            form.needsBudget
              ? form.budgetCurrency.trim() ||
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
       * Upload files only after the Task exists.
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
        } catch {
          /*
           * The task itself has already been created.
           * Continue to its page instead of creating duplicate
           * tasks if the user retries the form.
           */
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
          : isArabic
            ? 'تعذر إنشاء المهمة.'
            : 'Could not create the task.',
      );

      setSubmitting(
        false,
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="mx-auto max-w-7xl pb-16"
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ------------------------------------------------------
       * HEADER
       * ------------------------------------------------------
       */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              router.back()
            }
            className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-slate-800"
          >
            {isArabic
              ? '← رجوع'
              : '← Back'}
          </button>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {isArabic
              ? 'مهمة جديدة'
              : 'New Task'}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {isArabic
              ? 'أنشئ المهمة وحدد تفاصيلها والمسؤول عنها وسير الموافقة.'
              : 'Create the task, configure its workflow and assign the right people.'}
          </p>
        </div>


        <div className="flex items-center gap-2">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5">
            <span className="mr-2 text-xs text-slate-400">
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

          {/*
           * ==================================================
           * LEFT COLUMN
           * ==================================================
           */}
          <div className="space-y-6">

            {/*
             * MAIN INFORMATION
             */}
            <section className="card p-6">
              <SectionHeader
                title={
                  isArabic
                    ? 'تفاصيل المهمة'
                    : 'Task Details'
                }
                description={
                  isArabic
                    ? 'ابدأ بالمعلومات الأساسية للمهمة.'
                    : 'Start with the essential information.'
                }
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
                    placeholder={
                      isArabic
                        ? 'مثال: إعداد التقرير الشهري'
                        : 'Example: Prepare monthly report'
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
                    className="input min-h-[140px] resize-y"
                    rows={5}
                    placeholder={
                      isArabic
                        ? 'أضف التفاصيل أو التعليمات المهمة...'
                        : 'Add useful context, requirements or instructions...'
                    }
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

                  <div className="mt-1 text-right text-xs text-slate-400">
                    {
                      form.description
                        .length
                    }{' '}
                    characters
                  </div>
                </div>
              </div>
            </section>


            {/*
             * ATTACHMENTS
             */}
            <section className="card p-6">
              <SectionHeader
                title={
                  isArabic
                    ? 'المرفقات'
                    : 'Attachments'
                }
                description={
                  isArabic
                    ? 'أضف الملفات المرتبطة بالمهمة.'
                    : 'Add any files the assignee may need.'
                }
              />


              <div className="mt-5">
                <label
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition ${
                    dragOver
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-slate-300 bg-slate-50/60 hover:border-brand-400 hover:bg-brand-50/30'
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
                        ?.length
                    ) {
                      addFiles(
                        event
                          .dataTransfer
                          .files,
                      );
                    }
                  }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
                    <svg
                      className="h-6 w-6 text-brand-600"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="M12 16V4m0 0L7 9m5-5 5 5M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-700">
                      {isArabic
                        ? 'اسحب الملفات هنا أو اضغط للاختيار'
                        : 'Drop files here or click to browse'}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      Images, PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP
                    </div>
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
                          key={`${file.name}-${file.size}-${index}`}
                          className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
                        >
                          <span className="badge shrink-0 bg-slate-100 text-slate-600">
                            {getFileTypeLabel(
                              file.type,
                              file.name,
                            )}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-sm font-medium text-slate-700"
                              title={
                                file.name
                              }
                            >
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
                            className="icon-btn-danger"
                            onClick={() =>
                              removeFile(
                                index,
                              )
                            }
                            aria-label={`Remove ${file.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            </section>


            {/*
             * BUDGET
             */}
            <section className="card p-6">
              <div className="flex items-start justify-between gap-4">
                <SectionHeader
                  title={
                    isArabic
                      ? 'الميزانية'
                      : 'Budget'
                  }
                  description={
                    isArabic
                      ? 'فعّل هذا الخيار إذا كانت المهمة تحتاج نطاقاً مالياً.'
                      : 'Enable this only if the task needs a money range.'
                  }
                />

                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
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

                  <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-full" />
                </label>
              </div>


              {form.needsBudget && (
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <FieldLabel>
                      {isArabic
                        ? 'الحد الأدنى'
                        : 'Minimum'}
                    </FieldLabel>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      required
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
                  </div>


                  <div>
                    <FieldLabel>
                      {isArabic
                        ? 'الحد الأقصى'
                        : 'Maximum'}
                    </FieldLabel>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      required
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
                  </div>


                  <div>
                    <FieldLabel>
                      {isArabic
                        ? 'العملة'
                        : 'Currency'}
                    </FieldLabel>

                    <input
                      className="input"
                      maxLength={
                        10
                      }
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
                </div>
              )}
            </section>
          </div>


          {/*
           * ==================================================
           * RIGHT COLUMN
           * ==================================================
           */}
          <aside className="space-y-6">

            {/*
             * CLASSIFICATION
             */}
            <section className="card p-5">
              <SectionHeader
                title={
                  isArabic
                    ? 'التصنيف'
                    : 'Classification'
                }
              />


              <div className="mt-5 space-y-4">
                {/*
                 * TASK TYPE
                 */}
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
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      {isArabic
                        ? 'اختر النوع...'
                        : 'Select type…'}
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


                {/*
                 * PRIORITY
                 */}
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
                    {isArabic
                      ? 'مستوى الأهمية'
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
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      {isArabic
                        ? 'اختر الأهمية...'
                        : 'Select importance…'}
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


                {/*
                 * COLOR
                 */}
                <div>
                  <FieldLabel>
                    {isArabic
                      ? 'لون المهمة'
                      : 'Task color'}
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
                          title={
                            color.label
                          }
                          onClick={() =>
                            set(
                              'color',
                              color.value,
                            )
                          }
                          className={`relative h-9 rounded-lg border-2 transition ${
                            form.color ===
                            color.value
                              ? 'scale-105 border-slate-700 shadow-sm'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{
                            backgroundColor:
                              color.value,
                          }}
                        >
                          {form.color ===
                            color.value && (
                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
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
             * ORGANIZATION
             */}
            <section className="card p-5">
              <SectionHeader
                title={
                  isArabic
                    ? 'الموقع التنظيمي'
                    : 'Organization'
                }
                description={
                  isArabic
                    ? 'القسم والفرع والمشروع مستقلون عن بعضهم.'
                    : 'Department, branch and project are independent.'
                }
              />


              <div className="mt-5 space-y-4">

                {/*
                 * DEPARTMENT
                 */}
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
                    {isArabic
                      ? 'القسم'
                      : 'Department'}
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
                      {isArabic
                        ? 'اختر القسم...'
                        : 'Select department…'}
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


                {/*
                 * BRANCH
                 */}
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
                    {isArabic
                      ? 'الفرع'
                      : 'Branch'}
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
                      {isArabic
                        ? 'بدون فرع'
                        : 'No branch'}
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


                {/*
                 * PROJECT
                 */}
                <div>
                  <FieldLabel
                    optional
                  >
                    {isArabic
                      ? 'المشروع'
                      : 'Project'}
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
                      {isArabic
                        ? 'بدون مشروع'
                        : 'No project'}
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
              </div>
            </section>


            {/*
             * PEOPLE
             */}
            <section className="card p-5">
              <SectionHeader
                title={
                  isArabic
                    ? 'الأشخاص'
                    : 'People'
                }
                description={
                  isArabic
                    ? 'حدد الشخص المسؤول والموافق إذا لزم الأمر.'
                    : 'Choose who will do the task and who approves it.'
                }
              />


              {peopleError && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {peopleError}
                </div>
              )}


              <div className="mt-5 space-y-4">

                {/*
                 * ASSIGNEE
                 *
                 * This was missing from the visible form in the old page.
                 */}
                <div>
                  <FieldLabel
                    optional
                  >
                    {isArabic
                      ? 'مسندة إلى'
                      : 'Assigned to'}
                  </FieldLabel>

                  <select
                    className="input"
                    value={
                      form.assignedToId
                    }
                    onChange={(
                      event,
                    ) =>
                      set(
                        'assignedToId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      {isArabic
                        ? 'غير مسندة حالياً'
                        : 'Unassigned for now'}
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

                  <p className="mt-1 text-xs text-slate-400">
                    {isArabic
                      ? 'حسابات Admin لا يمكن إسناد المهام إليها.'
                      : 'Admin accounts cannot be task assignees.'}
                  </p>
                </div>


                {/*
                 * APPROVAL TOGGLE
                 */}
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-700">
                        {isArabic
                          ? 'تحتاج موافقة'
                          : 'Needs approval'}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {isArabic
                          ? 'لن تعتبر المهمة مكتملة نهائياً قبل الموافقة.'
                          : 'Require another user to approve completion.'}
                      </p>
                    </div>


                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        className="peer sr-only"
                        checked={
                          form.needsApproval
                        }
                        onChange={(
                          event,
                        ) => {
                          const checked =
                            event
                              .target
                              .checked;

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

                      <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-brand-500 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition peer-checked:after:translate-x-full" />
                    </label>
                  </div>


                  {form.needsApproval && (
                    <div className="mt-4">
                      <FieldLabel>
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
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option value="">
                          {isArabic
                            ? 'اختر الموافق...'
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
                              {item.fullName}
                              {' — '}
                              {item.email}
                              {item.role.name ===
                              'ADMIN'
                                ? ' (Admin)'
                                : ''}
                            </option>
                          ),
                        )}
                      </select>


                      {approvers.length ===
                        0 && (
                        <p className="mt-2 text-xs text-red-500">
                          {isArabic
                            ? 'لا يوجد مستخدم آخر متاح للموافقة.'
                            : 'There is no other active user available to approve this task.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>


                {/*
                 * PARENT TASK
                 */}
                <div>
                  <FieldLabel
                    optional
                  >
                    {isArabic
                      ? 'المهمة الأب'
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
                      set(
                        'parentTaskId',
                        event
                          .target
                          .value,
                      )
                    }
                  >
                    <option value="">
                      {isArabic
                        ? 'مهمة مستقلة'
                        : 'Standalone task'}
                    </option>

                    {tasks.map(
                      (
                        task,
                      ) => (
                        <option
                          key={
                            task.id
                          }
                          value={
                            task.id
                          }
                        >
                          {isArabic
                            ? task.titleAr ||
                              task.titleEn
                            : task.titleEn ||
                              task.titleAr}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>
            </section>


            {/*
             * DATES
             */}
            <section className="card p-5">
              <SectionHeader
                title={
                  isArabic
                    ? 'التواريخ'
                    : 'Schedule'
                }
              />


              <div className="mt-5 space-y-4">
                <div>
                  <FieldLabel
                    optional
                  >
                    {isArabic
                      ? 'تاريخ البدء'
                      : 'Start date'}
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
                    {isArabic
                      ? 'الموعد النهائي'
                      : 'Deadline'}
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


                <p className="text-xs leading-5 text-slate-400">
                  {isArabic
                    ? 'تاريخ الانتهاء الفعلي يُسجل تلقائياً عند اكتمال المهمة.'
                    : 'The actual end date is recorded automatically when the task is completed.'}
                </p>
              </div>
            </section>
          </aside>
        </div>


        {/*
         * ====================================================
         * FINAL STATUS / SUMMARY
         * ====================================================
         */}
        <section className="card mt-6 overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
            <SectionHeader
              title={
                isArabic
                  ? 'ملخص المهمة قبل الإنشاء'
                  : 'Task Summary'
              }
              description={
                isArabic
                  ? 'راجع سير المهمة قبل إنشائها.'
                  : 'Review the initial workflow before creating the task.'
              }
            />
          </div>


          <div className="grid lg:grid-cols-[1fr_340px]">
            <div className="p-6">
              <div className="grid gap-x-10 sm:grid-cols-2">
                <div className="divide-y divide-slate-100">
                  <SummaryRow
                    label={
                      isArabic
                        ? 'نوع المهمة'
                        : 'Task type'
                    }
                  >
                    {selectedTaskType
                      ? isArabic
                        ? selectedTaskType.codeAr
                        : selectedTaskType.codeEn
                      : '—'}
                  </SummaryRow>


                  <SummaryRow
                    label={
                      isArabic
                        ? 'الأهمية'
                        : 'Importance'
                    }
                  >
                    {selectedPriority
                      ? isArabic
                        ? selectedPriority.codeAr
                        : selectedPriority.codeEn
                      : '—'}
                  </SummaryRow>


                  <SummaryRow
                    label={
                      isArabic
                        ? 'القسم'
                        : 'Department'
                    }
                  >
                    {settingLabel(
                      selectedDepartment,
                    )}
                  </SummaryRow>


                  <SummaryRow
                    label={
                      isArabic
                        ? 'الفرع'
                        : 'Branch'
                    }
                  >
                    {settingLabel(
                      selectedBranch,
                    )}
                  </SummaryRow>
                </div>


                <div className="divide-y divide-slate-100">
                  <SummaryRow
                    label={
                      isArabic
                        ? 'المشروع'
                        : 'Project'
                    }
                  >
                    {selectedProject?.name ||
                      '—'}
                  </SummaryRow>


                  <SummaryRow
                    label={
                      isArabic
                        ? 'مسندة إلى'
                        : 'Assigned to'
                    }
                  >
                    {selectedAssignee?.fullName ||
                      (isArabic
                        ? 'غير مسندة'
                        : 'Unassigned')}
                  </SummaryRow>


                  <SummaryRow
                    label={
                      isArabic
                        ? 'الموعد النهائي'
                        : 'Deadline'
                    }
                  >
                    {form.deadlineDate ||
                      '—'}
                  </SummaryRow>


                  <SummaryRow
                    label={
                      isArabic
                        ? 'المرفقات'
                        : 'Attachments'
                    }
                  >
                    {
                      files.length
                    }
                  </SummaryRow>
                </div>
              </div>
            </div>


            {/*
             * STATUS PANEL
             */}
            <div className="border-t border-slate-100 bg-slate-50/50 p-6 lg:border-l lg:border-t-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isArabic
                  ? 'سير المهمة'
                  : 'Workflow'}
              </div>


              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    {isArabic
                      ? 'حالة المهمة'
                      : 'Task status'}
                  </span>

                  <StatusBadge
                    value="Pending"
                    listType="task_status"
                  />
                </div>


                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    {isArabic
                      ? 'الموافقة'
                      : 'Approval'}
                  </span>

                  <span
                    className={`badge ${
                      form.needsApproval
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {form.needsApproval
                      ? isArabic
                        ? 'مطلوبة — قيد الانتظار'
                        : 'Required · Pending'
                      : isArabic
                        ? 'غير مطلوبة'
                        : 'Not required'}
                  </span>
                </div>


                {form.needsApproval && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">
                      {isArabic
                        ? 'الموافق'
                        : 'Approver'}
                    </span>

                    <span className="max-w-[180px] truncate text-sm font-medium text-slate-700">
                      {selectedApprover?.fullName ||
                        '—'}
                    </span>
                  </div>
                )}


                <div className="rounded-lg border border-brand-100 bg-brand-50 p-3 text-xs leading-5 text-brand-800">
                  {form.needsApproval
                    ? isArabic
                      ? 'تبدأ المهمة بحالة Pending. عند الوصول إلى مرحلة الموافقة يجب أن تمر بسير الموافقة قبل اكتمالها.'
                      : 'The task starts as Pending. Because approval is required, it must pass through the approval workflow before it can be completed.'
                    : isArabic
                      ? 'تبدأ المهمة بحالة Pending ويمكن أن تتقدم خلال سير العمل العادي.'
                      : 'The task starts as Pending and follows the normal task workflow.'}
                </div>
              </div>
            </div>
          </div>
        </section>


        {/*
         * ====================================================
         * ACTION BAR
         * ====================================================
         */}
        <div className="sticky bottom-4 z-20 mt-6">
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 px-5 py-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">
                {isArabic
                  ? 'جاهز لإنشاء المهمة؟'
                  : 'Ready to create this task?'}
              </div>

              <div className="mt-0.5 text-xs text-slate-400">
                {isArabic
                  ? 'الحالة الأولية: Pending'
                  : 'Initial task status: Pending'}
              </div>
            </div>


            <div className="flex gap-2">
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
                className="btn-primary min-w-[130px]"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? isArabic
                    ? 'جاري الإنشاء…'
                    : 'Creating…'
                  : isArabic
                    ? 'إنشاء المهمة'
                    : 'Create Task'}
              </button>
            </div>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {getQuickAddTitle()}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isArabic
                    ? 'سيتم حفظ العنصر باللغة العربية فقط لأنه اللغة الحالية.'
                    : 'This item will be saved in English only because English is the current language.'}
                </p>
              </div>


              <button
                type="button"
                className="icon-btn"
                onClick={
                  closeQuickAdd
                }
              >
                ✕
              </button>
            </div>


            <div className="space-y-4 p-6">
              <div>
                <FieldLabel>
                  {quickAdd.type ===
                    'task_type'
                    ? isArabic
                      ? 'اسم نوع المهمة'
                      : 'Task type name'
                    : quickAdd.type ===
                        'task_priority'
                      ? isArabic
                        ? 'اسم مستوى الأهمية'
                        : 'Importance name'
                      : isArabic
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
                          event
                            .target
                            .value,

                        error:
                          '',
                      }),
                    )
                  }
                  onKeyDown={(
                    event,
                  ) => {
                    if (
                      event.key ===
                      'Enter'
                    ) {
                      event.preventDefault();

                      saveQuickAdd();
                    }
                  }}
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
                    {isArabic
                      ? 'الرمز'
                      : 'Code'}
                  </FieldLabel>

                  <input
                    className="input"
                    value={
                      quickAdd.code
                    }
                    placeholder={
                      isArabic
                        ? 'إذا ترك فارغاً سيتم استخدام الاسم'
                        : 'If blank, the name will be used'
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
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {
                    quickAdd.error
                  }
                </div>
              )}
            </div>


            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
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
                  quickAdd.saving
                }
                onClick={
                  saveQuickAdd
                }
              >
                {quickAdd.saving
                  ? isArabic
                    ? 'جاري الإضافة…'
                    : 'Adding…'
                  : isArabic
                    ? 'إضافة'
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