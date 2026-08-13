'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './auth-context';
import { API_URL, getToken, refreshAccessToken } from './api';
import { NotificationsApi } from './endpoints';

interface NotificationsContextValue {
  unreadCount: number;
  /** Re-fetches the unread count from the server. Call this after any
   * action that can change it (mark read, mark all read, delete an
   * unread notification) so the Navbar badge updates immediately instead
   * of waiting for the next poll or a route change. */
  refreshUnreadCount: () => Promise<void>;
  /** Bumped every time a `notification` SSE event arrives. Other
   * components (e.g. the /notifications list) can watch this to know the
   * instant something new has landed, without each maintaining its own
   * SSE connection. */
  lastNotificationAt: number;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

// The SSE connection delivers new notifications instantly. This slow poll
// is just a safety net for the (rare) case SSE is unavailable — blocked by
// a corporate proxy, an ad-blocker, etc. — so the badge still eventually
// catches up instead of going stale forever.
const FALLBACK_POLL_INTERVAL_MS = 60000;

// Backoff for SSE reconnect attempts (e.g. after the access token expires
// and the stream drops, or a transient network blip) so a persistently
// failing connection doesn't hammer the server every few seconds.
const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotificationAt, setLastNotificationAt] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    function clearReconnectTimer() {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function scheduleReconnect() {
      if (cancelled) return;
      const attempt = reconnectAttemptRef.current;
      const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
      reconnectAttemptRef.current = attempt + 1;
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(connect, delay);
    }

    async function connect() {
      if (cancelled) return;

      // The access token is short-lived (15m); make sure we hand the
      // stream a live one rather than one that's already expired, since a
      // dropped SSE connection doesn't get the same silent-refresh-and-
      // retry treatment as a normal fetch() through api().
      let token = getToken();
      if (!token) {
        token = await refreshAccessToken();
        if (!token || cancelled) return;
      }

      eventSourceRef.current?.close();
      const es = new EventSource(`${API_URL}/notifications/stream?token=${token}`);
      eventSourceRef.current = es;

      es.addEventListener('notification', () => {
        reconnectAttemptRef.current = 0;
        setLastNotificationAt(Date.now());
        refreshUnreadCount();
      });

      // 'ping' heartbeats need no handling — just proof the connection is alive.
      es.addEventListener('open', () => {
        reconnectAttemptRef.current = 0;
      });

      es.onerror = async () => {
        es.close();
        if (cancelled) return;
        // Could be an expired access token (most common cause) or a
        // transient network issue — either way, get a fresh token before
        // the retry so an expired-token loop doesn't just spin forever.
        await refreshAccessToken();
        scheduleReconnect();
      };
    }

    connect();
    refreshUnreadCount();
    const fallbackPoll = setInterval(refreshUnreadCount, FALLBACK_POLL_INTERVAL_MS);

    function handleFocusOrVisible() {
      if (document.visibilityState === 'hidden') return;
      refreshUnreadCount();
      // A backgrounded tab can have its SSE connection throttled/killed by
      // the browser; re-establish it when the User comes back.
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        reconnectAttemptRef.current = 0;
        connect();
      }
    }
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      cancelled = true;
      clearReconnectTimer();
      clearInterval(fallbackPoll);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
    };
  }, [user, refreshUnreadCount]);

  return (
    <NotificationsContext.Provider value={{ unreadCount, refreshUnreadCount, lastNotificationAt }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}