import { Paginated } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

// Avatars are served as static files off the API's root (e.g. /avatars/xyz.png),
// not under the /api/v1 prefix used by JSON endpoints — strip it back off here.
const API_ORIGIN = API_URL.replace(/\/api\/v\d+\/?$/, '');

/** Resolves an avatarUrl (e.g. "/avatars/xyz.png") to a full, loadable URL. */
export function resolveAvatarUrl(avatarUrl?: string | null): string | null {
  if (!avatarUrl) return null;
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl;
  return `${API_ORIGIN}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function setToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('accessToken', token);
  else localStorage.removeItem('accessToken');
}

// The access token is short-lived on purpose (15m). Rather than bouncing the
// user to the sign-in page the moment it expires, we silently exchange the
// HttpOnly refresh cookie for a new one and retry the original request —
// the user only has to sign in again once the refresh token itself expires
// (7d) or is revoked. `refreshInFlight` makes sure that if several requests
// 401 around the same time, we only call /auth/refresh once and let every
// pending request wait on that same promise instead of racing each other.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!res.ok) return null;
        const json = await res.json().catch(() => null);
        const newToken = (json?.data ?? json)?.accessToken ?? null;
        setToken(newToken);
        return newToken;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

/**
 * One function for every API call in the app. Adds the JWT if present,
 * unwraps the backend's `{ data: ... }` envelope, and turns error
 * responses into a plain ApiError with the backend's message. On a 401
 * (expired access token) it transparently refreshes and retries once
 * before giving up.
 */
export async function api<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: any;
    isForm?: boolean;
  } = {},
  _isRetry = false,
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!options.isForm && options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    credentials: 'include',
    body: options.isForm
      ? options.body
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  });

  // Don't try to refresh on the auth endpoints themselves — a 401 there
  // means bad credentials or an actually-expired/revoked refresh token,
  // not an expired access token.
  const isAuthEndpoint = path.startsWith('/auth/');
  if (res.status === 401 && !isAuthEndpoint && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return api<T>(path, options, true);
    }
    setToken(null);
  }

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // no body (e.g. some DELETE responses)
  }

  if (!res.ok) {
    const message = json?.message
      ? Array.isArray(json.message)
        ? json.message.join(', ')
        : json.message
      : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return (json?.data ?? json) as T;
}

/** Downloads a file that requires the Authorization header (e.g. attachments). */
export async function downloadFile(path: string, fileName: string) {
  let token = getToken();
  let res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (token) {
      res = await fetch(`${API_URL}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  if (!res.ok) throw new ApiError('Could not download file', res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
