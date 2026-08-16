import {
  Paginated,
} from './types';


/*
 * ============================================================
 * API CONFIG
 * ============================================================
 */

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3000/api/v1';


/*
 * Avatars / branding assets are served from the API origin,
 * not from /api/v1.
 */
const API_ORIGIN =
  API_URL.replace(
    /\/api\/v\d+\/?$/,
    '',
  );


/*
 * ============================================================
 * GLOBAL LOADING EVENTS
 * ============================================================
 */

const GLOBAL_LOADING_START_EVENT =
  'app:loading-start';


const GLOBAL_LOADING_END_EVENT =
  'app:loading-end';


/*
 * ============================================================
 * BACKGROUND REQUESTS
 * ============================================================
 *
 * These should NOT cover the whole screen with a loader.
 *
 * Notifications poll / refresh silently in the background.
 * Otherwise the loader would keep flashing while the User is
 * doing unrelated work.
 * ============================================================
 */

function isBackgroundRequest(
  path:
    string,
) {
  return (
    path.startsWith(
      '/notifications/unread-count',
    ) ||
    path.startsWith(
      '/auth/refresh',
    )
  );
}


/*
 * ============================================================
 * LOADING EVENT HELPERS
 * ============================================================
 */

function emitLoadingStart() {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }


  window.dispatchEvent(
    new CustomEvent(
      GLOBAL_LOADING_START_EVENT,
    ),
  );
}


function emitLoadingEnd() {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }


  window.dispatchEvent(
    new CustomEvent(
      GLOBAL_LOADING_END_EVENT,
    ),
  );
}


/*
 * ============================================================
 * STATIC ASSETS
 * ============================================================
 */

function resolveStaticAssetUrl(
  path?:
    string | null,
):
  string | null {
  if (
    !path
  ) {
    return null;
  }


  if (
    /^https?:\/\//i.test(
      path,
    )
  ) {
    return path;
  }


  return `${API_ORIGIN}${
    path.startsWith(
      '/',
    )
      ? ''
      : '/'
  }${path}`;
}


/*
 * Resolves:
 *
 * /avatars/xyz.png
 */
export function resolveAvatarUrl(
  avatarUrl?:
    string | null,
):
  string | null {
  return resolveStaticAssetUrl(
    avatarUrl,
  );
}


/*
 * Resolves:
 *
 * /branding-assets/xyz.png
 */
export function resolveBrandingAssetUrl(
  path?:
    string | null,
):
  string | null {
  return resolveStaticAssetUrl(
    path,
  );
}


/*
 * ============================================================
 * API ERROR
 * ============================================================
 */

export class ApiError
  extends Error {
  status:
    number;


  constructor(
    message:
      string,

    status:
      number,
  ) {
    super(
      message,
    );


    this.status =
      status;
  }
}


/*
 * ============================================================
 * ACCESS TOKEN
 * ============================================================
 */

export function getToken():
  string | null {
  if (
    typeof window ===
    'undefined'
  ) {
    return null;
  }


  return localStorage.getItem(
    'accessToken',
  );
}


export function setToken(
  token:
    string | null,
) {
  if (
    typeof window ===
    'undefined'
  ) {
    return;
  }


  if (
    token
  ) {
    localStorage.setItem(
      'accessToken',
      token,
    );
  } else {
    localStorage.removeItem(
      'accessToken',
    );
  }
}


/*
 * ============================================================
 * TOKEN REFRESH
 * ============================================================
 *
 * Only one refresh runs at a time.
 * ============================================================
 */

let refreshInFlight:
  Promise<
    string | null
  > | null =
  null;


export async function refreshAccessToken():
  Promise<
    string | null
  > {
  if (
    !refreshInFlight
  ) {
    refreshInFlight =
      (
        async () => {
          try {
            const res =
              await fetch(
                `${API_URL}/auth/refresh`,
                {
                  method:
                    'POST',

                  credentials:
                    'include',
                },
              );


            if (
              !res.ok
            ) {
              return null;
            }


            const json =
              await res
                .json()
                .catch(
                  () =>
                    null,
                );


            const newToken =
              (
                json?.data ??
                json
              )?.accessToken ??
              null;


            setToken(
              newToken,
            );


            return newToken;
          } catch {
            return null;
          } finally {
            refreshInFlight =
              null;
          }
        }
      )();
  }


  return refreshInFlight;
}


/*
 * ============================================================
 * API OPTIONS
 * ============================================================
 */

type ApiOptions = {
  method?:
    | 'GET'
    | 'POST'
    | 'PATCH'
    | 'DELETE';

  body?:
    any;

  isForm?:
    boolean;

  /*
   * Set false for silent/background requests when needed.
   *
   * Default = true.
   */
  showLoader?:
    boolean;
};


/*
 * ============================================================
 * CORE API
 * ============================================================
 *
 * Every normal frontend backend request runs through here.
 *
 * The global loader is started automatically and is stopped in
 * finally, whether the request succeeds or fails.
 * ============================================================
 */

