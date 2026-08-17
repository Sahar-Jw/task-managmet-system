'use client';

import { uiText } from '@/lib/ui-text';


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


interface SubtasksPanelProps {
  task:
    Task;

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


const CLOSED_STATUSES = [
  'Completed',
  'Finished',
  'Archived',
];


function isClosed(
  task:
    Task,
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
  if (
    !value
  ) {
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


function getToday() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10,
    );
}


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
    useState(
      '',
    );


  const [
    success,
    setSuccess,
  ] =
    useState(
      '',
    );


  useEffect(() => {
    UsersApi.list({
      limit:
        '100',
    })
      .then(
        (
          result,
        ) =>
          setUsers(
            result.items,
          ),
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


  function taskTitle(
    value:
      Task,
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
   * SUBTASK ORDER
   * ==========================================================
   *
   * Open work stays first.
   *
   * Inside the same group, older-created steps remain above
   * newer-created steps so the timeline reads naturally.
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


            return (
              new Date(
                a.createdAt,
              ).getTime() -
              new Date(
                b.createdAt,
              ).getTime()
            );
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


  const isAdmin =
    user?.role.name ===
    'ADMIN';


  const isCreator =
    task.createdById ===
    user?.id;


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


  function openModal() {
    setError(
      '',
    );

    setSuccess(
      '',
    );


    const defaultAssigneeId =
      user &&
      user.role.name !==
        'ADMIN'
        ? user.id
        : '';


    setForm({
      title:
        '',

      description:
        '',

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

    setError(
      '',
    );
  }


  async function createSubtask(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    if (
      !form.title.trim()
    ) {
      setError(
        uiText(isArabic, 'text0639'),
      );

      return;
    }


    if (
      !task.departmentId
    ) {
      setError(
        uiText(isArabic, 'text0640'),
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
        uiText(isArabic, 'text0545'),
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
        uiText(isArabic, 'text0546'),
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
        uiText(isArabic, 'text0641'),
      );

      return;
    }


    setSubmitting(
      true,
    );

    setError(
      '',
    );

    setSuccess(
      '',
    );


    let createdTask:
      Task | null =
      null;


    try {
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


      if (
        form.assigneeId
      ) {
        const assignment =
          await AssignmentsApi.assign(
            createdTask.id,
            form.assigneeId,
            form.deadlineDate ||
              undefined,
          ) as
            TaskAssignment;


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
        uiText(isArabic, 'text0237'),
      );


      await onChanged();
    } catch (
      err
    ) {
      if (
        createdTask
      ) {
        setError(
          err instanceof
            ApiError
            ? (
                uiText(isArabic, 'text0749', { value0: err.message })
              )
            : (
                uiText(isArabic, 'text0642')
              ),
        );


        await onChanged();

        return;
      }


      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0643'),
      );
    } finally {
      setSubmitting(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CHILD TASK VIEW
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


            <div>
              <div className="text-xs font-semibold uppercase tracking-[.12em] text-brand-600">
                {uiText(isArabic, 'text0112')}
              </div>

              <h2 className="mt-1 text-base font-semibold text-slate-900">
                {uiText(isArabic, 'text0644')}
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
                  {uiText(isArabic, 'text0519')}
                </div>

                <div className="mt-1 truncate text-sm font-semibold text-slate-800 group-hover:text-brand-700">
                  {taskTitle(
                    task.parentTask,
                  )}
                </div>
              </div>

              <span className="text-brand-600">
                {isArabic
                  ? '←'
                  : '→'}
              </span>
            </Link>
          ) : (
            <div className="text-sm text-slate-400">
              {uiText(isArabic, 'text0645')}
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
        <div className="border-b border-slate-100 bg-slate-50/60 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-lg font-semibold text-brand-700">
                ⑂
              </div>

              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {uiText(isArabic, 'text0646')}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {uiText(isArabic, 'text0647')}
                </p>
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

                {uiText(isArabic, 'text0238')}
              </button>
            )}
          </div>
        </div>


        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {subtasks.length ===
                0
                  ? (
                      uiText(isArabic, 'text0239')
                    )
                  : (
                      uiText(isArabic, 'text0750', { value0: completedCount, value1: subtasks.length })
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
                        uiText(isArabic, 'text0648')
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


        {subtasks.length ===
        0 ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-400">
              ○
            </div>

            <h3 className="mt-3 text-sm font-semibold text-slate-700">
              {uiText(isArabic, 'text0240')}
            </h3>

            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-400">
              {canCreateSubtask
                ? (
                    uiText(isArabic, 'text0649')
                  )
                : (
                    uiText(isArabic, 'text0650')
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

                {uiText(isArabic, 'text0651')}
              </button>
            )}
          </div>
        ) : (
          /*
           * ====================================================
           * VERTICAL SUBTASK TIMELINE
           * ====================================================
           */

          <div className="px-5 py-6 sm:px-6">
            <div className="relative">
              {/*
               * Vertical connector.
               */}
              <div
                className={`
                  absolute
                  top-7
                  bottom-7
                  w-[2px]
                  bg-slate-200
                  ${
                    isArabic
                      ? 'right-[18px]'
                      : 'left-[18px]'
                  }
                `}
              />


              <div className="space-y-5">
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
                          getToday() &&
                        !childClosed,
                      );


                    const childInProgress =
                      [
                        'InProgress',
                        'PendingApproval',
                      ].includes(
                        child.status,
                      );


                    const nodeClass =
                      childClosed
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : childOverdue
                          ? 'border-red-500 bg-red-500 text-white'
                          : childInProgress
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-300 bg-white text-slate-500';


                    return (
                      <div
                        key={
                          child.id
                        }
                        className="relative flex items-start gap-4"
                      >
                        {/*
                         * NODE
                         */}
                        <div
                          className={`
                            relative
                            z-10
                            mt-5
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            border-2
                            text-xs
                            font-bold
                            shadow-sm
                            ${nodeClass}
                          `}
                        >
                          {childClosed
                            ? '✓'
                            : index +
                              1}
                        </div>


                        {/*
                         * CARD
                         */}
                        <Link
                          href={`/tasks/${child.id}`}
                          className="
                            group
                            relative
                            min-w-0
                            flex-1
                            overflow-hidden
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                            transition-all
                            duration-200
                            hover:-translate-y-0.5
                            hover:border-brand-200
                            hover:shadow-md
                            sm:p-5
                          "
                        >
                          {/*
                           * Small connector from node to card.
                           */}
                          <span
                            className={`
                              absolute
                              top-[36px]
                              h-[2px]
                              w-4
                              bg-slate-200
                              ${
                                isArabic
                                  ? '-right-4'
                                  : '-left-4'
                              }
                            `}
                          />


                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-slate-400">
                                  {uiText(isArabic, 'text0751', { value0: index + 1 })}
                                </span>


                                {childOverdue && (
                                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">
                                    {uiText(isArabic, 'text0285')}
                                  </span>
                                )}
                              </div>


                              <h3
                                className={`
                                  mt-1.5
                                  truncate
                                  text-sm
                                  font-semibold
                                  transition
                                  group-hover:text-brand-700
                                  ${
                                    childClosed
                                      ? 'text-slate-500'
                                      : 'text-slate-900'
                                  }
                                `}
                              >
                                {taskTitle(
                                  child,
                                )}
                              </h3>


                              <div className="mt-3 flex flex-wrap items-center gap-2">
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


                            <div className="grid w-full shrink-0 gap-4 sm:grid-cols-2 lg:w-auto lg:min-w-[310px]">
                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {uiText(isArabic, 'text0051')}
                                </div>

                                <div className="mt-1 truncate text-xs font-medium text-slate-700">
                                  {child.assignedTo
                                    ?.fullName ||
                                    (
                                      uiText(isArabic, 'text0115')
                                    )}
                                </div>
                              </div>


                              <div>
                                <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {uiText(isArabic, 'text0116')}
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
                            </div>


                            <span className="shrink-0 text-slate-300 transition group-hover:text-brand-500">
                              {isArabic
                                ? '←'
                                : '→'}
                            </span>
                          </div>
                        </Link>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </div>
        )}


        {openCount >
          0 && (
          <div className="border-t border-slate-100 bg-amber-50/40 px-5 py-3 text-xs text-amber-700 sm:px-6">
            {uiText(isArabic, 'text0652')}
          </div>
        )}
      </section>


      {success && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      )}


      {error &&
        !modalOpen && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      {/*
       * ======================================================
       * CREATE SUBTASK MODAL
       * ======================================================
       */}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
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
            className="max-h-[100dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.12em] text-brand-600">
                  {uiText(isArabic, 'text0653')}
                </div>

                <h2 className="mt-1 text-xl font-semibold text-slate-900">
                  {uiText(isArabic, 'text0241')}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {uiText(isArabic, 'text0654')}
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
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-4">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                  {uiText(isArabic, 'text0519')}
                </div>

                <div className="mt-1 text-sm font-semibold text-brand-900">
                  {taskTitle(
                    task,
                  )}
                </div>
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0242')}
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
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0438')}{' '}

                  <span className="font-normal text-slate-400">
                    {uiText(isArabic, 'text0062')}
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
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0297')}
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


                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0243')}{' '}

                    <span className="font-normal text-slate-400">
                      {uiText(isArabic, 'text0062')}
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
                      {uiText(isArabic, 'text0244')}
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

                          {item.id ===
                          user?.id
                            ? (
                                uiText(isArabic, 'text0245')
                              )
                            : ''}
                        </option>
                      ),
                    )}
                  </select>


                  <p className="mt-1 text-xs text-slate-400">
                    {!form.assigneeId
                      ? (
                          uiText(isArabic, 'text0655')
                        )
                      : form.assigneeId ===
                          user?.id
                        ? (
                            uiText(isArabic, 'text0656')
                          )
                        : (
                            uiText(isArabic, 'text0657')
                          )}
                  </p>
                </div>
              </div>


              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0415')}{' '}

                    <span className="font-normal text-slate-400">
                      {uiText(isArabic, 'text0062')}
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
                    {uiText(isArabic, 'text0148')}{' '}

                    <span className="font-normal text-slate-400">
                      {uiText(isArabic, 'text0062')}
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
                      {uiText(isArabic, 'text0752', { value0: formatDate(
                            task.deadlineDate,
                            locale,
                          ) })}
                    </p>
                  )}
                </div>
              </div>


              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold text-slate-700">
                  {uiText(isArabic, 'text0658')}
                </div>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {uiText(isArabic, 'text0659')}
                </p>
              </div>


              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>


            <div className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/95 px-4 py-4 backdrop-blur sm:flex sm:justify-end sm:px-6">
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
                {uiText(isArabic, 'text0080')}
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
                      uiText(isArabic, 'text0439')
                    )
                  : (
                      uiText(isArabic, 'text0660')
                    )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
