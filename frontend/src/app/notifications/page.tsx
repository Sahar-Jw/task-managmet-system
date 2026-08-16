'use client';

import { uiText } from '@/lib/ui-text';


import {
  useCallback,
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
import Pagination from '@/components/Pagination';

import {
  ApiError,
} from '@/lib/api';

import {
  NotificationsApi,
} from '@/lib/endpoints';

import {
  useNotifications,
} from '@/lib/notifications-context';

import type {
  Notification,
  NotificationType,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE =
  20;


type NotificationFilter =
  | 'all'
  | 'unread';


/*
 * ============================================================
 * TYPE CONFIG
 * ============================================================
 */

type NotificationConfig = {
  icon:
    string;

  labelEn:
    string;

  labelAr:
    string;

  badgeClass:
    string;

  iconClass:
    string;
};


const DEFAULT_CONFIG:
  NotificationConfig = {
  icon:
    '•',

  labelEn:
    uiText(false, 'text0709'),

  labelAr:
    uiText(true, 'text0709'),

  badgeClass:
    'bg-slate-100 text-slate-600',

  iconClass:
    'bg-slate-100 text-slate-600',
};


const NOTIFICATION_CONFIG:
  Partial<
    Record<
      NotificationType,
      NotificationConfig
    >
  > = {
  TaskAssigned: {
    icon:
      '→',

    labelEn:
      uiText(false, 'text0706'),

    labelAr:
      uiText(true, 'text0706'),

    badgeClass:
      'bg-blue-50 text-blue-700',

    iconClass:
      'bg-blue-50 text-blue-700',
  },


  TaskReassigned: {
    icon:
      '↻',

    labelEn:
      uiText(false, 'text0710'),

    labelAr:
      uiText(true, 'text0710'),

    badgeClass:
      'bg-violet-50 text-violet-700',

    iconClass:
      'bg-violet-50 text-violet-700',
  },


  AssignmentAccepted: {
    icon:
      '✓',

    labelEn:
      uiText(false, 'text0711'),

    labelAr:
      uiText(true, 'text0711'),

    badgeClass:
      'bg-emerald-50 text-emerald-700',

    iconClass:
      'bg-emerald-50 text-emerald-700',
  },


  AssignmentRejected: {
    icon:
      '×',

    labelEn:
      uiText(false, 'text0712'),

    labelAr:
      uiText(true, 'text0712'),

    badgeClass:
      'bg-red-50 text-red-700',

    iconClass:
      'bg-red-50 text-red-700',
  },


  ApprovalRequested: {
    icon:
      '?',

    labelEn:
      uiText(false, 'text0713'),

    labelAr:
      uiText(true, 'text0713'),

    badgeClass:
      'bg-amber-50 text-amber-700',

    iconClass:
      'bg-amber-50 text-amber-700',
  },


  ApprovalDecision: {
    icon:
      '✓',

    labelEn:
      uiText(false, 'text0713'),

    labelAr:
      uiText(true, 'text0713'),

    badgeClass:
      'bg-emerald-50 text-emerald-700',

    iconClass:
      'bg-emerald-50 text-emerald-700',
  },


  TaskStatusChanged: {
    icon:
      '↔',

    labelEn:
      uiText(false, 'text0052'),

    labelAr:
      uiText(true, 'text0052'),

    badgeClass:
      'bg-blue-50 text-blue-700',

    iconClass:
      'bg-blue-50 text-blue-700',
  },


  TaskCompleted: {
    icon:
      '✓',

    labelEn:
      uiText(false, 'text0018'),

    labelAr:
      uiText(true, 'text0018'),

    badgeClass:
      'bg-emerald-50 text-emerald-700',

    iconClass:
      'bg-emerald-50 text-emerald-700',
  },


  TaskReopened: {
    icon:
      '↻',

    labelEn:
      uiText(false, 'text0714'),

    labelAr:
      uiText(true, 'text0714'),

    badgeClass:
      'bg-violet-50 text-violet-700',

    iconClass:
      'bg-violet-50 text-violet-700',
  },


  TaskUpdated: {
    icon:
      '✎',

    labelEn:
      uiText(false, 'text0715'),

    labelAr:
      uiText(true, 'text0715'),

    badgeClass:
      'bg-slate-100 text-slate-700',

    iconClass:
      'bg-slate-100 text-slate-700',
  },


  DueDateChanged: {
    icon:
      '◷',

    labelEn:
      uiText(false, 'text0148'),

    labelAr:
      uiText(true, 'text0148'),

    badgeClass:
      'bg-orange-50 text-orange-700',

    iconClass:
      'bg-orange-50 text-orange-700',
  },


  DueDateApproaching: {
    icon:
      '!',

    labelEn:
      uiText(false, 'text0166'),

    labelAr:
      uiText(true, 'text0166'),

    badgeClass:
      'bg-amber-50 text-amber-700',

    iconClass:
      'bg-amber-50 text-amber-700',
  },


  TaskOverdue: {
    icon:
      '!',

    labelEn:
      uiText(false, 'text0285'),

    labelAr:
      uiText(true, 'text0285'),

    badgeClass:
      'bg-red-50 text-red-700',

    iconClass:
      'bg-red-50 text-red-700',
  },


  NewComment: {
    icon:
      '💬',

    labelEn:
      uiText(false, 'text0707'),

    labelAr:
      uiText(true, 'text0707'),

    badgeClass:
      'bg-cyan-50 text-cyan-700',

    iconClass:
      'bg-cyan-50 text-cyan-700',
  },


  ProjectUpdated: {
    icon:
      '◆',

    labelEn:
      uiText(false, 'text0701'),

    labelAr:
      uiText(true, 'text0701'),

    badgeClass:
      'bg-indigo-50 text-indigo-700',

    iconClass:
      'bg-indigo-50 text-indigo-700',
  },


  ProjectArchived: {
    icon:
      '□',

    labelEn:
      uiText(false, 'text0716'),

    labelAr:
      uiText(true, 'text0716'),

    badgeClass:
      'bg-slate-100 text-slate-600',

    iconClass:
      'bg-slate-100 text-slate-600',
  },


  ProjectRestored: {
    icon:
      '↻',

    labelEn:
      uiText(false, 'text0717'),

    labelAr:
      uiText(true, 'text0717'),

    badgeClass:
      'bg-emerald-50 text-emerald-700',

    iconClass:
      'bg-emerald-50 text-emerald-700',
  },
};


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function getConfig(
  type:
    NotificationType,
) {
  return (
    NOTIFICATION_CONFIG[
      type
    ] ??
    DEFAULT_CONFIG
  );
}


function formatExactDate(
  value:
    string,

  locale:
    string,
) {
  return new Date(
    value,
  ).toLocaleString(
    locale,
    {
      year:
        'numeric',

      month:
        'short',

      day:
        'numeric',

      hour:
        '2-digit',

      minute:
        '2-digit',
    },
  );
}


function formatRelativeTime(
  value:
    string,

  isArabic:
    boolean,
) {
  const date =
    new Date(
      value,
    );


  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          date.getTime()
        ) /
          1000,
      ),
    );


  if (
    seconds <
    60
  ) {
    return uiText(isArabic, 'text0036');
  }


  const minutes =
    Math.floor(
      seconds /
      60,
    );


  if (
    minutes <
    60
  ) {
    return uiText(isArabic, 'text0727', { value0: minutes });
  }


  const hours =
    Math.floor(
      minutes /
      60,
    );


  if (
    hours <
    24
  ) {
    return uiText(isArabic, 'text0728', { value0: hours });
  }


  const days =
    Math.floor(
      hours /
      24,
    );


  if (
    days <
    7
  ) {
    return uiText(isArabic, 'text0729', { value0: days });
  }


  const weeks =
    Math.floor(
      days /
      7,
    );


  if (
    weeks <
    5
  ) {
    return uiText(isArabic, 'text0730', { value0: weeks });
  }


  return date.toLocaleDateString(
    isArabic
      ? 'ar'
      : 'en',
    {
      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',
    },
  );
}