export async function api<
  T = any
>(
  path:
    string,

  options:
    ApiOptions = {},

  _isRetry =
    false,
):
  Promise<T> {
  /*
   * Only the original call owns the Loader.
   *
   * A retry after refreshing the access token must not create a
   * second Loader count.
   */
  const shouldTrack =
    !_isRetry &&
    options.showLoader !==
      false &&
    !isBackgroundRequest(
      path,
    );


  if (
    shouldTrack
  ) {
    emitLoadingStart();
  }


  try {
    const token =
      getToken();


    const headers:
      Record<
        string,
        string
      > = {};


    if (
      token
    ) {
      headers[
        'Authorization'
      ] =
        `Bearer ${token}`;
    }


    if (
      !options.isForm &&
      options.body !==
        undefined
    ) {
      headers[
        'Content-Type'
      ] =
        'application/json';
    }


    /*
     * ========================================================
     * REQUEST
     * ========================================================
     */

    const res =
      await fetch(
        `${API_URL}${path}`,
        {
          method:
            options.method ||
            'GET',

          headers,

          credentials:
            'include',

          body:
            options.isForm
              ? options.body
              : options.body !==
                  undefined
                ? JSON.stringify(
                    options.body,
                  )
                : undefined,
        },
      );


    /*
     * ========================================================
     * AUTH REFRESH
     * ========================================================
     */

    const isAuthEndpoint =
      path.startsWith(
        '/auth/',
      );


    if (
      res.status ===
        401 &&
      !isAuthEndpoint &&
      !_isRetry
    ) {
      const newToken =
        await refreshAccessToken();


      if (
        newToken
      ) {
        /*
         * Retry does not increment Loader count.
         */
        return api<T>(
          path,

          options,

          true,
        );
      }


      setToken(
        null,
      );
    }


    /*
     * ========================================================
     * RESPONSE BODY
     * ========================================================
     */

    let json:
      any =
      null;


    try {
      json =
        await res.json();
    } catch {
      /*
       * Some DELETE / file-related responses may have no JSON.
       */
    }


    /*
     * ========================================================
     * ERROR
     * ========================================================
     */

    if (
      !res.ok
    ) {
      const message =
        json?.message
          ? Array.isArray(
              json.message,
            )
            ? json.message.join(
                ', ',
              )
            : json.message
          : `Request failed (${res.status})`;


      throw new ApiError(
        message,
        res.status,
      );
    }


    /*
     * ========================================================
     * SUCCESS
     * ========================================================
     */

    return (
      json?.data ??
      json
    ) as T;
  } finally {
    if (
      shouldTrack
    ) {
      emitLoadingEnd();
    }
  }
}


/*
 * ============================================================
 * AUTHENTICATED FILE REQUEST
 * ============================================================
 */

async function fetchAuthed(
  path:
    string,
):
  Promise<Blob> {
  /*
   * Files may take noticeable time, so they use the global
   * loader too.
   */
  emitLoadingStart();


  try {
    let token =
      getToken();


    let res =
      await fetch(
        `${API_URL}${path}`,
        {
          headers:
            token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {},
        },
      );


    /*
     * Retry once after refresh.
     */
    if (
      res.status ===
      401
    ) {
      token =
        await refreshAccessToken();


      if (
        token
      ) {
        res =
          await fetch(
            `${API_URL}${path}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );
      }
    }


    if (
      !res.ok
    ) {
      throw new ApiError(
        'Could not load file',
        res.status,
      );
    }


    return res.blob();
  } finally {
    emitLoadingEnd();
  }
}


/*
 * ============================================================
 * DOWNLOAD FILE
 * ============================================================
 */

export async function downloadFile(
  path:
    string,

  fileName:
    string,
) {
  const blob =
    await fetchAuthed(
      path,
    );


  const url =
    URL.createObjectURL(
      blob,
    );


  const link =
    document.createElement(
      'a',
    );


  link.href =
    url;


  link.download =
    fileName;


  link.click();


  URL.revokeObjectURL(
    url,
  );
}


/*
 * ============================================================
 * RAW BLOB
 * ============================================================
 */

export async function fetchFileAsBlob(
  path:
    string,
):
  Promise<Blob> {
  return fetchAuthed(
    path,
  );
}


/*
 * ============================================================
 * OBJECT URL
 * ============================================================
 */

export async function fetchFileAsObjectUrl(
  path:
    string,
):
  Promise<string> {
  const blob =
    await fetchAuthed(
      path,
    );


  return URL.createObjectURL(
    blob,
  );
}


/*
 * ============================================================
 * ARRAY BUFFER
 * ============================================================
 */

export async function fetchFileAsArrayBuffer(
  path:
    string,
):
  Promise<ArrayBuffer> {
  const blob =
    await fetchAuthed(
      path,
    );


  return blob.arrayBuffer();
}


/*
 * Keep this import/type available because endpoints.ts may use
 * Paginated via the shared API module in older parts of the app.
 */
export type {
  Paginated,
};