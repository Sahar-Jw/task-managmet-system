'use client';

import {
  useEffect,
  useState,
} from 'react';

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

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  AssignmentsApi,
  CommentsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Task,
  TaskAssignment,
  TaskComment,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

/*
 * A Pending Acceptance assignment can only be reassigned
 * after this many days without an Accept / Reject response.
 */
const REASSIGN_AFTER_DAYS =
  14;


/*
 * ============================================================
 * TASK STATUS WORKFLOW
 * ============================================================
 */

const NEXT_STATUS_OPTIONS: Record<
  string,
  string[]
> = {
  Pending: [
    'InProgress',
    'Finished',
  ],

  Unassigned: [
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
 * SMALL COMPONENTS
 * ============================================================
 */

function SectionTitle({
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


function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 py-3">
      <span className="text-sm text-slate-500">
        {label}
      </span>

      <div className="max-w-[65%] text-right text-sm font-medium text-slate-700">
        {children}
      </div>
    </div>
  );
}


/*
 * ============================================================
 * ASSIGNMENT HELPERS
 * ============================================================
 */

function assignmentAgeInDays(
  assignment: TaskAssignment,
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
  assignment: TaskAssignment,
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
  date?: string | null,
) {
  if (!date) {
    return '—';
  }

  return new Date(
    date,
  ).toLocaleString();
}


/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

function TaskDetailContent() {
  const {
    id,
  } = useParams<{
    id: string;
  }>();

  const router =
    useRouter();

  const {
    user,
  } = useAuth();

  const locale =
    useLocale();

  const isArabic =
    locale === 'ar';


  /*
   * ==========================================================
   * DATA
   * ==========================================================
   */

  const [
    task,
    setTask,
  ] = useState<Task | null>(
    null,
  );

  const [
    comments,
    setComments,
  ] = useState<
    TaskComment[]
  >([]);

  const [
    users,
    setUsers,
  ] = useState<User[]>(
    [],
  );


  /*
   * ==========================================================
   * PAGE STATE
   * ==========================================================
   */

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    notice,
    setNotice,
  ] = useState('');


  /*
   * ==========================================================
   * ASSIGNMENT STATE
   * ==========================================================
   */

  const [
    assignmentUserId,
    setAssignmentUserId,
  ] = useState('');

  const [
    reassignUserId,
    setReassignUserId,
  ] = useState('');

  const [
    assignmentBusy,
    setAssignmentBusy,
  ] = useState(false);


  /*
   * ==========================================================
   * COMMENT STATE
   * ==========================================================
   */

  const [
    newComment,
    setNewComment,
  ] = useState('');


  /*
   * ==========================================================
   * REASON MODAL
   * ==========================================================
   */

  const [
    reasonModal,
    setReasonModal,
  ] = useState<{
    title: string;
    description?: string;
    minLength: number;
    confirmLabel?: string;
    danger?: boolean;

    onConfirm: (
      reason: string,
    ) => void;
  } | null>(
    null,
  );


  /*
   * ==========================================================
   * LOAD TASK
   * ==========================================================
   */

  async function load() {
    setLoading(
      true,
    );

    try {
      const [
        taskResult,
        commentsResult,
      ] =
        await Promise.all([
          TasksApi.get(
            id,
          ),

          CommentsApi.list(
            id,
          ),
        ]);

      setTask(
        taskResult,
      );

      setComments(
        commentsResult,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load this task.',
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(() => {
    load();

    /*
     * Do not send isActive in the request.
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
        },
      )
      .catch(
        () => {},
      );

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    id,
  ]);


  /*
   * ==========================================================
   * FEEDBACK WRAPPER
   * ==========================================================
   */

  async function withFeedback(
    action:
      () => Promise<unknown>,
    success?: string,
  ) {
    setError('');
    setNotice('');

    try {
      await action();

      if (success) {
        setNotice(
          success,
        );
      }

      await load();
    } catch (
      err
    ) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong.',
      );
    }
  }


  /*
   * ==========================================================
   * LOADING / NOT FOUND
   * ==========================================================
   */

  if (loading) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500" />

        <p className="mt-3 text-sm text-slate-500">
          {isArabic
            ? 'جاري تحميل المهمة…'
            : 'Loading task…'}
        </p>
      </div>
    );
  }


  if (!task) {
    return (
      <div className="card p-8 text-center text-red-600">
        {error ||
          (isArabic
            ? 'المهمة غير موجودة.'
            : 'Task not found.')}
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
        (item) =>
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
   * ASSIGNMENT DATA
   * ==========================================================
   */

  const assignments =
    [
      ...(task.assignments ||
        []),
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


  /*
   * Current active assignment.
   *
   * Accepted and PendingAcceptance are considered active.
   */
  const currentAssignment =
    assignments.find(
      (assignment) =>
        assignment.status ===
          'PendingAcceptance' ||
        assignment.status ===
          'Accepted',
    );


  /*
   * Most recent rejected assignment.
   */
  const latestRejectedAssignment =
    assignments.find(
      (assignment) =>
        assignment.status ===
        'Rejected',
    );


  /*
   * Pending assignment that has received no response for 14 days.
   */
  const stalePendingAssignment =
    assignments.find(
      (assignment) =>
        assignment.status ===
          'PendingAcceptance' &&
        assignmentAgeInDays(
          assignment,
        ) >=
          REASSIGN_AFTER_DAYS,
    );


  /*
   * Assignment waiting for the currently logged in user.
   */
  const myPendingAssignment =
    assignments.find(
      (assignment) =>
        assignment.assigneeId ===
          user?.id &&
        assignment.status ===
          'PendingAcceptance',
    );


  /*
   * Creator/Admin can manage assignment workflow.
   */
  const canManageAssignment =
    (
      isAdmin ||
      isCreator
    ) &&
    task.status !==
      'Archived';


  /*
   * New assignment is allowed only when the Task does not
   * have an active assignment and there is no rejected
   * assignment waiting to be reassigned.
   */
  const canAssignNew =
    canManageAssignment &&
    !currentAssignment &&
    !latestRejectedAssignment;


  /*
   * ==========================================================
   * REASSIGNMENT RULE
   * ==========================================================
   *
   * Reassignment is allowed only:
   *
   * 1. after rejection
   *
   * OR
   *
   * 2. after PendingAcceptance has been unanswered for 14 days
   *
   * Accepted assignments cannot be reassigned.
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
   * CURRENT LANGUAGE
   * ==========================================================
   */

  const title =
    isArabic
      ? task.titleAr ||
        task.titleEn
      : task.titleEn ||
        task.titleAr;


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
   * STATUS OPTIONS
   * ==========================================================
   */

  let nextStatuses =
    NEXT_STATUS_OPTIONS[
      task.status
    ] ||
    [];


  /*
   * Pending assignment must be accepted before InProgress.
   */
  if (
    currentAssignment?.status ===
    'PendingAcceptance'
  ) {
    nextStatuses =
      nextStatuses.filter(
        (status) =>
          status !==
          'InProgress',
      );
  }


  /*
   * Approval-required Task cannot jump directly
   * from InProgress to Completed.
   */
  if (
    task.needsApproval &&
    task.status ===
      'InProgress' &&
    task.approvalStatus !==
      'Approved'
  ) {
    nextStatuses =
      nextStatuses.filter(
        (status) =>
          status !==
          'Completed',
      );
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

      setAssignmentUserId(
        '',
      );
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

      setReassignUserId(
        '',
      );
    } finally {
      setAssignmentBusy(
        false,
      );
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
       * ======================================================
       * BACK
       * ======================================================
       */}

      <button
        type="button"
        onClick={() =>
          router.back()
        }
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 transition hover:text-brand-700"
      >
        ←{' '}
        {isArabic
          ? 'رجوع'
          : 'Back'}
      </button>


      {/*
       * ======================================================
       * HEADER
       * ======================================================
       */}

      <div
        className="card overflow-hidden"
        style={
          task.color
            ? {
                borderTop:
                  `4px solid ${task.color}`,
              }
            : undefined
        }
      >
        <div className="p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
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
                  <span className="badge bg-red-100 text-red-700">
                    {isArabic
                      ? 'متأخرة'
                      : 'Overdue'}
                  </span>
                )}
              </div>


              <h1 className="mt-4 break-words text-2xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>


              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span>
                  {isArabic
                    ? 'أنشأها'
                    : 'Created by'}{' '}

                  <span className="font-medium text-slate-600">
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
              </div>
            </div>
          </div>
        </div>
      </div>


      {/*
       * ======================================================
       * MESSAGES
       * ======================================================
       */}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}


      {notice && (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {notice}
        </div>
      )}


      {/*
       * ======================================================
       * MAIN GRID
       * ======================================================
       */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">

        {/*
         * ====================================================
         * LEFT
         * ====================================================
         */}

        <main className="space-y-6">

          {/*
           * ==================================================
           * DESCRIPTION
           * ==================================================
           */}

          <section className="card p-6">
            <SectionTitle
              title={
                isArabic
                  ? 'وصف المهمة'
                  : 'Task Description'
              }
            />

            {description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {description}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {isArabic
                  ? 'لا يوجد وصف.'
                  : 'No description was provided.'}
              </p>
            )}
          </section>


          {/*
           * ==================================================
           * ASSIGNMENT
           * ==================================================
           */}

          <section className="card overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/60 p-6">
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


            <div className="p-6">

              {/*
               * ==============================================
               * CURRENT ACTIVE ASSIGNMENT
               * ==============================================
               */}

              {currentAssignment ? (
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {isArabic
                          ? 'المستخدم الحالي'
                          : 'Current assignee'}
                      </div>

                      <div className="mt-1 font-semibold text-slate-800">
                        {currentAssignment
                          .assignee
                          ?.fullName ||
                          'Unknown user'}
                      </div>

                      <div className="mt-2">
                        <StatusBadge
                          value={
                            currentAssignment.status
                          }
                        />
                      </div>
                    </div>


                    {currentAssignment.status ===
                      'PendingAcceptance' && (
                      <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                        {isArabic
                          ? 'بانتظار الرد'
                          : 'Waiting for response'}
                      </div>
                    )}


                    {currentAssignment.status ===
                      'Accepted' && (
                      <div className="rounded-lg bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                        {isArabic
                          ? 'تم قبول التكليف'
                          : 'Assignment accepted'}
                      </div>
                    )}
                  </div>


                  {currentAssignment.status ===
                    'PendingAcceptance' && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="text-xs text-slate-400">
                            {isArabic
                              ? 'تم التكليف منذ'
                              : 'Assignment age'}
                          </div>

                          <div className="mt-1 text-sm font-medium text-slate-700">
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
                          <div className="text-right">
                            <div className="text-xs text-slate-400">
                              {isArabic
                                ? 'إعادة التكليف متاحة بعد'
                                : 'Reassignment available in'}
                            </div>

                            <div className="mt-1 text-sm font-semibold text-amber-700">
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
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <div className="text-sm font-medium text-slate-700">
                    {isArabic
                      ? 'لا يوجد تكليف نشط'
                      : 'No active assignment'}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {isArabic
                      ? 'لا يوجد مستخدم مسؤول عن المهمة حالياً.'
                      : 'This task currently has no active assignee.'}
                  </div>
                </div>
              )}


              {/*
               * ==============================================
               * ASSIGNEE ACCEPT / REJECT
               * ==============================================
               */}

              {myPendingAssignment && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <div className="font-medium text-brand-900">
                    {isArabic
                      ? 'تم تكليفك بهذه المهمة.'
                      : 'This task has been assigned to you.'}
                  </div>

                  <p className="mt-1 text-sm text-brand-700">
                    {isArabic
                      ? 'اقبل المهمة لبدء العمل أو ارفضها مع توضيح السبب.'
                      : 'Accept it to begin work, or reject it with a reason.'}
                  </p>


                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() =>
                        withFeedback(
                          () =>
                            AssignmentsApi.accept(
                              myPendingAssignment.id,
                            ),
                          isArabic
                            ? 'تم قبول التكليف.'
                            : 'Assignment accepted.',
                        )
                      }
                    >
                      {isArabic
                        ? 'قبول التكليف'
                        : 'Accept assignment'}
                    </button>


                    <button
                      type="button"
                      className="btn-danger"
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


              {/*
               * ==============================================
               * WAITING — NOT YET ELIGIBLE FOR REASSIGN
               * ==============================================
               */}

              {canManageAssignment &&
                currentAssignment?.status ===
                  'PendingAcceptance' &&
                !stalePendingAssignment && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        ⏳
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-amber-800">
                          {isArabic
                            ? 'بانتظار رد المستخدم'
                            : 'Waiting for assignee response'}
                        </div>

                        <p className="mt-1 text-xs leading-5 text-amber-700">
                          {isArabic
                            ? `لا يمكن إعادة تكليف هذه المهمة حالياً. يصبح الخيار متاحاً بعد ${REASSIGN_AFTER_DAYS} يوماً بدون قبول أو رفض.`
                            : `This assignment cannot be reassigned yet. Reassignment becomes available after ${REASSIGN_AFTER_DAYS} days without an Accept or Reject response.`}
                        </p>

                        <div className="mt-2 text-xs font-semibold text-amber-800">
                          {assignmentDaysRemaining(
                            currentAssignment,
                          )}{' '}
                          {isArabic
                            ? 'يوم متبقي'
                            : 'day(s) remaining'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              {/*
               * ==============================================
               * ACCEPTED — NEVER REASSIGNABLE
               * ==============================================
               */}

              {canManageAssignment &&
                currentAssignment?.status ===
                  'Accepted' && (
                  <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
                    <div className="text-sm font-semibold text-green-800">
                      {isArabic
                        ? 'تم قبول المهمة'
                        : 'Assignment accepted'}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-green-700">
                      {isArabic
                        ? 'لا يمكن إعادة تكليف المهمة بعد قبولها.'
                        : 'This assignment can no longer be reassigned because the user already accepted it.'}
                    </p>
                  </div>
                )}


              {/*
               * ==============================================
               * INITIAL ASSIGNMENT
               * ==============================================
               */}

              {canAssignNew && (
                <div className="mt-5 border-t border-slate-100 pt-5">
                  <label className="label">
                    {isArabic
                      ? 'تكليف المهمة'
                      : 'Assign this task'}
                  </label>

                  <div className="flex flex-col gap-2 sm:flex-row">
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
                      className="btn-primary shrink-0"
                      disabled={
                        !assignmentUserId ||
                        assignmentBusy
                      }
                      onClick={
                        assignTask
                      }
                    >
                      {assignmentBusy
                        ? isArabic
                          ? 'جاري التكليف…'
                          : 'Assigning…'
                        : isArabic
                          ? 'تكليف'
                          : 'Assign'}
                    </button>
                  </div>


                  <p className="mt-2 text-xs text-slate-400">
                    {isArabic
                      ? 'يجب على المستخدم قبول التكليف قبل بدء العمل.'
                      : 'The selected user must accept the assignment before work begins.'}
                  </p>
                </div>
              )}


              {/*
               * ==============================================
               * REJECTED ASSIGNMENT
               * ==============================================
               */}

              {latestRejectedAssignment &&
                !currentAssignment && (
                  <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
                        !
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-red-800">
                          {isArabic
                            ? 'تم رفض التكليف'
                            : 'Assignment rejected'}
                        </div>

                        <p className="mt-1 text-sm text-red-700">
                          {latestRejectedAssignment
                            .assignee
                            ?.fullName ||
                            'User'}
                        </p>


                        {latestRejectedAssignment.rejectionReason && (
                          <div className="mt-3 rounded-lg bg-white/60 p-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-red-500">
                              {isArabic
                                ? 'سبب الرفض'
                                : 'Rejection reason'}
                            </div>

                            <p className="mt-1 text-sm leading-6 text-red-700">
                              {
                                latestRejectedAssignment.rejectionReason
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}


              {/*
               * ==============================================
               * REASSIGN
               *
               * ONLY renders when:
               *
               * - previous Assignment was rejected
               *
               * OR
               *
               * - PendingAcceptance is >= 14 days old
               * ==============================================
               */}

              {canReassign &&
                assignmentToReassign && (
                  <div className="mt-5 border-t border-slate-100 pt-5">
                    <div className="mb-4">
                      <label className="label">
                        {latestRejectedAssignment
                          ? isArabic
                            ? 'إعادة تكليف المهمة المرفوضة'
                            : 'Reassign rejected task'
                          : isArabic
                            ? 'إعادة تكليف المهمة غير المجاب عليها'
                            : 'Reassign unanswered task'}
                      </label>


                      {!latestRejectedAssignment &&
                        stalePendingAssignment && (
                          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                            {isArabic
                              ? `لم يقبل أو يرفض المستخدم هذه المهمة منذ ${Math.floor(
                                  assignmentAgeInDays(
                                    stalePendingAssignment,
                                  ),
                                )} يوماً، لذلك يمكن إعادة تكليفها الآن.`
                              : `The assignee has not accepted or rejected this assignment for ${Math.floor(
                                  assignmentAgeInDays(
                                    stalePendingAssignment,
                                  ),
                                )} days, so reassignment is now available.`}
                          </div>
                        )}
                    </div>


                    <div className="flex flex-col gap-2 sm:flex-row">
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
                        className="btn-primary shrink-0"
                        disabled={
                          !reassignUserId ||
                          assignmentBusy
                        }
                        onClick={
                          reassignTask
                        }
                      >
                        {assignmentBusy
                          ? isArabic
                            ? 'جاري إعادة التكليف…'
                            : 'Reassigning…'
                          : isArabic
                            ? 'إعادة تكليف'
                            : 'Reassign'}
                      </button>
                    </div>


                    <p className="mt-2 text-xs text-slate-400">
                      {isArabic
                        ? 'سيبقى التكليف السابق محفوظاً في السجل، وسيحصل المستخدم الجديد على تكليف جديد بانتظار القبول.'
                        : 'The previous assignment remains in the history. The new user receives a new Pending Acceptance assignment.'}
                    </p>
                  </div>
                )}


              {/*
               * ==============================================
               * HISTORY
               * ==============================================
               */}

              {assignments.length >
                0 && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {isArabic
                      ? 'سجل التكليف'
                      : 'Assignment history'}
                  </h3>


                  <div className="mt-3 space-y-2">
                    {assignments.map(
                      (
                        assignment,
                      ) => (
                        <div
                          key={
                            assignment.id
                          }
                          className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                        >
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <div className="text-sm font-medium text-slate-700">
                                {assignment
                                  .assignee
                                  ?.fullName ||
                                  'Unknown user'}
                              </div>

                              <div className="mt-1 text-xs text-slate-400">
                                {isArabic
                                  ? 'تم التكليف'
                                  : 'Assigned'}{' '}
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


                          {assignment.rejectionReason && (
                            <div className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-600">
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


                          {assignment.acceptedAt && (
                            <div className="mt-2 text-xs text-slate-400">
                              {isArabic
                                ? 'تم القبول:'
                                : 'Accepted:'}{' '}

                              {formatAssignmentDate(
                                assignment.acceptedAt,
                              )}
                            </div>
                          )}


                          {assignment.rejectedAt && (
                            <div className="mt-2 text-xs text-slate-400">
                              {isArabic
                                ? 'تم الرفض:'
                                : 'Rejected:'}{' '}

                              {formatAssignmentDate(
                                assignment.rejectedAt,
                              )}
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

          <section className="card p-6">
            <SectionTitle
              title={
                isArabic
                  ? 'سير المهمة'
                  : 'Task Workflow'
              }
            />


            {currentAssignment?.status ===
              'PendingAcceptance' && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  {isArabic
                    ? 'المهمة تنتظر قبول المستخدم. عند القبول ستنتقل تلقائياً إلى In Progress.'
                    : 'The task is waiting for the assigned user to accept it. Acceptance automatically moves the task to In Progress.'}
                </div>
              )}


            {task.needsApproval &&
              task.status ===
                'InProgress' &&
              task.approvalStatus !==
                'Approved' && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
                  {isArabic
                    ? 'هذه المهمة تحتاج موافقة. عندما يصبح العمل جاهزاً انقلها إلى Pending Approval.'
                    : 'This task requires approval. When the work is ready, move it to Pending Approval.'}
                </div>
              )}


            {nextStatuses.length >
              0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {nextStatuses.map(
                  (
                    nextStatus,
                  ) => (
                    <button
                      key={
                        nextStatus
                      }
                      type="button"
                      className={
                        nextStatus ===
                        'Finished'
                          ? 'btn-secondary'
                          : 'btn-primary'
                      }
                      onClick={() => {
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
                      }}
                    >
                      {isArabic
                        ? `انتقال إلى ${nextStatus}`
                        : `Move to ${nextStatus}`}
                    </button>
                  ),
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                {isArabic
                  ? 'لا توجد إجراءات متاحة حالياً.'
                  : 'No workflow actions are currently available.'}
              </p>
            )}
          </section>


          {/*
           * ==================================================
           * APPROVAL
           * ==================================================
           */}

          {task.needsApproval && (
            <section className="card p-6">
              <SectionTitle
                title={
                  isArabic
                    ? 'الموافقة'
                    : 'Approval'
                }
              />


              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-400">
                    {isArabic
                      ? 'الموافق'
                      : 'Approver'}
                  </div>

                  <div className="mt-1 font-medium text-slate-700">
                    {task.approver
                      ?.fullName ||
                      '—'}
                  </div>
                </div>


                <div className="rounded-xl bg-slate-50 p-4">
                  <div className="text-xs text-slate-400">
                    {isArabic
                      ? 'حالة الموافقة'
                      : 'Approval status'}
                  </div>

                  <div className="mt-2">
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
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                    <div className="text-xs font-semibold uppercase text-red-500">
                      {isArabic
                        ? 'سبب الرفض'
                        : 'Rejection reason'}
                    </div>

                    <p className="mt-2 text-sm text-red-700">
                      {
                        task.rejectionReason
                      }
                    </p>
                  </div>
                )}


              {canDecideApproval && (
                <div className="mt-5 flex flex-wrap gap-2">
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
                                ? 'تم رفض المهمة وإعادتها إلى In Progress.'
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

          <section className="card p-6">
            <SectionTitle
              title={
                isArabic
                  ? 'التعليقات'
                  : 'Comments'
              }
              description={
                comments.length ===
                0
                  ? isArabic
                    ? 'لا توجد تعليقات بعد.'
                    : 'No comments yet.'
                  : `${comments.length} ${
                      comments.length ===
                      1
                        ? 'comment'
                        : 'comments'
                    }`
              }
            />


            {comments.length >
              0 && (
              <div className="mt-4 space-y-3">
                {comments.map(
                  (
                    comment,
                  ) => (
                    <div
                      key={
                        comment.id
                      }
                      className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-sm font-medium text-slate-700">
                          {comment.author
                            ?.fullName ||
                            'User'}
                        </div>

                        <div className="text-xs text-slate-400">
                          {new Date(
                            comment.createdAt,
                          ).toLocaleString(
                            locale,
                          )}
                        </div>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {
                          comment.content
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}


            {task.status !==
              'Archived' && (
              <form
                className="mt-5 flex gap-2"
                onSubmit={(
                  event,
                ) => {
                  event.preventDefault();

                  if (
                    !newComment.trim()
                  ) {
                    return;
                  }

                  withFeedback(
                    async () => {
                      await CommentsApi.add(
                        task.id,
                        newComment.trim(),
                      );

                      setNewComment(
                        '',
                      );
                    },
                  );
                }}
              >
                <input
                  className="input"
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

                <button
                  type="submit"
                  className="btn-primary shrink-0"
                >
                  {isArabic
                    ? 'إرسال'
                    : 'Post'}
                </button>
              </form>
            )}
          </section>
        </main>


        {/*
         * ====================================================
         * SIDEBAR
         * ====================================================
         */}

        <aside className="space-y-6">

          {/*
           * STATUS
           */}

          <section className="card p-5">
            <SectionTitle
              title={
                isArabic
                  ? 'حالة المهمة'
                  : 'Task Status'
              }
            />


            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center">
              <StatusBadge
                value={
                  task.status
                }
                listType="task_status"
              />

              {overdue && (
                <div className="mt-2 text-xs font-medium text-red-600">
                  {isArabic
                    ? 'تجاوزت الموعد النهائي'
                    : 'Past deadline'}
                </div>
              )}
            </div>


            <div className="mt-4 divide-y divide-slate-100">
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
            </div>
          </section>


          {/*
           * PEOPLE
           */}

          <section className="card p-5">
            <SectionTitle
              title={
                isArabic
                  ? 'الأشخاص'
                  : 'People'
              }
            />


            <div className="mt-3 divide-y divide-slate-100">
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
                  (isArabic
                    ? 'غير مسندة'
                    : 'Unassigned')}
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


          {/*
           * ORGANIZATION
           */}

          <section className="card p-5">
            <SectionTitle
              title={
                isArabic
                  ? 'التنظيم'
                  : 'Organization'
              }
            />


            <div className="mt-3 divide-y divide-slate-100">
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
                  ?.name ||
                  '—'}
              </InfoRow>
            </div>
          </section>


          {/*
           * SCHEDULE
           */}

          <section className="card p-5">
            <SectionTitle
              title={
                isArabic
                  ? 'الجدول الزمني'
                  : 'Schedule'
              }
            />


            <div className="mt-3 divide-y divide-slate-100">
              <InfoRow
                label={
                  isArabic
                    ? 'تاريخ البدء'
                    : 'Start'
                }
              >
                {task.startDate ||
                  '—'}
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
                      ? 'text-red-600'
                      : ''
                  }
                >
                  {task.deadlineDate ||
                    '—'}
                </span>
              </InfoRow>


              <InfoRow
                label={
                  isArabic
                    ? 'الانتهاء الفعلي'
                    : 'Actual end'
                }
              >
                {task.actualEndDate
                  ? new Date(
                      task.actualEndDate,
                    ).toLocaleDateString(
                      locale,
                    )
                  : '—'}
              </InfoRow>
            </div>
          </section>


          {/*
           * BUDGET
           */}

          {task.needsBudget && (
            <section className="card p-5">
              <SectionTitle
                title={
                  isArabic
                    ? 'الميزانية'
                    : 'Budget'
                }
              />


              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="text-xs text-slate-400">
                  {isArabic
                    ? 'النطاق'
                    : 'Range'}
                </div>

                <div className="mt-1 text-lg font-semibold text-slate-800">
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


export default function TaskDetailPage() {
  return (
    <ProtectedRoute>
      <TaskDetailContent />
    </ProtectedRoute>
  );
}