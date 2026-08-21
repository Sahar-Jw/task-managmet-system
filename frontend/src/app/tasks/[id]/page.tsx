'use client';

import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';


import {
  useEffect,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useParams,
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  useLocale,
} from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import StatusBadge from '@/components/StatusBadge';
import Avatar from '@/components/Avatar';
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
  RatingsApi,
  TaskWorkflowApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Task,
  TaskAssignment,
  TaskComment,
  TaskRating,
  TaskWorkflowAction,
  TaskWorkflowConfig,
  User,
} from '@/lib/types';
import TaskAttachmentsPanel from '@/components/TaskAttachmentsPanel';
import { canEditTask } from '@/lib/task-permissions';
import TaskEditPanel from '@/components/TaskEditPanel';
import AvatarSelect from '@/components/AvatarSelect';


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

  _isArabic:
    boolean,
) {
  return task.title;
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
      return uiText(isArabic, 'text0475');

    case 'PendingApproval':
      return uiText(isArabic, 'text0476');

    case 'Completed':
      return uiText(isArabic, 'text0102');

    case 'Finished':
      return uiText(isArabic, 'text0103');

    case 'Archived':
      return uiText(isArabic, 'text0477');

    default:
      return uiText(isArabic, 'text0735', { value0: status });
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


  const searchParams =
    useSearchParams();


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


  const [
    isEditing,
    setIsEditing,
  ] = useState(
    searchParams.get('edit') === '1',
  );


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
   * RATING STATE
   * ==========================================================
   */

  const [
    ratingScore,
    setRatingScore,
  ] =
    useState(5);


  const [
    ratingFeedback,
    setRatingFeedback,
  ] =
    useState('');


  const [
    ratingBusy,
    setRatingBusy,
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
          : uiText(isArabic, 'text0104'),
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
          : uiText(isArabic, 'text0478'),
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
          : uiText(isArabic, 'text0479'),
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
    return <InlineLoader className="min-h-[40vh]" />;
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
            {uiText(isArabic, 'text0106')}
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
            {uiText(isArabic, 'text0107')}
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
   * RATING
   * ==========================================================
   */

  // BR-055: creator or Admin may rate; the current Assignee may not rate their own work.
  const isCurrentAssignee =
    !!user?.id &&
    task.assignments?.some(
      (
        assignment,
      ) =>
        assignment.assigneeId ===
          user.id &&
        (assignment.status ===
          'Accepted' ||
          assignment.status ===
            'Completed'),
    );

  const canRate =
    task.status ===
      'Completed' &&
    !task.archivedAt &&
    (isAdmin ||
      isCreator) &&
    !isCurrentAssignee;

  const myRating: TaskRating | undefined =
    task.ratings?.find(
      (
        r,
      ) =>
        r.ratedById ===
        user?.id,
    );


  useEffect(
    () => {
      if (
        myRating
      ) {
        setRatingScore(
          myRating.score,
        );
        setRatingFeedback(
          myRating.feedback ||
            '',
        );
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      myRating?.id,
    ],
  );


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
    task.description;


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
            task.deadlineDate || '',
          ),

        uiText(isArabic, 'text0480'),
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
            task.deadlineDate || '',
          ),

        uiText(isArabic, 'text0481'),
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
   * RATING
   * ==========================================================
   */

  async function submitRating() {
    if (
      !canRate ||
      ratingBusy
    ) {
      return;
    }


    setRatingBusy(
      true,
    );


    try {
      await withFeedback(
        () =>
          RatingsApi.rate(
            task.id,
            ratingScore,
            ratingFeedback.trim() ||
              undefined,
          ),

        uiText(isArabic, 'text1068'),
      );
    } finally {
      setRatingBusy(
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
          : uiText(isArabic, 'text0108'),
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
          uiText(isArabic, 'text0103'),

        description:
          uiText(isArabic, 'text0109'),

        minLength:
          10,

        confirmLabel:
          uiText(isArabic, 'text0110'),

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

        {uiText(isArabic, 'text0111')}
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
              {uiText(isArabic, 'text0482')}
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
                    {uiText(isArabic, 'text0112')}
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

                {canEditTask(task, user) && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(true);
                      window.setTimeout(() => document.getElementById('task-edit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
                    }}
                    className="btn-secondary px-3 py-1.5 text-xs"
                  >
                    {uiText(isArabic, 'text0068')}
                  </button>
                )}

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
                    {uiText(isArabic, 'text0285')}
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

                    {uiText(isArabic, 'text0113')}
                  </span>
                )}
              </div>


              <h1
                className="
                  mt-4
                  max-w-4xl
                  break-words
                  text-xl
                  font-semibold
                  tracking-tight
                  text-slate-950
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
                  {uiText(isArabic, 'text0483')}{' '}

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
                    {uiText(isArabic, 'text0484')}{' '}

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
                w-full
                min-w-0
                grid-cols-2
                gap-2
                sm:min-w-[260px]
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
                  {uiText(isArabic, 'text0114')}
                </div>

                {currentAssignment?.assignee ? (
                  <div className="mt-1 flex min-w-0 items-center gap-2">
                    <Avatar
                      name={currentAssignment.assignee.fullName}
                      avatarUrl={currentAssignment.assignee.avatarUrl}
                      size="sm"
                      className="shrink-0"
                    />
                    <span className="truncate text-xs font-semibold text-slate-700">
                      {currentAssignment.assignee.fullName}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 truncate text-xs font-semibold text-slate-700">
                    {uiText(isArabic, 'text0115')}
                  </div>
                )}
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
                  {uiText(isArabic, 'text0116')}
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
                      {uiText(isArabic, 'text0485')}
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


      {isEditing && canEditTask(task, user) && user && (
        <TaskEditPanel
          task={task}
          user={user}
          onCancel={() => {
            setIsEditing(false);
            router.replace(`/tasks/${task.id}`, { scroll: false });
          }}
          onSaved={async () => {
            await refreshTask();
            setIsEditing(false);
            setNotice(isArabic ? 'تم حفظ تغييرات المهمة.' : 'Task changes saved.');
            router.replace(`/tasks/${task.id}`, { scroll: false });
          }}
        />
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
                uiText(isArabic, 'text0486')
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
                {uiText(isArabic, 'text0487')}
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
                  uiText(isArabic, 'text0117')
                }
                description={
                  uiText(isArabic, 'text0488')
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
                          {uiText(isArabic, 'text0489')}
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
                        {uiText(isArabic, 'text0490')}
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

                        {uiText(isArabic, 'text0056')}
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
                            {uiText(isArabic, 'text0118')}
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

                            {uiText(isArabic, 'text0119')}
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
                              {uiText(isArabic, 'text0120')}
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

                              {uiText(isArabic, 'text0119')}
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
                    {uiText(isArabic, 'text0121')}
                  </div>

                  <div
                    className="
                      mt-1
                      text-xs
                      text-slate-400
                    "
                  >
                    {uiText(isArabic, 'text0491')}
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
                        {uiText(isArabic, 'text0122')}
                      </div>

                      <p
                        className="
                          mt-1
                          text-sm
                          leading-6
                          text-brand-700
                        "
                      >
                        {uiText(isArabic, 'text0492')}
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

                          uiText(isArabic, 'text0123'),
                        ).finally(
                          () =>
                            setAssignmentBusy(
                              false,
                            ),
                        );
                      }}
                    >
                      {uiText(isArabic, 'text0124')}
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
                            uiText(isArabic, 'text0125'),

                          description:
                            uiText(isArabic, 'text0126'),

                          minLength:
                            10,

                          confirmLabel:
                            uiText(isArabic, 'text0127'),

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

                                uiText(isArabic, 'text0493'),
                              );
                            },
                        })
                      }
                    >
                      {uiText(isArabic, 'text0125')}
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
                    {uiText(isArabic, 'text0494')}
                  </strong>{' '}

                  {uiText(isArabic, 'text0495')}
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
                          {uiText(isArabic, 'text0496')}
                        </div>

                        <p
                          className="
                            mt-1
                            text-xs
                            leading-5
                            text-amber-700
                          "
                        >
                          {uiText(isArabic, 'text0736', { value0: REASSIGN_AFTER_DAYS })}
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
                      {uiText(isArabic, 'text0128')}
                    </div>

                    <p
                      className="
                        mt-1
                        text-xs
                        leading-5
                        text-emerald-700
                      "
                    >
                      {uiText(isArabic, 'text0497')}
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
                    {uiText(isArabic, 'text0129')}
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
                        {uiText(isArabic, 'text0498')}
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
                            uiText(isArabic, 'text0130')
                          )
                        : (
                            uiText(isArabic, 'text0053')
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
                      {uiText(isArabic, 'text0499')}
                    </div>

                    {latestRejectedAssignment.assignee ? (
                      <div className="mt-2 flex items-center gap-2 text-sm font-medium text-red-700">
                        <Avatar
                          name={latestRejectedAssignment.assignee.fullName}
                          avatarUrl={latestRejectedAssignment.assignee.avatarUrl}
                          size="sm"
                          className="shrink-0"
                        />
                        <span>{latestRejectedAssignment.assignee.fullName}</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm text-red-700">User</div>
                    )}

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
                          {uiText(isArabic, 'text0500')}
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
                      {uiText(isArabic, 'text0131')}
                    </label>

                    <div
                      className="
                        flex
                        flex-col
                        gap-2
                        sm:flex-row
                      "
                    >
                      <AvatarSelect
                        users={assignableUsers.filter(
                          (item) => item.id !== assignmentToReassign.assigneeId,
                        )}
                        value={reassignUserId}
                        onChange={setReassignUserId}
                        placeholder={uiText(isArabic, 'text0132')}
                      />

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
                        {uiText(isArabic, 'text0133')}
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
                    {uiText(isArabic, 'text0501')}
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
                            <div className="flex min-w-0 items-center gap-3">
                              {assignment.assignee && (
                                <Avatar
                                  name={assignment.assignee.fullName}
                                  avatarUrl={assignment.assignee.avatarUrl}
                                  size="sm"
                                  className="shrink-0"
                                />
                              )}

                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-700">
                                  {assignment.assignee?.fullName || 'Unknown user'}
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  {formatAssignmentDate(
                                    assignment.createdAt,
                                  )}
                                </div>
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
                                {uiText(isArabic, 'text0134')}
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
           * EVALUATION
           * ==================================================
           */}

          {(canRate ||
            (task.ratings &&
              task.ratings.length >
                0)) && (
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
                  uiText(isArabic, 'text1069')
                }
              />

              {canRate && (
                <div
                  className="
                    mt-4
                    space-y-3
                  "
                >
                  <div>
                    <label className="label">
                      {uiText(isArabic, 'text1060')}
                    </label>

                    <select
                      className="input"
                      value={
                        ratingScore
                      }
                      onChange={(
                        event,
                      ) =>
                        setRatingScore(
                          Number(
                            event.target.value,
                          ),
                        )
                      }
                    >
                      {[1, 2, 3, 4, 5].map(
                        (
                          n,
                        ) => (
                          <option
                            key={n}
                            value={n}
                          >
                            {n} / 5
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="label">
                      {uiText(isArabic, 'text1061')}
                    </label>

                    <textarea
                      className="input"
                      rows={3}
                      placeholder={
                        uiText(isArabic, 'text1070')
                      }
                      value={
                        ratingFeedback
                      }
                      onChange={(
                        event,
                      ) =>
                        setRatingFeedback(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <button
                    type="button"
                    className="
                      btn-primary
                      w-full
                      sm:w-auto
                    "
                    disabled={
                      ratingBusy
                    }
                    onClick={
                      submitRating
                    }
                  >
                    {ratingBusy
                      ? (
                          uiText(isArabic, 'text0081')
                        )
                      : myRating
                        ? (
                            uiText(isArabic, 'text1072')
                          )
                        : (
                            uiText(isArabic, 'text1071')
                          )}
                  </button>
                </div>
              )}

              {task.ratings &&
                task.ratings.length >
                  0 && (
                <div
                  className={
                    canRate
                      ? '\n                    mt-5\n                    border-t\n                    border-slate-100\n                    pt-5\n                    space-y-2\n                  '
                      : '\n                    mt-4\n                    space-y-2\n                  '
                  }
                >
                  {task.ratings.map(
                    (
                      r,
                    ) => (
                      <div
                        key={
                          r.id
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
                            items-center
                            justify-between
                            gap-3
                          "
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {r.ratedBy && (
                              <Avatar
                                name={r.ratedBy.fullName}
                                avatarUrl={r.ratedBy.avatarUrl}
                                size="sm"
                                className="shrink-0"
                              />
                            )}

                            <span className="truncate text-sm font-semibold text-slate-700">
                              {r.ratedBy?.fullName ||
                                uiText(isArabic, 'text1074')}
                            </span>
                          </div>

                          <span
                            className="
                              shrink-0
                              whitespace-nowrap
                              text-sm
                              font-semibold
                              text-amber-500
                            "
                          >
                            {'★'.repeat(
                              r.score,
                            )}

                            <span className="text-slate-300">
                              {'★'.repeat(
                                5 -
                                  r.score,
                              )}
                            </span>
                          </span>
                        </div>

                        {r.feedback && (
                          <p
                            className="
                              mt-2
                              text-sm
                              leading-6
                              text-slate-500
                            "
                          >
                            {
                              r.feedback
                            }
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>
          )}


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
                  uiText(isArabic, 'text0502')
                }
                description={
                  uiText(isArabic, 'text0503')
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
                        uiText(isArabic, 'text0135')
                      )
                    : (
                        uiText(isArabic, 'text0009')
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
                {uiText(isArabic, 'text0504')}
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
                  {uiText(isArabic, 'text0505')}
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
                  {uiText(isArabic, 'text0506')}
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
                      uiText(isArabic, 'text0507')
                    )
                  : (
                      uiText(isArabic, 'text0508')
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
                  uiText(isArabic, 'text0509')
                }
                description={
                  uiText(isArabic, 'text0510')
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
                    {uiText(isArabic, 'text0511')}
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
                    {uiText(isArabic, 'text0512')}
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
                      {uiText(isArabic, 'text0500')}
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

                          uiText(isArabic, 'text0513'),
                        )
                      }
                    >
                      {uiText(isArabic, 'text0357')}
                    </button>


                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() =>
                        setReasonModal({
                          title:
                            uiText(isArabic, 'text0514'),

                          description:
                            uiText(isArabic, 'text0515'),

                          minLength:
                            5,

                          confirmLabel:
                            uiText(isArabic, 'text0127'),

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

                                uiText(isArabic, 'text0516'),
                              );
                            },
                        })
                      }
                    >
                      {uiText(isArabic, 'text0127')}
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
                uiText(isArabic, 'text0136')
              }
              description={
                comments.length ===
                0
                  ? (
                      uiText(isArabic, 'text0137')
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
                    uiText(isArabic, 'text0138')
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
                          uiText(isArabic, 'text0139')
                        )
                      : (
                          uiText(isArabic, 'text0140')
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
                uiText(isArabic, 'text0141')
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
                  {uiText(isArabic, 'text0142')}
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
                  uiText(isArabic, 'text0297')
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
                  uiText(isArabic, 'text0143')
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
                      uiText(isArabic, 'text0144')
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
                uiText(isArabic, 'text0145')
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
                  uiText(isArabic, 'text0517')
                }
              >
                {currentAssignment
                  ?.assignee
                  ?.fullName ||
                  (
                    uiText(isArabic, 'text0115')
                  )}
              </InfoRow>


              <InfoRow
                label={
                  uiText(isArabic, 'text0146')
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
                  uiText(isArabic, 'text0483')
                }
              >
                {task.createdBy
                  ?.fullName ||
                  '—'}
              </InfoRow>


              {task.needsApproval && (
                <InfoRow
                  label={
                    uiText(isArabic, 'text0511')
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
                uiText(isArabic, 'text0518')
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
                  uiText(isArabic, 'text0374')
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
                  uiText(isArabic, 'text0371')
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
                  uiText(isArabic, 'text0432')
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
                      uiText(isArabic, 'text0519')
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
                uiText(isArabic, 'text0147')
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
                  uiText(isArabic, 'text0428')
                }
              >
                {formatDate(
                  task.startDate,
                  locale,
                )}
              </InfoRow>


              <InfoRow
                label={
                  uiText(isArabic, 'text0148')
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
                  uiText(isArabic, 'text0149')
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
                  uiText(isArabic, 'text0150')
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
                  {uiText(isArabic, 'text0151')}
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
                    uiText(isArabic, 'text0520')
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

                      {uiText(isArabic, 'text0152')}
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
                          uiText(isArabic, 'text0153')
                        )
                      : (
                          uiText(isArabic, 'text0737', { value0: openSubtaskCount })
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

