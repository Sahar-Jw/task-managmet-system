'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useLocale,
} from 'next-intl';

import StatusBadge from '@/components/StatusBadge';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  ApiError,
} from '@/lib/api';

import {
  AssignmentsApi,
  SettingsApi,
  TasksApi,
  UsersApi,
} from '@/lib/endpoints';

import type {
  Setting,
  Task,
  TaskAssignment,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

interface SubtasksPanelProps {
  task: Task;

  onChanged:
    () => Promise<void>;
}


type SubtaskForm = {
  title:
    string;

  description:
    string;

  priority:
    string;

  assigneeId:
    string;

  startDate:
    string;

  deadlineDate:
    string;
};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

const CLOSED_STATUSES = [
  'Completed',
  'Finished',
  'Archived',
];


function isClosed(
  task: Task,
) {
  return CLOSED_STATUSES.includes(
    task.status,
  );
}


function formatDate(
  value?:
    string | null,

  locale?:
    string,
) {
  if (!value) {
    return '—';
  }


  return new Date(
    `${value}T00:00:00`,
  ).toLocaleDateString(
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


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function SubtasksPanel({
  task,
  onChanged,
}: SubtasksPanelProps) {
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
   * STATE
   * ==========================================================
   */

  const [
    modalOpen,
    setModalOpen,
  ] =
    useState(
      false,
    );


  const [
    users,
    setUsers,
  ] =
    useState<User[]>(
      [],
    );


  const [
    priorities,
    setPriorities,
  ] =
    useState<Setting[]>(
      [],
    );


  const [
    form,
    setForm,
  ] =
    useState<SubtaskForm>({
      title:
        '',

      description:
        '',

      priority:
        task.priority ||
        'Medium',

      assigneeId:
        '',

      startDate:
        task.startDate ||
        '',

      deadlineDate:
        task.deadlineDate ||
        '',
    });


  const [
    submitting,
    setSubmitting,
  ] =
    useState(
      false,
    );


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    success,
    setSuccess,
  ] =
    useState('');


  /*
   * ==========================================================
   * LOOKUPS
   * ==========================================================
   */

  useEffect(() => {
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


    SettingsApi.list(
      'task_priority',
      true,
    )
      .then(
        setPriorities,
      )
      .catch(
        () => {},
      );
  }, []);


  /*
   * ==========================================================
   * LANGUAGE
   * ==========================================================
   */

  function taskTitle(
    value: Task,
  ) {
    return isArabic
      ? value.titleAr ||
          value.titleEn
      : value.titleEn ||
          value.titleAr;
  }


  function priorityLabel(
    setting:
      Setting,
  ) {
    return isArabic
      ? setting.codeAr ||
          setting.codeEn ||
          setting.key
      : setting.codeEn ||
          setting.codeAr ||
          setting.key;
  }


  /*
   * ==========================================================
   * CHILDREN
   * ==========================================================
   */

  const subtasks =
    useMemo(
      () =>
        [
          ...(
            task.subTasks ||
            []
          ),
        ].sort(
          (
            a,
            b,
          ) => {
            /*
             * Open work first.
             */
            const aClosed =
              isClosed(
                a,
              );

            const bClosed =
              isClosed(
                b,
              );


            if (
              aClosed !==
              bClosed
            ) {
              return aClosed
                ? 1
                : -1;
            }


            /*
             * Then deadline.
             */
            if (
              a.deadlineDate &&
              b.deadlineDate
            ) {
              return a.deadlineDate.localeCompare(
                b.deadlineDate,
              );
            }


            if (
              a.deadlineDate
            ) {
              return -1;
            }


            if (
              b.deadlineDate
            ) {
              return 1;
            }


            return new Date(
              a.createdAt,
            ).getTime() -
              new Date(
                b.createdAt,
              ).getTime();
          },
        ),
      [
        task.subTasks,
      ],
    );


  const completedCount =
    subtasks.filter(
      isClosed,
    ).length;


  const openCount =
    subtasks.length -
    completedCount;


  const progress =
    subtasks.length >
    0
      ? Math.round(
          (
            completedCount /
            subtasks.length
          ) *
            100,
        )
      : 0;


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


  /*
   * The assigned User may split the Parent only AFTER accepting
   * the assignment.
   */
  const hasAcceptedAssignment =
    Boolean(
      task.assignments?.some(
        (
          assignment,
        ) =>
          assignment.assigneeId ===
            user?.id &&
          assignment.status ===
            'Accepted',
      ),
    );


  /*
   * One-level hierarchy only.
   *
   * A Sub-task cannot create another Sub-task.
   */
  const isSubtask =
    Boolean(
      task.parentTaskId,
    );


  const taskClosed =
    CLOSED_STATUSES.includes(
      task.status,
    );


  const canCreateSubtask =
    !isSubtask &&
    !taskClosed &&
    Boolean(
      isAdmin ||
      isCreator ||
      hasAcceptedAssignment,
    );


  /*
   * ==========================================================
   * USERS
   * ==========================================================
   */

  const assignableUsers =
    useMemo(
      () =>
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
          ),
      [
        users,
      ],
    );


  /*
   * ==========================================================
   * MODAL
   * ==========================================================
   */

 function openModal() {
  setError('');
  setSuccess('');

  /*
   * Normal users can default the Subtask assignment to themselves.
   *
   * Admins cannot be Task assignees, so for Admin the Subtask
   * must default to Unassigned.
   */
  const defaultAssigneeId =
    user &&
    user.role.name !== 'ADMIN'
      ? user.id
      : '';

  setForm({
    title: '',

    description: '',

    priority:
      task.priority ||
      'Medium',

    assigneeId:
      defaultAssigneeId,

    startDate:
      task.startDate ||
      '',

    deadlineDate:
      task.deadlineDate ||
      '',
  });

  setModalOpen(
    true,
  );
}


  function closeModal() {
    if (
      submitting
    ) {
      return;
    }


    setModalOpen(
      false,
    );

    setError('');
  }


  /*
   * ==========================================================
   * CREATE SUBTASK
   * ==========================================================
   */

  async function createSubtask(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    if (
      !form.title.trim()
    ) {
      setError(
        isArabic
          ? 'عنوان المهمة الفرعية مطلوب.'
          : 'Subtask title is required.',
      );

      return;
    }


    if (
      !task.departmentId
    ) {
      setError(
        isArabic
          ? 'المهمة الرئيسية لا تحتوي على قسم.'
          : 'The parent task does not have a Department.',
      );

      return;
    }


    if (
      form.startDate &&
      form.deadlineDate &&
      form.deadlineDate <
        form.startDate
    ) {
      setError(
        isArabic
          ? 'الموعد النهائي لا يمكن أن يكون قبل تاريخ البدء.'
          : 'Deadline cannot be before the start date.',
      );

      return;
    }


    if (
      task.startDate &&
      form.startDate &&
      form.startDate <
        task.startDate
    ) {
      setError(
        isArabic
          ? 'المهمة الفرعية لا يمكن أن تبدأ قبل المهمة الرئيسية.'
          : 'A subtask cannot start before its parent task.',
      );

      return;
    }


    if (
      task.deadlineDate &&
      form.deadlineDate &&
      form.deadlineDate >
        task.deadlineDate
    ) {
      setError(
        isArabic
          ? 'موعد المهمة الفرعية لا يمكن أن يتجاوز موعد المهمة الرئيسية.'
          : 'A subtask deadline cannot exceed the parent deadline.',
      );

      return;
    }


    setSubmitting(
      true,
    );

    setError('');
    setSuccess('');


    let createdTask:
      Task | null =
      null;


    try {
      /*
       * ======================================================
       * CREATE CHILD TASK
       * ======================================================
       *
       * Organization is inherited from the Parent.
       *
       * This prevents a Sub-task from accidentally appearing
       * under a different Project / Department / Branch.
       */

      createdTask =
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
            task.taskType,

          priority:
            form.priority,

          color:
            task.color,

          branchId:
            task.branchId,

          departmentId:
            task.departmentId,

          projectId:
            task.projectId,

          parentTaskId:
            task.id,

          /*
           * Keep the first version simple.
           *
           * Approval and Budget still exist on real Task records
           * and can be expanded later if you decide Sub-tasks
           * also need those workflows.
           */
          needsApproval:
            false,

          needsBudget:
            false,

          startDate:
            form.startDate ||
            undefined,

          deadlineDate:
            form.deadlineDate ||
            undefined,
        });


      /*
       * ======================================================
       * OPTIONAL ASSIGNMENT
       * ======================================================
       */

      if (
        form.assigneeId
      ) {
        const assignment =
          await AssignmentsApi.assign(
            createdTask.id,
            form.assigneeId,
            form.deadlineDate ||
              undefined,
          ) as TaskAssignment;


        /*
         * If I create a Step for myself, don't make me accept
         * my own assignment manually.
         */
        if (
          form.assigneeId ===
            user?.id &&
          assignment?.id
        ) {
          await AssignmentsApi.accept(
            assignment.id,
          );
        }
      }


      setModalOpen(
        false,
      );


      setSuccess(
        isArabic
          ? 'تمت إضافة المهمة الفرعية.'
          : 'Subtask added successfully.',
      );


      await onChanged();
    } catch (
      err
    ) {
      /*
       * If Task creation worked but Assignment creation failed,
       * DO NOT create another Task.
       */
      if (
        createdTask
      ) {
        setError(
          err instanceof
            ApiError
            ? (
                isArabic
                  ? `تم إنشاء المهمة الفرعية، لكن تعذر التكليف: ${err.message}`
                  : `The subtask was created, but assignment failed: ${err.message}`
              )
            : (
                isArabic
                  ? 'تم إنشاء المهمة الفرعية، لكن تعذر تكليف المستخدم.'
                  : 'The subtask was created, but the assignment could not be created.'
              ),
        );


        await onChanged();

        return;
      }


      setError(
        err instanceof
          ApiError
          ? err.message
          : isArabic
            ? 'تعذر إنشاء المهمة الفرعية.'
            : 'Could not create the subtask.',
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CHILD VIEW
   * ==========================================================
   */

  if (
    isSubtask
  ) {
    return (
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              ↳
            </div>


            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-[.12em] text-brand-600">
                {isArabic
                  ? 'مهمة فرعية'
                  : 'Subtask'}
              </div>


              <h2 className="mt-1 text-base font-semibold text-slate-900">
                {isArabic
                  ? 'جزء من مهمة رئيسية'
                  : 'Part of a parent task'}
              </h2>
            </div>
          </div>
        </div>


        <div className="p-5 sm:p-6">
          {task.parentTask ? (
            <Link
              href={`/tasks/${task.parentTask.id}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200 hover:bg-brand-50/30"
            >
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {isArabic
                    ? 'المهمة الرئيسية'
                    : 'Parent task'}
                </div>


                <div className="mt-1 truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                  {taskTitle(
                    task.parentTask,
                  )}
                </div>
              </div>


              <span className="shrink-0 text-brand-600">
                {isArabic
                  ? '←'
                  : '→'}
              </span>
            </Link>
          ) : (
            <div className="text-sm text-slate-400">
              {isArabic
                ? 'تعذر تحميل المهمة الرئيسية.'
                : 'Parent task information is unavailable.'}
            </div>
          )}
        </div>
      </section>
    );
  }


  /*
   * ==========================================================
   * PARENT VIEW
   * ==========================================================
   */

  return (
    <>
      <section className="card overflow-hidden">
        {/*
         * ====================================================
         * HEADER
         * ====================================================
         */}

        <div className="border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg font-semibold text-brand-700">
                  ⑂
                </div>


                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {isArabic
                      ? 'تقسيم العمل'
                      : 'Work breakdown'}
                  </h2>


                  <p className="mt-1 text-sm text-slate-500">
                    {isArabic
                      ? 'قسّم المهمة إلى خطوات أصغر وتابع تقدمها.'
                      : 'Break this task into smaller steps and track their progress.'}
                  </p>
                </div>
              </div>
            </div>


            {canCreateSubtask && (
              <button
                type="button"
                className="btn-primary shrink-0"
                onClick={
                  openModal
                }
              >
                +{' '}

                {isArabic
                  ? 'مهمة فرعية'
                  : 'Add subtask'}
              </button>
            )}
          </div>
        </div>


        {/*
         * ====================================================
         * PROGRESS
         * ====================================================
         */}

        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {subtasks.length ===
                0
                  ? (
                      isArabic
                        ? 'لم يتم تقسيم المهمة بعد'
                        : 'No subtasks yet'
                    )
                  : (
                      isArabic
                        ? `${completedCount} من ${subtasks.length} مكتملة`
                        : `${completedCount} of ${subtasks.length} completed`
                    )}
              </div>


              {subtasks.length >
                0 && (
                <div className="mt-1 text-xs text-slate-400">
                  {openCount >
                  0
                    ? (
                        isArabic
                          ? `${openCount} خطوة متبقية`
                          : `${openCount} step${openCount === 1 ? '' : 's'} remaining`
                      )
                    : (
                        isArabic
                          ? 'جميع الخطوات مكتملة — المهمة الرئيسية جاهزة للإنهاء.'
                          : 'All steps are complete — the parent task is ready to finish.'
                      )}
                </div>
              )}
            </div>


            {subtasks.length >
              0 && (
              <div className="text-2xl font-semibold tracking-tight text-slate-900">
                {progress}%
              </div>
            )}
          </div>


          {subtasks.length >
            0 && (
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{
                  width:
                    `${progress}%`,
                }}
              />
            </div>
          )}
        </div>


        {/*
         * ====================================================
         * SUBTASK LIST
         * ====================================================
         */}

        {subtasks.length ===
        0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl text-slate-400">
              ⑂
            </div>


            <h3 className="mt-3 text-sm font-semibold text-slate-700">
              {isArabic
                ? 'لا توجد مهام فرعية'
                : 'No subtasks yet'}
            </h3>


            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-400">
              {canCreateSubtask
                ? (
                    isArabic
                      ? 'ابدأ بتقسيم هذه المهمة إلى خطوات عمل أصغر.'
                      : 'Break this task into smaller pieces of work when you are ready.'
                  )
                : (
                    isArabic
                      ? 'يمكن للمسؤول أو منشئ المهمة أو المستخدم الذي قبل المهمة تقسيمها.'
                      : 'The Admin, task creator, or user who accepted this task can create subtasks.'
                  )}
            </p>


            {canCreateSubtask && (
              <button
                type="button"
                onClick={
                  openModal
                }
                className="btn-secondary mt-4"
              >
                +{' '}

                {isArabic
                  ? 'إضافة أول خطوة'
                  : 'Add first step'}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {subtasks.map(
              (
                child,
                index,
              ) => {
                const childClosed =
                  isClosed(
                    child,
                  );


                const childOverdue =
                  Boolean(
                    child.deadlineDate &&
                    child.deadlineDate <
                      new Date()
                        .toISOString()
                        .slice(
                          0,
                          10,
                        ) &&
                    !childClosed,
                  );


                return (
                  <Link
                    key={
                      child.id
                    }
                    href={`/tasks/${child.id}`}
                    className="group flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-50/70 sm:px-6 lg:flex-row lg:items-center"
                  >
                    {/*
                     * STEP NUMBER / COMPLETE
                     */}

                    <div
                      className={`
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        text-xs
                        font-bold
                        ${
                          childClosed
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }
                      `}
                    >
                      {childClosed
                        ? '✓'
                        : index + 1}
                    </div>


                    {/*
                     * TITLE
                     */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`
                            truncate
                            text-sm
                            font-semibold
                            transition
                            group-hover:text-brand-700
                            ${
                              childClosed
                                ? 'text-slate-500'
                                : 'text-slate-850'
                            }
                          `}
                        >
                          {taskTitle(
                            child,
                          )}
                        </h3>


                        {childOverdue && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">
                            {isArabic
                              ? 'متأخرة'
                              : 'Overdue'}
                          </span>
                        )}
                      </div>


                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <StatusBadge
                          value={
                            child.status
                          }
                          listType="task_status"
                        />


                        <StatusBadge
                          value={
                            child.priority
                          }
                          listType="task_priority"
                        />
                      </div>
                    </div>


                    {/*
                     * ASSIGNEE
                     */}

                    <div className="min-w-[150px]">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {isArabic
                          ? 'المكلف'
                          : 'Assigned to'}
                      </div>


                      <div className="mt-1 truncate text-xs font-medium text-slate-700">
                        {child.assignedTo
                          ?.fullName ||
                          (
                            isArabic
                              ? 'غير مسندة'
                              : 'Unassigned'
                          )}
                      </div>
                    </div>


                    {/*
                     * DEADLINE
                     */}

                    <div className="min-w-[130px]">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        {isArabic
                          ? 'الموعد'
                          : 'Deadline'}
                      </div>


                      <div
                        className={`
                          mt-1
                          text-xs
                          font-medium
                          ${
                            childOverdue
                              ? 'text-red-600'
                              : 'text-slate-700'
                          }
                        `}
                      >
                        {formatDate(
                          child.deadlineDate,
                          locale,
                        )}
                      </div>
                    </div>


                    <span className="shrink-0 text-slate-300 transition group-hover:text-brand-500">
                      {isArabic
                        ? '←'
                        : '→'}
                    </span>
                  </Link>
                );
              },
            )}
          </div>
        )}


        {/*
         * ====================================================
         * FOOTER INFO
         * ====================================================
         */}

        {openCount >
          0 && (
          <div className="border-t border-slate-100 bg-amber-50/40 px-5 py-3 text-xs text-amber-700 sm:px-6">
            {isArabic
              ? 'يجب إكمال أو إنهاء جميع المهام الفرعية قبل إكمال المهمة الرئيسية.'
              : 'All open subtasks must be completed or finished before the parent task can be completed.'}
          </div>
        )}
      </section>


      {success && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {
            success
          }
        </div>
      )}


      {error &&
        !modalOpen && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {
            error
          }
        </div>
      )}


      {/*
       * ======================================================
       * CREATE MODAL
       * ======================================================
       */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <form
            onSubmit={
              createSubtask
            }
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/*
             * HEADER
             */}

            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.12em] text-brand-600">
                  {isArabic
                    ? 'تقسيم المهمة'
                    : 'Work breakdown'}
                </div>


                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {isArabic
                    ? 'إضافة مهمة فرعية'
                    : 'Add subtask'}
                </h2>


                <p className="mt-1 text-sm text-slate-500">
                  {isArabic
                    ? 'أنشئ خطوة أصغر ضمن المهمة الرئيسية.'
                    : 'Create a smaller piece of work under this parent task.'}
                </p>
              </div>


              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  closeModal
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>


            <div className="space-y-5 p-5 sm:p-6">
              {/*
               * PARENT
               */}

              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                  {isArabic
                    ? 'المهمة الرئيسية'
                    : 'Parent task'}
                </div>


                <div className="mt-1 text-sm font-semibold text-brand-900">
                  {taskTitle(
                    task,
                  )}
                </div>
              </div>


              {/*
               * TITLE
               */}

              <div>
                <label className="label">
                  {isArabic
                    ? 'عنوان المهمة الفرعية'
                    : 'Subtask title'}
                </label>


                <input
                  required
                  autoFocus
                  maxLength={
                    255
                  }
                  className="input"
                  value={
                    form.title
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        title:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder={
                    isArabic
                      ? 'مثال: جمع بيانات الأقسام'
                      : 'e.g. Collect department data'
                  }
                />
              </div>


              {/*
               * DESCRIPTION
               */}

              <div>
                <label className="label">
                  {isArabic
                    ? 'الوصف'
                    : 'Description'}{' '}

                  <span className="font-normal text-slate-400">
                    {isArabic
                      ? '(اختياري)'
                      : '(optional)'}
                  </span>
                </label>


                <textarea
                  rows={
                    4
                  }
                  className="input"
                  value={
                    form.description
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
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
                {/*
                 * PRIORITY
                 */}

                <div>
                  <label className="label">
                    {isArabic
                      ? 'الأهمية'
                      : 'Importance'}
                  </label>


                  <select
                    required
                    className="input"
                    value={
                      form.priority
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          priority:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    {priorities
                      .filter(
                        (
                          item,
                        ) =>
                          Boolean(
                            item.key,
                          ),
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
                              item.key
                            }
                          >
                            {priorityLabel(
                              item,
                            )}
                          </option>
                        ),
                      )}
                  </select>
                </div>


                {/*
                 * ASSIGNEE
                 */}

                <div>
                  <label className="label">
                    {isArabic
                      ? 'التكليف'
                      : 'Assign to'}{' '}

                    <span className="font-normal text-slate-400">
                      {isArabic
                        ? '(اختياري)'
                        : '(optional)'}
                    </span>
                  </label>


                  <select
                    className="input"
                    value={
                      form.assigneeId
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          assigneeId:
                            event.target.value,
                        }),
                      )
                    }
                  >
                    <option value="">
                      {isArabic
                        ? 'بدون تكليف'
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
                          {
                            item.fullName
                          }

                          {item.id ===
                          user?.id
                            ? (
                                isArabic
                                  ? ' — أنا'
                                  : ' — Me'
                              )
                            : ''}
                        </option>
                      ),
                    )}
                  </select>


                  <p className="mt-1 text-xs text-slate-400">
                    {!form.assigneeId
                        ? (
                            isArabic
                            ? 'يمكن ترك المهمة الفرعية بدون تكليف حالياً.'
                            : 'The subtask can be left unassigned for now.'
                        )
                        : form.assigneeId ===
                            user?.id
                        ? (
                            isArabic
                                ? 'سيتم قبول التكليف لك تلقائياً.'
                                : 'Your own assignment will be accepted automatically.'
                            )
                        : (
                            isArabic
                                ? 'المستخدم الآخر سيحتاج إلى قبول أو رفض التكليف.'
                                : 'The selected user will need to accept or reject the assignment.'
                            )}
                    </p>
                </div>
              </div>


              {/*
               * DATES
               */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {isArabic
                      ? 'تاريخ البدء'
                      : 'Start date'}{' '}

                    <span className="font-normal text-slate-400">
                      {isArabic
                        ? '(اختياري)'
                        : '(optional)'}
                    </span>
                  </label>


                  <input
                    type="date"
                    className="input"
                    value={
                      form.startDate
                    }
                    min={
                      task.startDate ||
                      undefined
                    }
                    max={
                      form.deadlineDate ||
                      task.deadlineDate ||
                      undefined
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
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
                      ? 'الموعد النهائي'
                      : 'Deadline'}{' '}

                    <span className="font-normal text-slate-400">
                      {isArabic
                        ? '(اختياري)'
                        : '(optional)'}
                    </span>
                  </label>


                  <input
                    type="date"
                    className="input"
                    value={
                      form.deadlineDate
                    }
                    min={
                      form.startDate ||
                      task.startDate ||
                      undefined
                    }
                    max={
                      task.deadlineDate ||
                      undefined
                    }
                    onChange={(
                      event,
                    ) =>
                      setForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          deadlineDate:
                            event.target.value,
                        }),
                      )
                    }
                  />


                  {task.deadlineDate && (
                    <p className="mt-1 text-xs text-slate-400">
                      {isArabic
                        ? `يجب ألا يتجاوز ${formatDate(
                            task.deadlineDate,
                            locale,
                          )}`
                        : `Must be on or before ${formatDate(
                            task.deadlineDate,
                            locale,
                          )}`}
                    </p>
                  )}
                </div>
              </div>


              {/*
               * INHERITED INFO
               */}

              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-700">
                  {isArabic
                    ? 'موروث من المهمة الرئيسية'
                    : 'Inherited from parent'}
                </div>


                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {isArabic
                    ? 'المشروع والقسم والفرع ونوع المهمة سيتم أخذها تلقائياً من المهمة الرئيسية.'
                    : 'Project, Department, Branch and Task Type are inherited automatically so this step stays inside the same work context.'}
                </p>
              </div>


              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {
                    error
                  }
                </div>
              )}
            </div>


            {/*
             * FOOTER
             */}

            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-slate-50/95 px-5 py-4 backdrop-blur sm:px-6">
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  submitting
                }
                onClick={
                  closeModal
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
                  submitting ||
                  !form.title.trim() ||
                  !form.priority
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
                        ? 'إنشاء المهمة الفرعية'
                        : 'Create subtask'
                    )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}