function getNotificationHref(
  notification:
    Notification,
):
  | string
  | null {
  const metadata =
    notification.metadata;


  if (
    metadata?.taskId &&
    typeof metadata.taskId ===
      'string'
  ) {
    return `/tasks/${metadata.taskId}`;
  }


  if (
    metadata?.projectId &&
    typeof metadata.projectId ===
      'string'
  ) {
    return `/projects/${metadata.projectId}`;
  }


  return null;
}


/*
 * ============================================================
 * NOTIFICATION ROW
 * ============================================================
 */

function NotificationRow({
  notification,
  locale,
  isArabic,
  busy,
  onOpen,
  onMarkRead,
  onDelete,
}: {
  notification:
    Notification;

  locale:
    string;

  isArabic:
    boolean;

  busy:
    boolean;

  onOpen:
    (
      notification:
        Notification,
    ) => void;

  onMarkRead:
    (
      notification:
        Notification,
    ) => void;

  onDelete:
    (
      notification:
        Notification,
    ) => void;
}) {
  const config =
    getConfig(
      notification.type,
    );


  const href =
    getNotificationHref(
      notification,
    );


  return (
    <article
      className={`
        group
        relative
        overflow-hidden
        rounded-2xl
        border
        transition
        ${
          notification.isRead
            ? `
              border-slate-200
              bg-white
              hover:border-slate-300
              hover:shadow-sm
            `
            : `
              border-brand-200
              bg-brand-50/30
              shadow-[0_1px_3px_rgba(15,23,42,0.04)]
              hover:border-brand-300
              hover:shadow-sm
            `
        }
      `}
    >
      {!notification.isRead && (
        <div
          className={`
            absolute
            bottom-0
            w-1
            bg-brand-500
            ${
              isArabic
                ? 'right-0'
                : 'left-0'
            }
          `}
        />
      )}


      <div
        className={`
          flex
          gap-4
          p-4
          sm:p-5
          ${
            href
              ? 'cursor-pointer'
              : ''
          }
        `}
        role={
          href
            ? 'button'
            : undefined
        }
        tabIndex={
          href
            ? 0
            : undefined
        }
        onClick={() => {
          if (
            href
          ) {
            onOpen(
              notification,
            );
          }
        }}
        onKeyDown={(
          event,
        ) => {
          if (
            !href
          ) {
            return;
          }


          if (
            event.key ===
              'Enter' ||
            event.key ===
              ' '
          ) {
            event.preventDefault();

            onOpen(
              notification,
            );
          }
        }}
      >
        {/*
         * ====================================================
         * ICON
         * ====================================================
         */}

        <div
          className={`
            flex
            h-11
            w-11
            shrink-0
            items-center
            justify-center
            rounded-xl
            text-base
            font-bold
            ${config.iconClass}
          `}
        >
          {
            config.icon
          }
        </div>


        {/*
         * ====================================================
         * CONTENT
         * ====================================================
         */}

        <div className="min-w-0 flex-1">
          <div
            className="
              flex
              flex-wrap
              items-start
              justify-between
              gap-2
            "
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`
                    inline-flex
                    rounded-full
                    px-2.5
                    py-1
                    text-[10px]
                    font-semibold
                    ${config.badgeClass}
                  `}
                >
                  {isArabic
                    ? config.labelAr
                    : config.labelEn}
                </span>


                {!notification.isRead && (
                  <span
                    className="
                      inline-flex
                      items-center
                      gap-1.5
                      text-[10px]
                      font-semibold
                      text-brand-700
                    "
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />

                    {uiText(isArabic, 'text0037')}
                  </span>
                )}
              </div>


              <h2
                className={`
                  mt-2
                  text-sm
                  leading-6
                  ${
                    notification.isRead
                      ? 'font-medium text-slate-800'
                      : 'font-semibold text-slate-950'
                  }
                `}
              >
                {
                  notification.title
                }
              </h2>
            </div>


            <div
              className="
                shrink-0
                text-[11px]
                text-slate-400
              "
              title={formatExactDate(
                notification.createdAt,
                locale,
              )}
            >
              {formatRelativeTime(
                notification.createdAt,
                isArabic,
              )}
            </div>
          </div>


          <p
            className="
              mt-1
              max-w-4xl
              text-sm
              leading-6
              text-slate-500
            "
          >
            {
              notification.message
            }
          </p>


          {/*
           * ==================================================
           * EXTRA REASON
           * ==================================================
           */}

          {typeof notification.metadata?.reason ===
            'string' &&
            notification.metadata.reason.trim() && (
              <div
                className="
                  mt-2
                  rounded-lg
                  bg-slate-50
                  px-3
                  py-2
                  text-xs
                  leading-5
                  text-slate-600
                "
              >
                <span className="font-semibold text-slate-700">
                  {uiText(isArabic, 'text0003')}
                </span>

                {
                  notification.metadata.reason
                }
              </div>
            )}


          {/*
           * ==================================================
           * ACTIONS
           * ==================================================
           */}

          <div
            className="
              mt-3
              flex
              flex-wrap
              items-center
              gap-2
            "
            onClick={(
              event,
            ) => {
              event.stopPropagation();
            }}
          >
            {href && (
              <button
                type="button"
                disabled={
                  busy
                }
                className="
                  text-xs
                  font-semibold
                  text-brand-600
                  hover:text-brand-800
                  disabled:opacity-50
                "
                onClick={() => {
                  onOpen(
                    notification,
                  );
                }}
              >
                {uiText(isArabic, 'text0004')}
              </button>
            )}


            {!notification.isRead && (
              <button
                type="button"
                disabled={
                  busy
                }
                className="
                  text-xs
                  font-medium
                  text-slate-500
                  hover:text-slate-800
                  disabled:opacity-50
                "
                onClick={() => {
                  onMarkRead(
                    notification,
                  );
                }}
              >
                {uiText(isArabic, 'text0314')}
              </button>
            )}


            <button
              type="button"
              disabled={
                busy
              }
              className="
                text-xs
                font-medium
                text-red-500
                hover:text-red-700
                disabled:opacity-50
              "
              onClick={() => {
                onDelete(
                  notification,
                );
              }}
            >
              {uiText(isArabic, 'text0038')}
            </button>


            <span
              className="
                ml-auto
                hidden
                text-[10px]
                text-slate-400
                sm:inline
              "
              dir="ltr"
            >
              {formatExactDate(
                notification.createdAt,
                locale,
              )}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}


