'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { NotificationsApi } from '@/lib/endpoints';
import { useNotifications } from '@/lib/notifications-context';
import type { Notification } from '@/lib/types';

function NotificationsContent() {
  const router = useRouter();
  const { refreshUnreadCount } = useNotifications();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await NotificationsApi.list();
    setItems(res.items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Marks the notification read (if needed) and takes the User straight to
  // the Task it's about, e.g. so a newly-assigned Task can be accepted or
  // rejected right from the notification instead of hunting for it.
  async function handleOpen(n: Notification) {
    const taskId = n.metadata?.taskId;
    if (!taskId) return;
    if (!n.isRead) {
      try {
        await NotificationsApi.markRead(n.id);
        refreshUnreadCount();
      } catch {
        // navigate anyway — read-state is secondary to getting them to the Task
      }
    }
    router.push(`/tasks/${taskId}`);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Notifications</h1>
        <button
          className="btn-secondary"
          onClick={async () => {
            await NotificationsApi.markAllRead();
            load();
            refreshUnreadCount();
          }}
        >
          Mark all as read
        </button>
      </div>

      <div className="mt-4 card divide-y divide-slate-100">
        {loading ? (
          <p className="p-6 text-center text-slate-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-slate-500">You're all caught up.</p>
        ) : (
          items.map((n) => {
            const hasTask = Boolean(n.metadata?.taskId);
            return (
              <div
                key={n.id}
                role={hasTask ? 'button' : undefined}
                tabIndex={hasTask ? 0 : undefined}
                onClick={hasTask ? () => handleOpen(n) : undefined}
                onKeyDown={
                  hasTask
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpen(n);
                        }
                      }
                    : undefined
                }
                className={`flex items-start justify-between gap-4 px-4 py-3 ${
                  n.isRead ? '' : 'bg-brand-50'
                } ${hasTask ? 'cursor-pointer hover:bg-slate-50' : ''}`}
              >
                <div>
                  <div className="font-medium text-slate-800">{n.title}</div>
                  <div className="text-sm text-slate-600">{n.message}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!n.isRead && (
                    <button
                      className="text-xs text-brand-600 hover:underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await NotificationsApi.markRead(n.id);
                        load();
                        refreshUnreadCount();
                      }}
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    className="text-xs text-slate-400 hover:text-red-600"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await NotificationsApi.remove(n.id);
                      load();
                      refreshUnreadCount();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}