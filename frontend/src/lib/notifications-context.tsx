'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { NotificationsApi } from './endpoints';

interface NotificationsContextValue {
  unreadCount: number;
  /** Re-fetches the unread count from the server. Call this after any
   * action that can change it (mark read, mark all read, delete an
   * unread notification) so the Navbar badge updates immediately instead
   * of waiting for the next poll or a route change. */
  refreshUnreadCount: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// Polling is a stand-in for a real push channel (websocket/SSE). Kept short
// so a freshly-assigned Task shows up in the badge quickly; also refetches
// whenever the tab regains focus/visibility, which covers the common case
// of a User switching back to an already-open tab after being assigned.
const POLL_INTERVAL_MS = 8000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const count = await NotificationsApi.unreadCount();
      setUnreadCount(count);
    } catch {
      // ignore — badge just won't update this cycle
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    async function poll() {
      if (!user) return;
      try {
        const count = await NotificationsApi.unreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        // ignore — badge just won't update this cycle
      }
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    function handleFocusOrVisible() {
      if (document.visibilityState === 'hidden') return;
      poll();
    }
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [user]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}