/*
 * ============================================================
 * EMPTY STATE
 * ============================================================
 */

function EmptyState({
  filter,
  isArabic,
}: {
  filter:
    NotificationFilter;

  isArabic:
    boolean;
}) {
  return (
    <div
      className="
        flex
        min-h-[320px]
        flex-col
        items-center
        justify-center
        rounded-2xl
        border
        border-slate-200
        bg-white
        px-6
        text-center
      "
    >
      <div
        className="
          flex
          h-14
          w-14
          items-center
          justify-center
          rounded-2xl
          bg-slate-100
          text-2xl
          text-slate-400
        "
      >
        ♢
      </div>


      <h3
        className="
          mt-4
          text-sm
          font-semibold
          text-slate-800
        "
      >
        {filter ===
        'unread'
          ? uiText(isArabic, 'text0315')
          : uiText(isArabic, 'text0039')}
      </h3>


      <p
        className="
          mt-1
          max-w-sm
          text-sm
          leading-6
          text-slate-400
        "
      >
        {filter ===
        'unread'
          ? uiText(isArabic, 'text0316')
          : uiText(isArabic, 'text0317')}
      </p>
    </div>
  );
}


/*
 * ============================================================
 * CONTENT
 * ============================================================
 */

function NotificationsContent() {
  const router =
    useRouter();


  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  const {
    unreadCount,
    refreshUnreadCount,
  } =
    useNotifications();


  /*
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [
    items,
    setItems,
  ] =
    useState<
      Notification[]
    >([]);


  const [
    total,
    setTotal,
  ] =
    useState(
      0,
    );


  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );


  const [
    filter,
    setFilter,
  ] =
    useState<
      NotificationFilter
    >(
      'all',
    );


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
    actionError,
    setActionError,
  ] =
    useState('');


  const [
    busyIds,
    setBusyIds,
  ] =
    useState<
      Set<string>
    >(
      new Set(),
    );


  const [
    bulkBusy,
    setBulkBusy,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * LOAD
   * ==========================================================
   */

  const load =
    useCallback(
      async (
        silent =
          false,
      ) => {
        if (
          !silent
        ) {
          setLoading(
            true,
          );
        }


        setError('');


        try {
          const result =
            await NotificationsApi.list({
              page:
                String(
                  page,
                ),

              limit:
                String(
                  PAGE_SIZE,
                ),

              ...(filter ===
              'unread'
                ? {
                    unreadOnly:
                      'true',
                  }
                : {}),
            });


          setItems(
            result.items,
          );

          setTotal(
            result.total,
          );
        } catch (
          err
        ) {
          setError(
            err instanceof
              ApiError
              ? err.message
              : uiText(isArabic, 'text0040'),
          );
        } finally {
          if (
            !silent
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        page,
        filter,
        isArabic,
      ],
    );


  useEffect(() => {
    load();
  }, [
    load,
  ]);


  /*
   * ==========================================================
   * REAL-TIME REFRESH
   * ==========================================================
   *
   * NotificationsContext already updates unreadCount whenever
   * SSE receives a notification.
   *
   * When that count changes we silently refresh this page.
   * ==========================================================
   */

  useEffect(() => {
    if (
      loading
    ) {
      return;
    }


    load(
      true,
    );
  }, [
    unreadCount,
  ]);


  /*
   * ==========================================================
   * FILTER
   * ==========================================================
   */

  function changeFilter(
    value:
      NotificationFilter,
  ) {
    setFilter(
      value,
    );

    setPage(
      1,
    );
  }


  /*
   * ==========================================================
   * BUSY HELPERS
   * ==========================================================
   */

  function setItemBusy(
    id:
      string,

    value:
      boolean,
  ) {
    setBusyIds(
      (
        current,
      ) => {
        const next =
          new Set(
            current,
          );


        if (
          value
        ) {
          next.add(
            id,
          );
        } else {
          next.delete(
            id,
          );
        }


        return next;
      },
    );
  }


  /*
   * ==========================================================
   * MARK READ
   * ==========================================================
   */

  async function markRead(
    notification:
      Notification,
  ) {
    if (
      notification.isRead
    ) {
      return;
    }


    setActionError('');

    setItemBusy(
      notification.id,
      true,
    );


    try {
      await NotificationsApi.markRead(
        notification.id,
      );


      if (
        filter ===
        'unread'
      ) {
        setItems(
          (
            current,
          ) =>
            current.filter(
              (
                item,
              ) =>
                item.id !==
                notification.id,
            ),
        );

        setTotal(
          (
            current,
          ) =>
            Math.max(
              0,
              current -
                1,
            ),
        );
      } else {
        setItems(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) =>
                item.id ===
                notification.id
                  ? {
                      ...item,
                      isRead:
                        true,
                    }
                  : item,
            ),
        );
      }


      await refreshUnreadCount();
    } catch (
      err
    ) {
      setActionError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0041'),
      );
    } finally {
      setItemBusy(
        notification.id,
        false,
      );
    }
  }


  /*
   * ==========================================================
   * OPEN
   * ==========================================================
   */

  async function openNotification(
    notification:
      Notification,
  ) {
    const href =
      getNotificationHref(
        notification,
      );


    if (
      !href
    ) {
      return;
    }


    /*
     * Mark it read before navigation.
     *
     * If the mark-read request fails we still navigate because
     * opening the Task/Project is more important than blocking
     * the User.
     */
    if (
      !notification.isRead
    ) {
      try {
        await NotificationsApi.markRead(
          notification.id,
        );

        await refreshUnreadCount();
      } catch {
        // Navigation should still continue.
      }
    }


    router.push(
      href,
    );
  }


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async function deleteNotification(
    notification:
      Notification,
  ) {
    setActionError('');

    setItemBusy(
      notification.id,
      true,
    );


    try {
      await NotificationsApi.remove(
        notification.id,
      );


      setItems(
        (
          current,
        ) =>
          current.filter(
            (
              item,
            ) =>
              item.id !==
              notification.id,
          ),
      );


      setTotal(
        (
          current,
        ) =>
          Math.max(
            0,
            current -
              1,
          ),
      );


      if (
        !notification.isRead
      ) {
        await refreshUnreadCount();
      }


      /*
       * If deleting the last item from a page other than page 1,
       * move backwards instead of showing an empty page.
       */
      if (
        items.length ===
          1 &&
        page >
          1
      ) {
        setPage(
          (
            current,
          ) =>
            Math.max(
              1,
              current -
                1,
            ),
        );
      }
    } catch (
      err
    ) {
      setActionError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0042'),
      );
    } finally {
      setItemBusy(
        notification.id,
        false,
      );
    }
  }


  /*
   * ==========================================================
   * MARK ALL READ
   * ==========================================================
   */

  async function markAllRead() {
    if (
      unreadCount <=
      0
    ) {
      return;
    }


    setBulkBusy(
      true,
    );

    setActionError('');


    try {
      await NotificationsApi.markAllRead();


      if (
        filter ===
        'unread'
      ) {
        setItems([]);
        setTotal(0);
      } else {
        setItems(
          (
            current,
          ) =>
            current.map(
              (
                item,
              ) => ({
                ...item,
                isRead:
                  true,
              }),
            ),
        );
      }


      await refreshUnreadCount();
    } catch (
      err
    ) {
      setActionError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0318'),
      );
    } finally {
      setBulkBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CLEAR READ
   * ==========================================================
   */

  async function clearRead() {
    setBulkBusy(
      true,
    );

    setActionError('');


    try {
      await NotificationsApi.clearRead();


      /*
       * Unread view cannot contain read rows, so no need for a
       * full reload there.
       */
      if (
        filter ===
        'all'
      ) {
        setPage(
          1,
        );

        await load();
      }


      await refreshUnreadCount();
    } catch (
      err
    ) {
      setActionError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0319'),
      );
    } finally {
      setBulkBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * DERIVED
   * ==========================================================
   */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        total /
          PAGE_SIZE,
      ),
    );


  const readCountOnPage =
    useMemo(
      () =>
        items.filter(
          (
            item,
          ) =>
            item.isRead,
        ).length,
      [
        items,
      ],
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
        max-w-[1450px]
        pb-12
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

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          px-5
          py-6
          sm:px-7
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-24
            -top-24
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
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-end
            lg:justify-between
          "
        >
          <div>
            <div
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[.14em]
                text-brand-600
              "
            >
              {uiText(isArabic, 'text0320')}
            </div>


            <div
              className="
                mt-2
                flex
                flex-wrap
                items-center
                gap-3
              "
            >
              <h1
                className="
                  text-2xl
                  font-semibold
                  tracking-[-0.03em]
                  text-slate-950
                  sm:text-3xl
                "
              >
                {uiText(isArabic, 'text0043')}
              </h1>


              {unreadCount >
                0 && (
                <span
                  className="
                    inline-flex
                    min-w-7
                    items-center
                    justify-center
                    rounded-full
                    bg-brand-600
                    px-2
                    py-1
                    text-xs
                    font-semibold
                    text-white
                  "
                >
                  {
                    unreadCount
                  }
                </span>
              )}
            </div>


            <p
              className="
                mt-2
                max-w-2xl
                text-sm
                leading-6
                text-slate-500
              "
            >
              {uiText(isArabic, 'text0321')}
            </p>
          </div>


          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            <button
              type="button"
              className="btn-secondary"
              disabled={
                bulkBusy ||
                unreadCount ===
                  0
              }
              onClick={
                markAllRead
              }
            >
              {uiText(isArabic, 'text0322')}
            </button>


            <button
              type="button"
              className="btn-secondary"
              disabled={
                bulkBusy ||
                (
                  filter ===
                    'all' &&
                  readCountOnPage ===
                    0
                )
              }
              onClick={
                clearRead
              }
            >
              {uiText(isArabic, 'text0323')}
            </button>
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * FILTER TABS
       * ======================================================
       */}

      <section
        className="
          mt-5
          flex
          flex-col
          gap-3
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div
          className="
            inline-flex
            w-fit
            rounded-xl
            bg-slate-100
            p-1
          "
        >
          <button
            type="button"
            onClick={() => {
              changeFilter(
                'all',
              );
            }}
            className={`
              rounded-lg
              px-4
              py-2
              text-xs
              font-semibold
              transition
              ${
                filter ===
                'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }
            `}
          >
            {uiText(isArabic, 'text0044')}
          </button>


          <button
            type="button"
            onClick={() => {
              changeFilter(
                'unread',
              );
            }}
            className={`
              flex
              items-center
              gap-2
              rounded-lg
              px-4
              py-2
              text-xs
              font-semibold
              transition
              ${
                filter ===
                'unread'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }
            `}
          >
            {uiText(isArabic, 'text0324')}


            {unreadCount >
              0 && (
              <span
                className="
                  rounded-full
                  bg-brand-100
                  px-1.5
                  py-0.5
                  text-[10px]
                  text-brand-700
                "
              >
                {
                  unreadCount
                }
              </span>
            )}
          </button>
        </div>


        <div
          className="
            text-xs
            text-slate-400
          "
        >
          {total}{' '}

          {isArabic
            ? 'إشعار'
            : total ===
                1
              ? 'notification'
              : 'notifications'}
        </div>
      </section>


      {/*
       * ======================================================
       * ERRORS
       * ======================================================
       */}

      {actionError && (
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
          {
            actionError
          }
        </div>
      )}


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
          {
            error
          }
        </div>
      )}


      {/*
       * ======================================================
       * CONTENT
       * ======================================================
       */}

      {loading ? (
        <div
          className="
            mt-4
            space-y-3
          "
        >
          {[
            1,
            2,
            3,
            4,
            5,
          ].map(
            (
              item,
            ) => (
              <div
                key={
                  item
                }
                className="
                  h-32
                  animate-pulse
                  rounded-2xl
                  bg-slate-100
                "
              />
            ),
          )}
        </div>
      ) : items.length ===
        0 ? (
        <div className="mt-4">
          <EmptyState
            filter={
              filter
            }
            isArabic={
              isArabic
            }
          />
        </div>
      ) : (
        <div
          className="
            mt-4
            space-y-3
          "
        >
          {items.map(
            (
              notification,
            ) => (
              <NotificationRow
                key={
                  notification.id
                }
                notification={
                  notification
                }
                locale={
                  locale
                }
                isArabic={
                  isArabic
                }
                busy={
                  busyIds.has(
                    notification.id,
                  )
                }
                onOpen={
                  openNotification
                }
                onMarkRead={
                  markRead
                }
                onDelete={
                  deleteNotification
                }
              />
            ),
          )}
        </div>
      )}


      {/*
       * ======================================================
       * PAGINATION
       * ======================================================
       */}

      {!loading &&
        !error &&
        total >
          0 && (
          <Pagination
            page={
              page
            }
            totalPages={
              totalPages
            }
            total={
              total
            }
            onPageChange={
              setPage
            }
            itemLabel={
              uiText(isArabic, 'text0045')
            }
          />
        )}
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}