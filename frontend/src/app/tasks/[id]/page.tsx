'use client';

import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  useLocale,
} from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import ReasonModal from '@/components/ReasonModal';
import SubtasksPanel from '@/components/SubtasksPanel';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  AssignmentsApi,
  CommentsApi,
  TaskWorkflowApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Task,
  TaskAssignment,
  TaskComment,
  TaskWorkflowAction,
  TaskWorkflowConfig,
  User,
} from '@/lib/types';
import TaskAttachmentsPanel from '@/components/TaskAttachmentsPanel';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const REASSIGN_AFTER_DAYS =
  14;


/*
 * ============================================================
 * BASE TASK STATUS WORKFLOW
 * ============================================================
 *
 * This is still important.
 *
 * Admin Workflow configuration does NOT replace the real Task
 * status rules.
 *
 * Admin configuration only decides:
 *
 * - which available actions are visible
 * - their order
 * - whether all actions or only the next action is shown
 * ============================================================
 */

const NEXT_STATUS_OPTIONS:
  Record<
    string,
    string[]
  > = {
  Pending: [
    'InProgress',
    'Finished',
  ],

  Unassigned: [
    'InProgress',
    'Finished',
  ],

  InProgress: [
    'PendingApproval',
    'Completed',
    'Finished',
  ],

  PendingApproval: [
    'InProgress',
  ],

  Completed: [
    'Archived',
  ],

  Reopened: [
    'InProgress',
  ],

  Finished: [
    'Archived',
  ],

  Archived: [],
};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function SectionTitle({
  title,
  description,
}: {
  title:
    string;

  description?:
    string;
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


function InfoRow({
  label,
  children,
}: {
  label:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-5
        py-3
      "
    >
      <span
        className="
          text-sm
          text-slate-500
        "
      >
        {label}
      </span>

      <div
        className="
          max-w-[65%]
          break-words
          text-end
          text-sm
          font-medium
          text-slate-700
        "
      >
        {children}
      </div>
    </div>
  );
}


function assignmentAgeInDays(
  assignment:
    TaskAssignment,
) {
  return (
    Date.now() -
    new Date(
      assignment.createdAt,
    ).getTime()
  ) /
    (
      1000 *
      60 *
      60 *
      24
    );
}


function assignmentDaysRemaining(
  assignment:
    TaskAssignment,
) {
  return Math.max(
    0,

    Math.ceil(
      REASSIGN_AFTER_DAYS -
      assignmentAgeInDays(
        assignment,
      ),
    ),
  );
}


function formatAssignmentDate(
  date?:
    string | null,
) {
  if (!date) {
    return '—';
  }

  return new Date(
    date,
  ).toLocaleString();
}


function formatDate(
  date:
    string | null | undefined,

  locale:
    string,
) {
  if (!date) {
    return '—';
  }

  const parsed =
    new Date(
      date.length ===
      10
        ? `${date}T00:00:00`
        : date,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
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


function languageTaskTitle(
  task:
    Task,

  isArabic:
    boolean,
) {
  return isArabic
    ? task.titleAr ||
        task.titleEn
    : task.titleEn ||
        task.titleAr;
}


/*
 * ============================================================
 * WORKFLOW HELPERS
 * ============================================================
 */

function getWorkflowActionForStatus(
  workflow:
    TaskWorkflowConfig | null,

  status:
    string,
):
  TaskWorkflowAction | undefined {
  return workflow?.actions.find(
    (
      action,
    ) =>
      action.targetStatus ===
      status,
  );
}


function getWorkflowLabel(
  workflow:
    TaskWorkflowConfig | null,

  status:
    string,

  isArabic:
    boolean,
) {
  const action =
    getWorkflowActionForStatus(
      workflow,
      status,
    );


  if (
    action
  ) {
    return isArabic
      ? action.labelAr ||
          action.labelEn
      : action.labelEn ||
          action.labelAr;
  }


  /*
   * Fallback labels for actions that are not in the
   * configurable Workflow.
   */
  switch (
    status
  ) {
    case 'InProgress':
      return isArabic
        ? 'بدء العمل'
        : 'Start task';

    case 'PendingApproval':
      return isArabic
        ? 'إرسال للموافقة'
        : 'Submit for approval';

    case 'Completed':
      return isArabic
        ? 'إكمال المهمة'
        : 'Complete task';

    case 'Finished':
      return isArabic
        ? 'إنهاء المهمة'
        : 'Finish task';

    case 'Archived':
      return isArabic
        ? 'أرشفة المهمة'
        : 'Archive task';

    default:
      return isArabic
        ? `الانتقال إلى ${status}`
        : `Move to ${status}`;
  }
}


/*
 * ============================================================
 * MAIN
 * ============================================================
 */

function TaskDetailContent() {
  const {
    id,
  } =
    useParams<{
      id:
        string;
    }>();


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


  /*
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const [
    task,
    setTask,
  ] =
    useState<Task | null>(
      null,
    );


  const [
    comments,
    setComments,
  ] =
    useState<
      TaskComment[]
    >([]);


  const [
    users,
    setUsers,
  ] =
    useState<User[]>(
      [],
    );


  /*
   * ==========================================================
   * ADMIN-CONFIGURED WORKFLOW
   * ==========================================================
   */

  const [
    workflow,
    setWorkflow,
  ] =
    useState<TaskWorkflowConfig | null>(
      null,
    );


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

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
    useState('');


  const [
    notice,
    setNotice,
  ] =
    useState('');


  /*
   * ==========================================================
   * ASSIGNMENT STATE
   * ==========================================================
   */

  const [
    assignmentUserId,
    setAssignmentUserId,
  ] =
    useState('');


  const [
    reassignUserId,
    setReassignUserId,
  ] =
    useState('');


  const [
    assignmentBusy,
    setAssignmentBusy,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * COMMENT STATE
   * ==========================================================
   */

  const [
    newComment,
    setNewComment,
  ] =
    useState('');


  const [
    commentBusy,
    setCommentBusy,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * REASON MODAL
   * ==========================================================
   */

  const [
    reasonModal,
    setReasonModal,
  ] =
    useState<{
      title:
        string;

      description?:
        string;

      minLength:
        number;

      confirmLabel?:
        string;

      danger?:
        boolean;

      onConfirm:
        (
          reason:
            string,
        ) => void;
    } | null>(
      null,
    );


  /*
   * ==========================================================
   * LOAD
   * ==========================================================
   */

  async function load() {
    setLoading(
      true,
    );

    setError('');


    try {
      const [
        taskResult,
        commentsResult,
        workflowResult,
      ] =
        await Promise.all([
          TasksApi.get(
            id,
          ),

          CommentsApi.list(
            id,
          ),

          TaskWorkflowApi.get(),
        ]);


      setTask(
        taskResult,
      );


      setComments(
        commentsResult,
      );


      setWorkflow(
        workflowResult,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : isArabic
            ? 'تعذر تحميل المهمة.'
            : 'Could not load this task.',
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * LIGHT REFRESH
   * ==========================================================
   */

  async function refreshTask() {
    try {
      const result =
        await TasksApi.get(
          id,
        );


      setTask(
        result,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : isArabic
            ? 'تعذر تحديث المهمة.'
            : 'Could not refresh the task.',
      );
    }
  }


  async function refreshComments() {
    try {
      const result =
        await CommentsApi.list(
          id,
        );


      setComments(
        result,
      );
    } catch {
      /*
       * Keep current comments.
       */
    }
  }


  useEffect(
    () => {
      load();


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
          },
        )
        .catch(
          () => {},
        );


      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      id,
    ],
  );


  /*
   * ==========================================================
   * FEEDBACK
   * ==========================================================
   */

  async function withFeedback(
    action:
      () => Promise<unknown>,

    success?:
      string,
  ) {
    setError('');
    setNotice('');


    try {
      await action();


      if (
        success
      ) {
        setNotice(
          success,
        );
      }


      await load();
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : isArabic
            ? 'حدث خطأ.'
            : 'Something went wrong.',
      );
    }
  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading
  ) {
    return (
      <div
        className="
          mx-auto
          max-w-7xl
          pb-16
        "
      >
        <div
          className="
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-10
            text-center
          "
        >
          <div
            className="
              mx-auto
              h-8
              w-8
              animate-spin
              rounded-full
              border-2
              border-slate-200
              border-t-brand-500
            "
          />

          <p
            className="
              mt-4
              text-sm
              text-slate-500
            "
          >
            {isArabic
              ? 'جاري تحميل المهمة…'
              : 'Loading task…'}
          </p>
        </div>
      </div>
    );
  }


  /*
   * ==========================================================
   * NOT FOUND
   * ==========================================================
   */

  if (
    !task
  ) {
    return (
      <div
        className="
          mx-auto
          max-w-7xl
          pb-16
        "
      >
        <div
          className="
            rounded-2xl
            border
            border-red-200
            bg-white
            p-10
            text-center
          "
        >
          <div
            className="
              mx-auto
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-2xl
              bg-red-50
              text-xl
              text-red-600
            "
          >
            !
          </div>

          <h1
            className="
              mt-4
              text-lg
              font-semibold
              text-slate-900
            "
          >
            {isArabic
              ? 'المهمة غير موجودة'
              : 'Task not found'}
          </h1>

          <p
            className="
              mt-2
              text-sm
              text-red-600
            "
          >
            {error}
          </p>

          <button
            type="button"
            className="btn-secondary mt-5"
            onClick={() =>
              router.back()
            }
          >
            {isArabic
              ? 'رجوع'
              : 'Go back'}
          </button>
        </div>
      </div>
    );
  }


  /*
   * ==========================================================
   * PERMISSIONS
   * ==========================================================
   */

  const isAdmin =
    user?.role.name ===
    'ADMIN';


  const isCreator =
    task.createdById ===
    user?.id;


  const isApprover =
    task.approverId ===
    user?.id;


  /*
   * ==========================================================
   * USERS
   * ==========================================================
   */

  const assignableUsers =
    users
      .filter(
        (
          item,
        ) =>
          item.isActive &&
          item.role.name !==
            'ADMIN',
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.fullName.localeCompare(
            b.fullName,
          ),
      );


  /*
   * ==========================================================
   * ASSIGNMENTS
   * ==========================================================
   */

  const assignments =
    [
      ...(
        task.assignments ||
        []
      ),
    ].sort(
      (
        a,
        b,
      ) =>
        new Date(
          b.createdAt,
        ).getTime() -
        new Date(
          a.createdAt,
        ).getTime(),
    );


  const currentAssignment =
    assignments.find(
      (
        assignment,
      ) =>
        assignment.status ===
          'PendingAcceptance' ||
        assignment.status ===
          'Accepted',
    );


  const latestRejectedAssignment =
    assignments.find(
      (
        assignment,
      ) =>
        assignment.status ===
        'Rejected',
    );


  const stalePendingAssignment =
    assignments.find(
      (
        assignment,
      ) =>
        assignment.status ===
          'PendingAcceptance' &&
        assignmentAgeInDays(
          assignment,
        ) >=
          REASSIGN_AFTER_DAYS,
    );


  const myPendingAssignment =
    assignments.find(
      (
        assignment,
      ) =>
        assignment.assigneeId ===
          user?.id &&
        assignment.status ===
          'PendingAcceptance',
    );


  const myAcceptedAssignment =
    assignments.find(
      (
        assignment,
      ) =>
        assignment.assigneeId ===
          user?.id &&
        assignment.status ===
          'Accepted',
    );


  /*
   * ==========================================================
   * ASSIGNMENT MANAGEMENT
   * ==========================================================
   */

  const canManageAssignment =
    (
      isAdmin ||
      isCreator
    ) &&
    task.status !==
      'Archived';


  const canAssignNew =
    canManageAssignment &&
    !currentAssignment &&
    !latestRejectedAssignment;


  /*
   * ==========================================================
   * REASSIGNMENT
   * ==========================================================
   */

  const assignmentToReassign =
    latestRejectedAssignment ||
    stalePendingAssignment;


  const canReassign =
    canManageAssignment &&
    Boolean(
      assignmentToReassign,
    );


  /*
   * ==========================================================
   * LANGUAGE
   * ==========================================================
   */

  const title =
    languageTaskTitle(
      task,
      isArabic,
    );


  const description =
    isArabic
      ? task.descriptionAr ||
        task.descriptionEn
      : task.descriptionEn ||
        task.descriptionAr;


  /*
   * ==========================================================
   * DEADLINE
   * ==========================================================
   */

  const today =
    new Date()
      .toISOString()
      .slice(
        0,
        10,
      );


  const isDone =
    [
      'Completed',
      'Finished',
      'Archived',
    ].includes(
      task.status,
    );


  const overdue =
    Boolean(
      task.deadlineDate &&
      task.deadlineDate <
        today &&
      !isDone,
    );


  /*
   * ==========================================================
   * SUBTASKS
   * ==========================================================
   */

  const subtasks =
    task.subTasks ||
    [];


  const closedSubtaskCount =
    subtasks.filter(
      (
        child,
      ) =>
        [
          'Completed',
          'Finished',
          'Archived',
        ].includes(
          child.status,
        ),
    ).length;


  const openSubtaskCount =
    subtasks.length -
    closedSubtaskCount;


  const subtaskProgress =
    subtasks.length >
    0
      ? Math.round(
          (
            closedSubtaskCount /
            subtasks.length
          ) *
            100,
        )
      : 0;


  const isSubtask =
    Boolean(
      task.parentTaskId,
    );


  /*
   * ==========================================================
   * APPROVAL
   * ==========================================================
   */

  const canDecideApproval =
    task.needsApproval &&
    task.status ===
      'PendingApproval' &&
    task.approvalStatus ===
      'Pending' &&
    (
      isAdmin ||
      isApprover
    );


  /*
   * ==========================================================
   * BASE STATUS OPTIONS
   * ==========================================================
   */

  let nextStatuses =
    [
      ...(
        NEXT_STATUS_OPTIONS[
          task.status
        ] ||
        []
      ),
    ];


  /*
   * ==========================================================
   * ASSIGNMENT ACCEPTANCE RULE
   * ==========================================================
   */

  if (
    currentAssignment?.status ===
    'PendingAcceptance'
  ) {
    nextStatuses =
      nextStatuses.filter(
        (
          status,
        ) =>
          status !==
          'InProgress',
      );
  }


  /*
   * ==========================================================
   * APPROVAL RULE
   * ==========================================================
   */

  if (
    task.needsApproval &&
    task.status ===
      'InProgress' &&
    task.approvalStatus !==
      'Approved'
  ) {
    /*
     * Cannot directly complete.
     *
     * Must go through PendingApproval.
     */
    nextStatuses =
      nextStatuses.filter(
        (
          status,
        ) =>
          status !==
          'Completed',
      );
  }


  /*
   * No approval?
   *
   * Don't offer PendingApproval.
   */
  if (
    !task.needsApproval
  ) {
    nextStatuses =
      nextStatuses.filter(
        (
          status,
        ) =>
          status !==
          'PendingApproval',
      );
  }


  /*
   * ==========================================================
   * SUBTASK GUARD
   * ==========================================================
   */

  if (
    openSubtaskCount >
    0
  ) {
    nextStatuses =
      nextStatuses.filter(
        (
          status,
        ) =>
          ![
            'PendingApproval',
            'Completed',
            'Finished',
          ].includes(
            status,
          ),
      );
  }


  /*
   * ==========================================================
   * ADMIN-CONFIGURED WORKFLOW
   * ==========================================================
   *
   * IMPORTANT:
   *
   * Everything above decides what is actually legal.
   *
   * This part only:
   *
   * - removes disabled Workflow actions
   * - orders actions
   * - optionally shows just the next one
   * ==========================================================
   */

  if (
    workflow
  ) {
    const enabledActions =
      workflow.actions
        .filter(
          (
            action,
          ) =>
            action.enabled,
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.order -
            b.order,
        );


    /*
     * Keep statuses that aren't part of configurable actions.
     *
     * This matters for things such as going back to InProgress
     * after rejected approval.
     */
    nextStatuses =
      nextStatuses.filter(
        (
          status,
        ) => {
          const configuredAction =
            workflow.actions.find(
              (
                action,
              ) =>
                action.targetStatus ===
                status,
            );


          if (
            !configuredAction
          ) {
            return true;
          }


          return configuredAction.enabled;
        },
      );


    /*
     * Admin order.
     */
    nextStatuses.sort(
      (
        a,
        b,
      ) => {
        const actionA =
          enabledActions.find(
            (
              action,
            ) =>
              action.targetStatus ===
              a,
          );


        const actionB =
          enabledActions.find(
            (
              action,
            ) =>
              action.targetStatus ===
              b,
          );


        const orderA =
          actionA?.order ??
          999;


        const orderB =
          actionB?.order ??
          999;


        return (
          orderA -
          orderB
        );
      },
    );


    /*
     * Guided mode.
     *
     * Only configurable actions are reduced to one.
     *
     * Special system transitions such as returning to InProgress
     * remain usable when needed.
     */
    if (
      workflow.mode ===
      'guided'
    ) {
      const configuredStatuses =
        nextStatuses.filter(
          (
            status,
          ) =>
            enabledActions.some(
              (
                action,
              ) =>
                action.targetStatus ===
                status,
            ),
        );


      const systemStatuses =
        nextStatuses.filter(
          (
            status,
          ) =>
            !workflow.actions.some(
              (
                action,
              ) =>
                action.targetStatus ===
                status,
            ),
        );


      nextStatuses = [
        ...systemStatuses,

        ...configuredStatuses.slice(
          0,
          1,
        ),
      ];
    }
  }


  /*
   * ==========================================================
   * ASSIGN
   * ==========================================================
   */

  async function assignTask() {
    if (
      !assignmentUserId
    ) {
      return;
    }


    setAssignmentBusy(
      true,
    );


    try {
      await withFeedback(
        () =>
          AssignmentsApi.assign(
            task.id,
            assignmentUserId,
            task.deadlineDate ||
              undefined,
          ),

        isArabic
          ? 'تم إرسال التكليف وينتظر قبول المستخدم.'
          : 'Assignment sent. Waiting for the user to accept.',
      );


      setAssignmentUserId('');
    } finally {
      setAssignmentBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * REASSIGN
   * ==========================================================
   */

  async function reassignTask() {
    if (
      !assignmentToReassign ||
      !reassignUserId
    ) {
      return;
    }


    setAssignmentBusy(
      true,
    );


    try {
      await withFeedback(
        () =>
          AssignmentsApi.reassign(
            assignmentToReassign.id,
            reassignUserId,
            task.deadlineDate ||
              undefined,
          ),

        isArabic
          ? 'تم إعادة التكليف وينتظر قبول المستخدم الجديد.'
          : 'Task reassigned. Waiting for the new user to accept.',
      );


      setReassignUserId('');
    } finally {
      setAssignmentBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * COMMENT
   * ==========================================================
   */

  async function submitComment(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    const content =
      newComment.trim();


    if (
      !content ||
      commentBusy
    ) {
      return;
    }


    setCommentBusy(
      true,
    );

    setError('');


    try {
      await CommentsApi.add(
        task.id,
        content,
      );


      setNewComment('');


      await refreshComments();
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : isArabic
            ? 'تعذر إضافة التعليق.'
            : 'Could not add comment.',
      );
    } finally {
      setCommentBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * STATUS ACTION
   * ==========================================================
   */

  function runStatusAction(
    nextStatus:
      string,
  ) {
    /*
     * Finish always requires a reason.
     */
    if (
      nextStatus ===
      'Finished'
    ) {
      setReasonModal({
        title:
          isArabic
            ? 'إنهاء المهمة'
            : 'Finish task',

        description:
          isArabic
            ? 'وضح سبب إنهاء المهمة.'
            : 'Explain why this task is being finished.',

        minLength:
          10,

        confirmLabel:
          isArabic
            ? 'إنهاء'
            : 'Finish',

        onConfirm:
          (
            reason,
          ) => {
            setReasonModal(
              null,
            );


            withFeedback(
              () =>
                TasksApi.changeStatus(
                  task.id,
                  nextStatus,
                  reason,
                ),
            );
          },
      });


      return;
    }


    withFeedback(
      () =>
        TasksApi.changeStatus(
          task.id,
          nextStatus,
        ),
    );
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="
        mx-auto
        max-w-[1450px]
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
       * BACK
       * ======================================================
       */}

      <button
        type="button"
        onClick={() =>
          router.back()
        }
        className="
          mb-4
          inline-flex
          items-center
          gap-2
          rounded-lg
          px-1
          py-1
          text-sm
          font-medium
          text-slate-500
          transition
          hover:text-brand-700
        "
      >
        <span
          className={
            isArabic
              ? 'rotate-180'
              : ''
          }
        >
          ←
        </span>

        {isArabic
          ? 'رجوع'
          : 'Back'}
      </button>


      {/*
       * ======================================================
       * PARENT BREADCRUMB
       * ======================================================
       */}

      {isSubtask &&
        task.parentTask && (
        <Link
          href={`/tasks/${task.parentTask.id}`}
          className="
            mb-4
            flex
            items-center
            gap-3
            rounded-xl
            border
            border-brand-100
            bg-brand-50/50
            px-4
            py-3
            transition
            hover:border-brand-200
            hover:bg-brand-50
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-brand-100
              text-brand-700
            "
          >
            ↳
          </div>

          <div
            className="
              min-w-0
              flex-1
            "
          >
            <div
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[.1em]
                text-brand-600
              "
            >
              {isArabic
                ? 'جزء من المهمة الرئيسية'
                : 'Part of parent task'}
            </div>

            <div
              className="
                mt-0.5
                truncate
                text-sm
                font-semibold
                text-brand-900
              "
            >
              {languageTaskTitle(
                task.parentTask,
                isArabic,
              )}
            </div>
          </div>

          <span
            className="
              shrink-0
              text-brand-600
            "
          >
            {isArabic
              ? '←'
              : '→'}
          </span>
        </Link>
      )}


      {/*
       * ======================================================
       * HERO
       * ======================================================
       */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_1px_2px_rgba(15,23,42,0.03)]
        "
        style={
          task.color
            ? {
                borderTop:
                  `4px solid ${task.color}`,
              }
            : undefined
        }
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-28
            -top-28
            h-64
            w-64
            rounded-full
            bg-brand-50
            blur-3xl
          "
        />


        <div
          className="
            relative
            p-5
            sm:p-6
            lg:p-7
          "
        >
          <div
            className="
              flex
              flex-col
              gap-6
              lg:flex-row
              lg:items-start
              lg:justify-between
            "
          >
            <div
              className="
                min-w-0
                flex-1
              "
            >
              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                {isSubtask && (
                  <span
                    className="
                      rounded-full
                      bg-brand-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-brand-700
                    "
                  >
                    {isArabic
                      ? 'مهمة فرعية'
                      : 'Subtask'}
                  </span>
                )}

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

                <StatusBadge
                  value={
                    task.taskType
                  }
                  listType="task_type"
                />

                {overdue && (
                  <span
                    className="
                      rounded-full
                      bg-red-50
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                      text-red-700
                    "
                  >
                    {isArabic
                      ? 'متأخرة'
                      : 'Overdue'}
                  </span>
                )}

                {!isSubtask &&
                  subtasks.length >
                    0 && (
                  <span
                    className="
                      rounded-full
                      bg-slate-100
                      px-2.5
                      py-1
                      text-[10px]
                      font-semibold
                      text-slate-600
                    "
                  >
                    {closedSubtaskCount}
                    {' / '}
                    {subtasks.length}{' '}

                    {isArabic
                      ? 'خطوات'
                      : 'steps'}
                  </span>
                )}
              </div>


              <h1
                className="
                  mt-4
                  max-w-4xl
                  break-words
                  text-2xl
                  font-semibold
                  tracking-[-0.03em]
                  text-slate-950
                  sm:text-3xl
                "
              >
                {title}
              </h1>


              <div
                className="
                  mt-3
                  flex
                  flex-wrap
                  items-center
                  gap-x-5
                  gap-y-2
                  text-xs
                  text-slate-400
                "
              >
                <span>
                  {isArabic
                    ? 'أنشأها'
                    : 'Created by'}{' '}

                  <span
                    className="
                      font-semibold
                      text-slate-600
                    "
                  >
                    {task.createdBy
                      ?.fullName ||
                      '—'}
                  </span>
                </span>

                <span>
                  {new Date(
                    task.createdAt,
                  ).toLocaleString(
                    locale,
                  )}
                </span>

                {task.project?.name && (
                  <span>
                    {isArabic
                      ? 'المشروع:'
                      : 'Project:'}{' '}

                    <span
                      className="
                        font-semibold
                        text-slate-600
                      "
                    >
                      {
                        task.project.name
                      }
                    </span>
                  </span>
                )}
              </div>
            </div>


            <div
              className="
                grid
                min-w-[260px]
                grid-cols-2
                gap-2
                lg:max-w-[330px]
              "
            >
              <div
                className="
                  rounded-xl
                  border
                  border-slate-100
                  bg-slate-50/80
                  p-3
                "
              >
                <div
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  {isArabic
                    ? 'المكلف'
                    : 'Assignee'}
                </div>

                <div
                  className="
                    mt-1
                    truncate
                    text-xs
                    font-semibold
                    text-slate-700
                  "
                >
                  {currentAssignment
                    ?.assignee
                    ?.fullName ||
                    (
                      isArabic
                        ? 'غير مسندة'
                        : 'Unassigned'
                    )}
                </div>
              </div>


              <div
                className="
                  rounded-xl
                  border
                  border-slate-100
                  bg-slate-50/80
                  p-3
                "
              >
                <div
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  {isArabic
                    ? 'الموعد'
                    : 'Deadline'}
                </div>

                <div
                  className={`
                    mt-1
                    text-xs
                    font-semibold
                    ${
                      overdue
                        ? 'text-red-600'
                        : 'text-slate-700'
                    }
                  `}
                >
                  {formatDate(
                    task.deadlineDate,
                    locale,
                  )}
                </div>
              </div>


              {!isSubtask &&
                subtasks.length >
                  0 && (
                <div
                  className="
                    col-span-2
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50/80
                    p-3
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-slate-400
                    "
                  >
                    <span>
                      {isArabic
                        ? 'تقدم الخطوات'
                        : 'Step progress'}
                    </span>

                    <span
                      className="
                        text-brand-700
                      "
                    >
                      {subtaskProgress}%
                    </span>
                  </div>

                  <div
                    className="
                      mt-2
                      h-1.5
                      overflow-hidden
                      rounded-full
                      bg-slate-200
                    "
                  >
                    <div
                      className="
                        h-full
                        rounded-full
                        bg-brand-500
                      "
                      style={{
                        width:
                          `${subtaskProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * FEEDBACK
       * ======================================================
       */}

      {error && (
        <div
          className="
            mt-4
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


      {notice && (
        <div
          className="
            mt-4
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            px-4
            py-3
            text-sm
            text-emerald-700
          "
        >
          {notice}
        </div>
      )}


      {/*
       * ======================================================
       * GRID
       * ======================================================
       */}

      <div
        className="
          mt-6
          grid
          gap-6
          xl:grid-cols-[minmax(0,1fr)_380px]
        "
      >
        <main
          className="
            min-w-0
            space-y-6
          "
        >
          {/*
           * ==================================================
           * DESCRIPTION
           * ==================================================
           */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              sm:p-6
            "
          >
            <SectionTitle
              title={
                isArabic
                  ? 'وصف المهمة'
                  : 'Task Description'
              }
            />


            {description ? (
              <p
                className="
                  mt-4
                  whitespace-pre-wrap
                  text-sm
                  leading-7
                  text-slate-700
                "
              >
                {description}
              </p>
            ) : (
              <div
                className="
                  mt-4
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-5
                  text-sm
                  text-slate-400
                "
              >
                {isArabic
                  ? 'لا يوجد وصف.'
                  : 'No description was provided.'}
              </div>
            )}
          </section>


          {/*
           * ==================================================
           * WORK BREAKDOWN
           * ==================================================
           */}

          <SubtasksPanel
            task={
              task
            }
            onChanged={
              refreshTask
            }
          />

              <TaskAttachmentsPanel
                  task={
                    task
                  }
                  user={
                    user
                  }
                  onChanged={
                    refreshTask
                  }
                />
          {/*
           * ==================================================
           * ASSIGNMENT
           * ==================================================
           */}

          <section
            className="
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
            "
          >
            <div
              className="
                border-b
                border-slate-100
                bg-slate-50/60
                p-5
                sm:p-6
              "
            >
              <SectionTitle
                title={
                  isArabic
                    ? 'التكليف'
                    : 'Assignment'
                }
                description={
                  isArabic
                    ? 'قبول ورفض وإعادة تكليف المهمة يتم من هنا.'
                    : 'Assignment acceptance, rejection and reassignment are managed here.'
                }
              />
            </div>


            <div
              className="
                p-5
                sm:p-6
              "
            >
              {currentAssignment ? (
                <div
                  className="
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      flex-col
                      gap-4
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className="
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-brand-50
                          text-sm
                          font-bold
                          text-brand-700
                        "
                      >
                        {currentAssignment
                          .assignee
                          ?.fullName
                          ?.charAt(
                            0,
                          )
                          .toUpperCase() ||
                          '?'}
                      </div>

                      <div>
                        <div
                          className="
                            text-[10px]
                            font-semibold
                            uppercase
                            tracking-wide
                            text-slate-400
                          "
                        >
                          {isArabic
                            ? 'المستخدم الحالي'
                            : 'Current assignee'}
                        </div>

                        <div
                          className="
                            mt-1
                            font-semibold
                            text-slate-800
                          "
                        >
                          {currentAssignment
                            .assignee
                            ?.fullName ||
                            'Unknown user'}
                        </div>

                        <div
                          className="
                            mt-2
                          "
                        >
                          <StatusBadge
                            value={
                              currentAssignment.status
                            }
                          />
                        </div>
                      </div>
                    </div>


                    {currentAssignment.status ===
                      'PendingAcceptance' && (
                      <div
                        className="
                          rounded-xl
                          bg-amber-50
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-amber-700
                        "
                      >
                        {isArabic
                          ? 'بانتظار الرد'
                          : 'Waiting for response'}
                      </div>
                    )}


                    {currentAssignment.status ===
                      'Accepted' && (
                      <div
                        className="
                          rounded-xl
                          bg-emerald-50
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-emerald-700
                        "
                      >
                        ✓{' '}

                        {isArabic
                          ? 'تم قبول التكليف'
                          : 'Assignment accepted'}
                      </div>
                    )}
                  </div>


                  {currentAssignment.status ===
                    'PendingAcceptance' && (
                    <div
                      className="
                        mt-4
                        border-t
                        border-slate-100
                        pt-4
                      "
                    >
                      <div
                        className="
                          flex
                          flex-wrap
                          items-center
                          justify-between
                          gap-4
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
                              ? 'تم التكليف منذ'
                              : 'Assignment age'}
                          </div>

                          <div
                            className="
                              mt-1
                              text-sm
                              font-semibold
                              text-slate-700
                            "
                          >
                            {Math.floor(
                              assignmentAgeInDays(
                                currentAssignment,
                              ),
                            )}{' '}

                            {isArabic
                              ? 'يوم'
                              : 'day(s)'}
                          </div>
                        </div>


                        {!stalePendingAssignment && (
                          <div
                            className="
                              text-end
                            "
                          >
                            <div
                              className="
                                text-xs
                                text-slate-400
                              "
                            >
                              {isArabic
                                ? 'إعادة التكليف متاحة بعد'
                                : 'Reassignment available in'}
                            </div>

                            <div
                              className="
                                mt-1
                                text-sm
                                font-semibold
                                text-amber-700
                              "
                            >
                              {assignmentDaysRemaining(
                                currentAssignment,
                              )}{' '}

                              {isArabic
                                ? 'يوم'
                                : 'day(s)'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="
                    rounded-xl
                    border
                    border-dashed
                    border-slate-200
                    bg-slate-50/40
                    p-6
                    text-center
                  "
                >
                  <div
                    className="
                      mx-auto
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-xl
                      bg-slate-100
                      text-slate-400
                    "
                  >
                    ○
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
                      ? 'لا يوجد تكليف نشط'
                      : 'No active assignment'}
                  </div>

                  <div
                    className="
                      mt-1
                      text-xs
                      text-slate-400
                    "
                  >
                    {isArabic
                      ? 'لا يوجد مستخدم مسؤول عن المهمة حالياً.'
                      : 'This task currently has no active assignee.'}
                  </div>
                </div>
              )}


              {/*
               * =================================================
               * ACCEPT / REJECT
               * =================================================
               */}

              {myPendingAssignment && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-brand-200
                    bg-brand-50/60
                    p-4
                  "
                >
                  <div
                    className="
                      flex
                      items-start
                      gap-3
                    "
                  >
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-brand-100
                        font-bold
                        text-brand-700
                      "
                    >
                      !
                    </div>

                    <div>
                      <div
                        className="
                          font-semibold
                          text-brand-900
                        "
                      >
                        {isArabic
                          ? 'تم تكليفك بهذه المهمة.'
                          : 'This task has been assigned to you.'}
                      </div>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-brand-700
                        "
                      >
                        {isArabic
                          ? 'اقبل المهمة لبدء العمل أو ارفضها مع توضيح السبب.'
                          : 'Accept it to begin work, or reject it with a reason.'}
                      </p>
                    </div>
                  </div>


                  <div
                    className="
                      mt-4
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={
                        assignmentBusy
                      }
                      onClick={() => {
                        setAssignmentBusy(
                          true,
                        );


                        withFeedback(
                          () =>
                            AssignmentsApi.accept(
                              myPendingAssignment.id,
                            ),

                          isArabic
                            ? 'تم قبول التكليف.'
                            : 'Assignment accepted.',
                        ).finally(
                          () =>
                            setAssignmentBusy(
                              false,
                            ),
                        );
                      }}
                    >
                      {isArabic
                        ? 'قبول التكليف'
                        : 'Accept assignment'}
                    </button>


                    <button
                      type="button"
                      className="btn-danger"
                      disabled={
                        assignmentBusy
                      }
                      onClick={() =>
                        setReasonModal({
                          title:
                            isArabic
                              ? 'رفض التكليف'
                              : 'Reject assignment',

                          description:
                            isArabic
                              ? 'وضح سبب عدم قدرتك على قبول المهمة.'
                              : 'Explain why you cannot accept this task.',

                          minLength:
                            10,

                          confirmLabel:
                            isArabic
                              ? 'رفض'
                              : 'Reject',

                          danger:
                            true,

                          onConfirm:
                            (
                              reason,
                            ) => {
                              setReasonModal(
                                null,
                              );


                              withFeedback(
                                () =>
                                  AssignmentsApi.reject(
                                    myPendingAssignment.id,
                                    reason,
                                  ),

                                isArabic
                                  ? 'تم رفض التكليف.'
                                  : 'Assignment rejected.',
                              );
                            },
                        })
                      }
                    >
                      {isArabic
                        ? 'رفض التكليف'
                        : 'Reject assignment'}
                    </button>
                  </div>
                </div>
              )}


              {myAcceptedAssignment && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-emerald-200
                    bg-emerald-50
                    px-4
                    py-3
                    text-sm
                    text-emerald-700
                  "
                >
                  <strong>
                    {isArabic
                      ? 'أنت مسؤول عن هذه المهمة.'
                      : 'You are responsible for this task.'}
                  </strong>{' '}

                  {isArabic
                    ? 'يمكنك تحديث سير العمل وتقسيم المهمة إلى خطوات عند الحاجة.'
                    : 'You can update its workflow and break it into subtasks when needed.'}
                </div>
              )}


              {/*
               * =================================================
               * WAITING
               * =================================================
               */}

              {canManageAssignment &&
                currentAssignment?.status ===
                  'PendingAcceptance' &&
                !stalePendingAssignment && (
                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-amber-200
                      bg-amber-50
                      p-4
                    "
                  >
                    <div
                      className="
                        flex
                        items-start
                        gap-3
                      "
                    >
                      <div
                        className="
                          mt-0.5
                          flex
                          h-9
                          w-9
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-amber-100
                          text-amber-700
                        "
                      >
                        ◷
                      </div>

                      <div>
                        <div
                          className="
                            text-sm
                            font-semibold
                            text-amber-800
                          "
                        >
                          {isArabic
                            ? 'بانتظار رد المستخدم'
                            : 'Waiting for assignee response'}
                        </div>

                        <p
                          className="
                            mt-1
                            text-xs
                            leading-5
                            text-amber-700
                          "
                        >
                          {isArabic
                            ? `لا يمكن إعادة التكليف حالياً. يصبح الخيار متاحاً بعد ${REASSIGN_AFTER_DAYS} يوماً بدون قبول أو رفض.`
                            : `This assignment cannot be reassigned yet. Reassignment becomes available after ${REASSIGN_AFTER_DAYS} days without an Accept or Reject response.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}


              {/*
               * =================================================
               * ACCEPTED
               * =================================================
               */}

              {canManageAssignment &&
                currentAssignment?.status ===
                  'Accepted' && (
                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-emerald-200
                      bg-emerald-50
                      p-4
                    "
                  >
                    <div
                      className="
                        text-sm
                        font-semibold
                        text-emerald-800
                      "
                    >
                      {isArabic
                        ? 'تم قبول المهمة'
                        : 'Assignment accepted'}
                    </div>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-emerald-700
                      "
                    >
                      {isArabic
                        ? 'لا يمكن إعادة تكليف المهمة بعد قبولها.'
                        : 'This assignment cannot be reassigned because the user has already accepted it.'}
                    </p>
                  </div>
                )}


              {/*
               * =================================================
               * INITIAL ASSIGN
               * =================================================
               */}

              {canAssignNew && (
                <div
                  className="
                    mt-5
                    border-t
                    border-slate-100
                    pt-5
                  "
                >
                  <label className="label">
                    {isArabic
                      ? 'تكليف المهمة'
                      : 'Assign this task'}
                  </label>

                  <div
                    className="
                      flex
                      flex-col
                      gap-2
                      sm:flex-row
                    "
                  >
                    <select
                      className="input"
                      value={
                        assignmentUserId
                      }
                      onChange={(
                        event,
                      ) =>
                        setAssignmentUserId(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        {isArabic
                          ? 'اختر مستخدماً…'
                          : 'Select user…'}
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

                    <button
                      type="button"
                      className="
                        btn-primary
                        shrink-0
                      "
                      disabled={
                        !assignmentUserId ||
                        assignmentBusy
                      }
                      onClick={
                        assignTask
                      }
                    >
                      {assignmentBusy
                        ? (
                            isArabic
                              ? 'جاري التكليف…'
                              : 'Assigning…'
                          )
                        : (
                            isArabic
                              ? 'تكليف'
                              : 'Assign'
                          )}
                    </button>
                  </div>
                </div>
              )}


              {/*
               * =================================================
               * REJECTED
               * =================================================
               */}

              {latestRejectedAssignment &&
                !currentAssignment && (
                  <div
                    className="
                      mt-5
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      p-4
                    "
                  >
                    <div
                      className="
                        text-sm
                        font-semibold
                        text-red-800
                      "
                    >
                      {isArabic
                        ? 'تم رفض التكليف'
                        : 'Assignment rejected'}
                    </div>

                    <div
                      className="
                        mt-1
                        text-sm
                        text-red-700
                      "
                    >
                      {latestRejectedAssignment
                        .assignee
                        ?.fullName ||
                        'User'}
                    </div>

                    {latestRejectedAssignment
                      .rejectionReason && (
                      <div
                        className="
                          mt-3
                          rounded-lg
                          bg-white/70
                          p-3
                        "
                      >
                        <div
                          className="
                            text-[11px]
                            font-semibold
                            uppercase
                            tracking-wide
                            text-red-500
                          "
                        >
                          {isArabic
                            ? 'سبب الرفض'
                            : 'Rejection reason'}
                        </div>

                        <p
                          className="
                            mt-1
                            text-sm
                            leading-6
                            text-red-700
                          "
                        >
                          {
                            latestRejectedAssignment.rejectionReason
                          }
                        </p>
                      </div>
                    )}
                  </div>
                )}


              {/*
               * =================================================
               * REASSIGN
               * =================================================
               */}

              {canReassign &&
                assignmentToReassign && (
                  <div
                    className="
                      mt-5
                      border-t
                      border-slate-100
                      pt-5
                    "
                  >
                    <label className="label">
                      {isArabic
                        ? 'إعادة تكليف المهمة'
                        : 'Reassign task'}
                    </label>

                    <div
                      className="
                        flex
                        flex-col
                        gap-2
                        sm:flex-row
                      "
                    >
                      <select
                        className="input"
                        value={
                          reassignUserId
                        }
                        onChange={(
                          event,
                        ) =>
                          setReassignUserId(
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          {isArabic
                            ? 'اختر المستخدم الجديد…'
                            : 'Select new assignee…'}
                        </option>

                        {assignableUsers
                          .filter(
                            (
                              item,
                            ) =>
                              item.id !==
                              assignmentToReassign.assigneeId,
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

                      <button
                        type="button"
                        className="
                          btn-primary
                          shrink-0
                        "
                        disabled={
                          !reassignUserId ||
                          assignmentBusy
                        }
                        onClick={
                          reassignTask
                        }
                      >
                        {isArabic
                          ? 'إعادة تكليف'
                          : 'Reassign'}
                      </button>
                    </div>
                  </div>
                )}


              {/*
               * =================================================
               * HISTORY
               * =================================================
               */}

              {assignments.length >
                0 && (
                <div
                  className="
                    mt-6
                    border-t
                    border-slate-100
                    pt-5
                  "
                >
                  <h3
                    className="
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    {isArabic
                      ? 'سجل التكليف'
                      : 'Assignment history'}
                  </h3>

                  <div
                    className="
                      mt-3
                      space-y-2
                    "
                  >
                    {assignments.map(
                      (
                        assignment,
                      ) => (
                        <div
                          key={
                            assignment.id
                          }
                          className="
                            rounded-xl
                            border
                            border-slate-100
                            bg-slate-50/60
                            px-4
                            py-3
                          "
                        >
                          <div
                            className="
                              flex
                              flex-col
                              gap-2
                              sm:flex-row
                              sm:items-center
                              sm:justify-between
                            "
                          >
                            <div>
                              <div
                                className="
                                  text-sm
                                  font-semibold
                                  text-slate-700
                                "
                              >
                                {assignment
                                  .assignee
                                  ?.fullName ||
                                  'Unknown user'}
                              </div>

                              <div
                                className="
                                  mt-1
                                  text-xs
                                  text-slate-400
                                "
                              >
                                {formatAssignmentDate(
                                  assignment.createdAt,
                                )}
                              </div>
                            </div>

                            <StatusBadge
                              value={
                                assignment.status
                              }
                            />
                          </div>

                          {assignment
                            .rejectionReason && (
                            <div
                              className="
                                mt-3
                                rounded-lg
                                bg-red-50
                                p-3
                                text-xs
                                text-red-600
                              "
                            >
                              <strong>
                                {isArabic
                                  ? 'السبب:'
                                  : 'Reason:'}
                              </strong>{' '}

                              {
                                assignment.rejectionReason
                              }
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>


          {/*
           * ==================================================
           * TASK WORKFLOW
           * ==================================================
           */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              sm:p-6
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                sm:flex-row
                sm:items-start
                sm:justify-between
              "
            >
              <SectionTitle
                title={
                  isArabic
                    ? 'سير المهمة'
                    : 'Task Workflow'
                }
                description={
                  isArabic
                    ? 'حدّث حالة المهمة حسب تقدم العمل.'
                    : 'Move the task through its workflow as work progresses.'
                }
              />


              {workflow && (
                <div
                  className="
                    shrink-0
                    rounded-full
                    bg-slate-100
                    px-3
                    py-1.5
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-500
                  "
                >
                  {workflow.mode ===
                  'guided'
                    ? (
                        isArabic
                          ? 'سير موجه'
                          : 'Guided flow'
                      )
                    : (
                        isArabic
                          ? 'كل الإجراءات'
                          : 'All actions'
                      )}
                </div>
              )}
            </div>


            {currentAssignment?.status ===
              'PendingAcceptance' && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-amber-200
                  bg-amber-50
                  p-4
                  text-sm
                  leading-6
                  text-amber-700
                "
              >
                {isArabic
                  ? 'المهمة تنتظر قبول المستخدم قبل بدء سير العمل.'
                  : 'The task is waiting for the assigned user to accept it before work starts.'}
              </div>
            )}


            {task.needsApproval &&
              task.status ===
                'InProgress' &&
              task.approvalStatus !==
                'Approved' && (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-blue-200
                    bg-blue-50
                    p-4
                    text-sm
                    leading-6
                    text-blue-700
                  "
                >
                  {isArabic
                    ? 'هذه المهمة تحتاج موافقة قبل الإكمال.'
                    : 'This task requires approval before it can be completed.'}
                </div>
              )}


            {openSubtaskCount >
              0 && (
              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-violet-200
                  bg-violet-50
                  p-4
                "
              >
                <div
                  className="
                    text-sm
                    font-semibold
                    text-violet-800
                  "
                >
                  {isArabic
                    ? 'يوجد عمل فرعي غير مكتمل'
                    : 'Subtasks are still open'}
                </div>

                <p
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-violet-700
                  "
                >
                  {isArabic
                    ? `يوجد ${openSubtaskCount} مهام فرعية مفتوحة.`
                    : `${openSubtaskCount} subtask${openSubtaskCount === 1 ? ' is' : 's are'} still open.`}
                </p>
              </div>
            )}


            {nextStatuses.length >
              0 ? (
              <div
                className="
                  mt-5
                  flex
                  flex-wrap
                  gap-2
                "
              >
                {nextStatuses.map(
                  (
                    nextStatus,
                    index,
                  ) => {
                    const configuredAction =
                      getWorkflowActionForStatus(
                        workflow,
                        nextStatus,
                      );


                    const primary =
                      workflow?.mode ===
                        'guided' ||
                      index ===
                        0;


                    return (
                      <button
                        key={
                          nextStatus
                        }
                        type="button"
                        onClick={() =>
                          runStatusAction(
                            nextStatus,
                          )
                        }
                        className={
                          nextStatus ===
                            'Finished' ||
                          !primary
                            ? 'btn-secondary'
                            : 'btn-primary'
                        }
                        title={
                          configuredAction
                            ? (
                                isArabic
                                  ? configuredAction.descriptionAr
                                  : configuredAction.descriptionEn
                              )
                            : undefined
                        }
                      >
                        {getWorkflowLabel(
                          workflow,
                          nextStatus,
                          isArabic,
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div
                className="
                  mt-4
                  rounded-xl
                  bg-slate-50
                  px-4
                  py-4
                  text-sm
                  text-slate-400
                "
              >
                {openSubtaskCount >
                0
                  ? (
                      isArabic
                        ? 'أكمل المهام الفرعية المفتوحة لإتاحة الخطوة التالية.'
                        : 'Complete the open subtasks to unlock the next workflow action.'
                    )
                  : (
                      isArabic
                        ? 'لا توجد إجراءات متاحة حالياً.'
                        : 'No workflow actions are currently available.'
                    )}
              </div>
            )}
          </section>


          {/*
           * ==================================================
           * APPROVAL
           * ==================================================
           */}

          {task.needsApproval && (
            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
                sm:p-6
              "
            >
              <SectionTitle
                title={
                  isArabic
                    ? 'الموافقة'
                    : 'Approval'
                }
                description={
                  isArabic
                    ? 'معلومات حالة الموافقة ومسؤول الموافقة.'
                    : 'Approval status and decision information.'
                }
              />


              <div
                className="
                  mt-5
                  grid
                  gap-3
                  sm:grid-cols-2
                "
              >
                <div
                  className="
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50
                    p-4
                  "
                >
                  <div
                    className="
                      text-xs
                      text-slate-400
                    "
                  >
                    {isArabic
                      ? 'الموافق'
                      : 'Approver'}
                  </div>

                  <div
                    className="
                      mt-1
                      font-semibold
                      text-slate-700
                    "
                  >
                    {task.approver
                      ?.fullName ||
                      '—'}
                  </div>
                </div>


                <div
                  className="
                    rounded-xl
                    border
                    border-slate-100
                    bg-slate-50
                    p-4
                  "
                >
                  <div
                    className="
                      text-xs
                      text-slate-400
                    "
                  >
                    {isArabic
                      ? 'حالة الموافقة'
                      : 'Approval status'}
                  </div>

                  <div
                    className="
                      mt-2
                    "
                  >
                    <StatusBadge
                      value={
                        task.approvalStatus
                      }
                    />
                  </div>
                </div>
              </div>


              {task.approvalStatus ===
                'Rejected' &&
                task.rejectionReason && (
                  <div
                    className="
                      mt-4
                      rounded-xl
                      border
                      border-red-200
                      bg-red-50
                      p-4
                    "
                  >
                    <div
                      className="
                        text-xs
                        font-semibold
                        uppercase
                        tracking-wide
                        text-red-500
                      "
                    >
                      {isArabic
                        ? 'سبب الرفض'
                        : 'Rejection reason'}
                    </div>

                    <p
                      className="
                        mt-2
                        text-sm
                        leading-6
                        text-red-700
                      "
                    >
                      {
                        task.rejectionReason
                      }
                    </p>
                  </div>
                )}


              {canDecideApproval &&
                openSubtaskCount ===
                  0 && (
                  <div
                    className="
                      mt-5
                      flex
                      flex-wrap
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() =>
                        withFeedback(
                          () =>
                            TasksApi.decideApproval(
                              task.id,
                              true,
                            ),

                          isArabic
                            ? 'تمت الموافقة على المهمة.'
                            : 'Task approved.',
                        )
                      }
                    >
                      {isArabic
                        ? 'موافقة'
                        : 'Approve'}
                    </button>


                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() =>
                        setReasonModal({
                          title:
                            isArabic
                              ? 'رفض الموافقة'
                              : 'Reject approval',

                          description:
                            isArabic
                              ? 'وضح سبب رفض المهمة.'
                              : 'Explain why the task is being rejected.',

                          minLength:
                            5,

                          confirmLabel:
                            isArabic
                              ? 'رفض'
                              : 'Reject',

                          danger:
                            true,

                          onConfirm:
                            (
                              reason,
                            ) => {
                              setReasonModal(
                                null,
                              );


                              withFeedback(
                                () =>
                                  TasksApi.decideApproval(
                                    task.id,
                                    false,
                                    reason,
                                  ),

                                isArabic
                                  ? 'تم رفض المهمة وإعادتها إلى العمل.'
                                  : 'Task rejected and returned to In Progress.',
                              );
                            },
                        })
                      }
                    >
                      {isArabic
                        ? 'رفض'
                        : 'Reject'}
                    </button>
                  </div>
                )}
            </section>
          )}


          {/*
           * ==================================================
           * COMMENTS
           * ==================================================
           */}

          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
              sm:p-6
            "
          >
            <SectionTitle
              title={
                isArabic
                  ? 'التعليقات'
                  : 'Comments'
              }
              description={
                comments.length ===
                0
                  ? (
                      isArabic
                        ? 'لا توجد تعليقات بعد.'
                        : 'No comments yet.'
                    )
                  : (
                      isArabic
                        ? `${comments.length} تعليق`
                        : `${comments.length} ${
                            comments.length ===
                            1
                              ? 'comment'
                              : 'comments'
                          }`
                    )
              }
            />


            {comments.length >
              0 && (
              <div
                className="
                  mt-5
                  space-y-3
                "
              >
                {comments.map(
                  (
                    comment,
                  ) => (
                    <article
                      key={
                        comment.id
                      }
                      className="
                        rounded-xl
                        border
                        border-slate-100
                        bg-slate-50/60
                        p-4
                      "
                    >
                      <div
                        className="
                          flex
                          items-start
                          gap-3
                        "
                      >
                        <div
                          className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-white
                            text-xs
                            font-bold
                            text-brand-700
                            shadow-sm
                          "
                        >
                          {comment.author
                            ?.fullName
                            ?.charAt(
                              0,
                            )
                            .toUpperCase() ||
                            '?'}
                        </div>

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <div
                            className="
                              flex
                              flex-wrap
                              items-center
                              justify-between
                              gap-3
                            "
                          >
                            <div
                              className="
                                text-sm
                                font-semibold
                                text-slate-700
                              "
                            >
                              {comment.author
                                ?.fullName ||
                                'User'}
                            </div>

                            <div
                              className="
                                text-xs
                                text-slate-400
                              "
                            >
                              {new Date(
                                comment.createdAt,
                              ).toLocaleString(
                                locale,
                              )}
                            </div>
                          </div>

                          <p
                            className="
                              mt-2
                              whitespace-pre-wrap
                              text-sm
                              leading-6
                              text-slate-600
                            "
                          >
                            {
                              comment.content
                            }
                          </p>
                        </div>
                      </div>
                    </article>
                  ),
                )}
              </div>
            )}


            {task.status !==
              'Archived' && (
              <form
                className="
                  mt-5
                  rounded-xl
                  border
                  border-slate-200
                  bg-slate-50/50
                  p-3
                "
                onSubmit={
                  submitComment
                }
              >
                <textarea
                  className="
                    input
                    min-h-[90px]
                    resize-y
                    bg-white
                  "
                  value={
                    newComment
                  }
                  placeholder={
                    isArabic
                      ? 'أضف تعليقاً…'
                      : 'Add a comment…'
                  }
                  onChange={(
                    event,
                  ) =>
                    setNewComment(
                      event.target.value,
                    )
                  }
                />

                <div
                  className="
                    mt-2
                    flex
                    justify-end
                  "
                >
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={
                      commentBusy ||
                      !newComment.trim()
                    }
                  >
                    {commentBusy
                      ? (
                          isArabic
                            ? 'جاري الإرسال…'
                            : 'Posting…'
                        )
                      : (
                          isArabic
                            ? 'إرسال'
                            : 'Post comment'
                        )}
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>


        {/*
         * ====================================================
         * SIDEBAR
         * ====================================================
         */}

        <aside
          className="
            space-y-5
            xl:sticky
            xl:top-[88px]
            xl:self-start
          "
        >
          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <SectionTitle
              title={
                isArabic
                  ? 'حالة المهمة'
                  : 'Task Status'
              }
            />


            <div
              className="
                mt-5
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                p-4
                text-center
              "
            >
              <StatusBadge
                value={
                  task.status
                }
                listType="task_status"
              />

              {overdue && (
                <div
                  className="
                    mt-2
                    text-xs
                    font-semibold
                    text-red-600
                  "
                >
                  {isArabic
                    ? 'تجاوزت الموعد النهائي'
                    : 'Past deadline'}
                </div>
              )}
            </div>


            <div
              className="
                mt-4
                divide-y
                divide-slate-100
              "
            >
              <InfoRow
                label={
                  isArabic
                    ? 'الأهمية'
                    : 'Importance'
                }
              >
                <StatusBadge
                  value={
                    task.priority
                  }
                  listType="task_priority"
                />
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'النوع'
                    : 'Type'
                }
              >
                <StatusBadge
                  value={
                    task.taskType
                  }
                  listType="task_type"
                />
              </InfoRow>


              {!isSubtask &&
                subtasks.length >
                  0 && (
                  <InfoRow
                    label={
                      isArabic
                        ? 'الخطوات'
                        : 'Subtasks'
                    }
                  >
                    {closedSubtaskCount}
                    {' / '}
                    {subtasks.length}
                  </InfoRow>
                )}
            </div>
          </section>


          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <SectionTitle
              title={
                isArabic
                  ? 'الأشخاص'
                  : 'People'
              }
            />


            <div
              className="
                mt-3
                divide-y
                divide-slate-100
              "
            >
              <InfoRow
                label={
                  isArabic
                    ? 'المكلف'
                    : 'Current assignee'
                }
              >
                {currentAssignment
                  ?.assignee
                  ?.fullName ||
                  (
                    isArabic
                      ? 'غير مسندة'
                      : 'Unassigned'
                  )}
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'حالة التكليف'
                    : 'Assignment status'
                }
              >
                {currentAssignment ? (
                  <StatusBadge
                    value={
                      currentAssignment.status
                    }
                  />
                ) : (
                  '—'
                )}
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'أنشأها'
                    : 'Created by'
                }
              >
                {task.createdBy
                  ?.fullName ||
                  '—'}
              </InfoRow>


              {task.needsApproval && (
                <InfoRow
                  label={
                    isArabic
                      ? 'الموافق'
                      : 'Approver'
                  }
                >
                  {task.approver
                    ?.fullName ||
                    '—'}
                </InfoRow>
              )}
            </div>
          </section>


          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <SectionTitle
              title={
                isArabic
                  ? 'التنظيم'
                  : 'Organization'
              }
            />


            <div
              className="
                mt-3
                divide-y
                divide-slate-100
              "
            >
              <InfoRow
                label={
                  isArabic
                    ? 'القسم'
                    : 'Department'
                }
              >
                {isArabic
                  ? task.department
                      ?.valueAr ||
                    task.department
                      ?.codeAr ||
                    task.department
                      ?.valueEn ||
                    task.department
                      ?.codeEn ||
                    '—'
                  : task.department
                      ?.valueEn ||
                    task.department
                      ?.codeEn ||
                    task.department
                      ?.valueAr ||
                    task.department
                      ?.codeAr ||
                    '—'}
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'الفرع'
                    : 'Branch'
                }
              >
                {isArabic
                  ? task.branch
                      ?.valueAr ||
                    task.branch
                      ?.codeAr ||
                    task.branch
                      ?.valueEn ||
                    task.branch
                      ?.codeEn ||
                    '—'
                  : task.branch
                      ?.valueEn ||
                    task.branch
                      ?.codeEn ||
                    task.branch
                      ?.valueAr ||
                    task.branch
                      ?.codeAr ||
                    '—'}
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'المشروع'
                    : 'Project'
                }
              >
                {task.project
                  ?.name ? (
                  <Link
                    href={`/projects/${task.project.id}`}
                    className="
                      text-brand-700
                      hover:underline
                    "
                  >
                    {
                      task.project.name
                    }
                  </Link>
                ) : (
                  '—'
                )}
              </InfoRow>


              {isSubtask &&
                task.parentTask && (
                  <InfoRow
                    label={
                      isArabic
                        ? 'المهمة الرئيسية'
                        : 'Parent task'
                    }
                  >
                    <Link
                      href={`/tasks/${task.parentTask.id}`}
                      className="
                        text-brand-700
                        hover:underline
                      "
                    >
                      {languageTaskTitle(
                        task.parentTask,
                        isArabic,
                      )}
                    </Link>
                  </InfoRow>
                )}
            </div>
          </section>


          <section
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              p-5
            "
          >
            <SectionTitle
              title={
                isArabic
                  ? 'الجدول الزمني'
                  : 'Schedule'
              }
            />


            <div
              className="
                mt-3
                divide-y
                divide-slate-100
              "
            >
              <InfoRow
                label={
                  isArabic
                    ? 'تاريخ البدء'
                    : 'Start'
                }
              >
                {formatDate(
                  task.startDate,
                  locale,
                )}
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'الموعد النهائي'
                    : 'Deadline'
                }
              >
                <span
                  className={
                    overdue
                      ? 'font-semibold text-red-600'
                      : ''
                  }
                >
                  {formatDate(
                    task.deadlineDate,
                    locale,
                  )}
                </span>
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'الانتهاء الفعلي'
                    : 'Actual end'
                }
              >
                {formatDate(
                  task.actualEndDate,
                  locale,
                )}
              </InfoRow>
            </div>
          </section>


          {task.needsBudget && (
            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
              "
            >
              <SectionTitle
                title={
                  isArabic
                    ? 'الميزانية'
                    : 'Budget'
                }
              />

              <div
                className="
                  mt-4
                  rounded-xl
                  border
                  border-slate-100
                  bg-slate-50
                  p-4
                "
              >
                <div
                  className="
                    text-xs
                    text-slate-400
                  "
                >
                  {isArabic
                    ? 'النطاق'
                    : 'Range'}
                </div>

                <div
                  className="
                    mt-1
                    text-lg
                    font-semibold
                    text-slate-800
                  "
                >
                  {task.budgetMin ||
                    '—'}
                  {' – '}
                  {task.budgetMax ||
                    '—'}{' '}
                  {task.budgetCurrency ||
                    ''}
                </div>
              </div>
            </section>
          )}


          {!isSubtask &&
            subtasks.length >
              0 && (
              <section
                className="
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-5
                "
              >
                <SectionTitle
                  title={
                    isArabic
                      ? 'تقدم العمل'
                      : 'Work progress'
                  }
                />

                <div
                  className="
                    mt-5
                    flex
                    items-end
                    justify-between
                  "
                >
                  <div>
                    <div
                      className="
                        text-2xl
                        font-semibold
                        tracking-tight
                        text-slate-900
                      "
                    >
                      {subtaskProgress}%
                    </div>

                    <div
                      className="
                        mt-1
                        text-xs
                        text-slate-400
                      "
                    >
                      {closedSubtaskCount}
                      {' / '}
                      {subtasks.length}{' '}

                      {isArabic
                        ? 'مكتملة'
                        : 'completed'}
                    </div>
                  </div>

                  <div
                    className={`
                      rounded-full
                      px-2.5
                      py-1
                      text-xs
                      font-semibold
                      ${
                        openSubtaskCount ===
                        0
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }
                    `}
                  >
                    {openSubtaskCount ===
                    0
                      ? (
                          isArabic
                            ? 'جاهزة'
                            : 'Ready'
                        )
                      : (
                          isArabic
                            ? `${openSubtaskCount} متبقية`
                            : `${openSubtaskCount} remaining`
                        )}
                  </div>
                </div>

                <div
                  className="
                    mt-4
                    h-2
                    overflow-hidden
                    rounded-full
                    bg-slate-100
                  "
                >
                  <div
                    className="
                      h-full
                      rounded-full
                      bg-brand-500
                      transition-all
                    "
                    style={{
                      width:
                        `${subtaskProgress}%`,
                    }}
                  />
                </div>
              </section>
            )}
        </aside>
      </div>


      {/*
       * ======================================================
       * REASON MODAL
       * ======================================================
       */}

      <ReasonModal
        open={
          reasonModal !==
          null
        }
        title={
          reasonModal
            ?.title ||
          ''
        }
        description={
          reasonModal
            ?.description
        }
        minLength={
          reasonModal
            ?.minLength ??
          0
        }
        confirmLabel={
          reasonModal
            ?.confirmLabel
        }
        danger={
          reasonModal
            ?.danger
        }
        onCancel={() =>
          setReasonModal(
            null,
          )
        }
        onConfirm={(
          reason,
        ) =>
          reasonModal?.onConfirm(
            reason,
          )
        }
      />
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function TaskDetailPage() {
  return (
    <ProtectedRoute>
      <TaskDetailContent />
    </ProtectedRoute>
  );
}