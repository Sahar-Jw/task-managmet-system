'use client';

import { uiText } from '@/lib/ui-text';


import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useLocale,
} from 'next-intl';

import {
  usePathname,
} from 'next/navigation';


/*
 * ============================================================
 * GLOBAL EVENTS
 * ============================================================
 *
 * api.ts cannot use React hooks directly.
 *
 * It sends these browser events instead:
 *
 * app:loading-start
 * app:loading-end
 *
 * This Provider listens to them and controls the global loader.
 * ============================================================
 */

export const GLOBAL_LOADING_START_EVENT =
  'app:loading-start';

export const GLOBAL_LOADING_END_EVENT =
  'app:loading-end';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

/*
 * Do not flash the loader for requests that complete instantly.
 */
const SHOW_DELAY_MS =
  120;


/*
 * Safety valve.
 *
 * A broken request/navigation should never leave the entire app
 * permanently blocked.
 */
const MAX_LOADING_MS =
  8_000;


/*
 * ============================================================
 * CONTEXT
 * ============================================================
 */

type LoadingContextValue = {
  isLoading:
    boolean;

  startLoading:
    () => void;

  stopLoading:
    () => void;
};


const LoadingContext =
  createContext<
    LoadingContextValue | undefined
  >(
    undefined,
  );


/*
 * ============================================================
 * PROVIDER
 * ============================================================
 */

export function LoadingProvider({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const pathname =
    usePathname();


  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  /*
   * activeCount allows several API requests to run together.
   *
   * The loader disappears only after ALL tracked requests finish.
   */
  const activeCountRef =
    useRef(
      0,
    );


  const showTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null,
    );


  const safetyTimerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(
      null,
    );


  /*
   * Navigation loading is tracked separately from API calls.
   */
  const navigationPendingRef =
    useRef(
      false,
    );


  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * CLEAR TIMERS
   * ==========================================================
   */

  const clearTimers =
    useCallback(
      () => {
        if (
          showTimerRef.current
        ) {
          clearTimeout(
            showTimerRef.current,
          );

          showTimerRef.current =
            null;
        }


        if (
          safetyTimerRef.current
        ) {
          clearTimeout(
            safetyTimerRef.current,
          );

          safetyTimerRef.current =
            null;
        }
      },
      [],
    );


  /*
   * ==========================================================
   * SHOW
   * ==========================================================
   */

  const scheduleShow =
    useCallback(
      () => {
        /*
         * Already visible.
         */
        if (
          isLoading ||
          showTimerRef.current
        ) {
          return;
        }


        showTimerRef.current =
          setTimeout(
            () => {
              showTimerRef.current =
                null;


              if (
                activeCountRef.current >
                  0 ||
                navigationPendingRef.current
              ) {
                setIsLoading(
                  true,
                );
              }
            },
            SHOW_DELAY_MS,
          );


        /*
         * Safety timeout.
         */
        if (
          !safetyTimerRef.current
        ) {
          safetyTimerRef.current =
            setTimeout(
              () => {
                activeCountRef.current =
                  0;

                navigationPendingRef.current =
                  false;

                setIsLoading(
                  false,
                );

                clearTimers();
              },
              MAX_LOADING_MS,
            );
        }
      },
      [
        isLoading,
        clearTimers,
      ],
    );


  /*
   * ==========================================================
   * HIDE WHEN EVERYTHING FINISHES
   * ==========================================================
   */

  const hideIfFinished =
    useCallback(
      () => {
        if (
          activeCountRef.current >
            0 ||
          navigationPendingRef.current
        ) {
          return;
        }


        clearTimers();

        setIsLoading(
          false,
        );
      },
      [
        clearTimers,
      ],
    );


  /*
   * ==========================================================
   * MANUAL START / STOP
   * ==========================================================
   */

  const startLoading =
    useCallback(
      () => {
        activeCountRef.current +=
          1;

        scheduleShow();
      },
      [
        scheduleShow,
      ],
    );


  const stopLoading =
    useCallback(
      () => {
        activeCountRef.current =
          Math.max(
            0,
            activeCountRef.current -
              1,
          );

        hideIfFinished();
      },
      [
        hideIfFinished,
      ],
    );


  /*
   * ==========================================================
   * API EVENTS
   * ==========================================================
   */

  useEffect(() => {
    function handleStart() {
      activeCountRef.current +=
        1;

      scheduleShow();
    }


    function handleEnd() {
      activeCountRef.current =
        Math.max(
          0,
          activeCountRef.current -
            1,
        );

      hideIfFinished();
    }


    window.addEventListener(
      GLOBAL_LOADING_START_EVENT,
      handleStart,
    );


    window.addEventListener(
      GLOBAL_LOADING_END_EVENT,
      handleEnd,
    );


    return () => {
      window.removeEventListener(
        GLOBAL_LOADING_START_EVENT,
        handleStart,
      );


      window.removeEventListener(
        GLOBAL_LOADING_END_EVENT,
        handleEnd,
      );
    };
  }, [
    scheduleShow,
    hideIfFinished,
  ]);


  /*
   * ==========================================================
   * NAVIGATION CLICK DETECTION
   * ==========================================================
   *
   * This catches Next <Link> clicks across:
   *
   * - Navbar
   * - Task cards
   * - Project cards
   * - Users
   * - Notifications
   * - Breadcrumbs
   * - etc.
   * ==========================================================
   */

  useEffect(() => {
    function handleDocumentClick(
      event:
        MouseEvent,
    ) {
      /*
       * Ignore modified clicks:
       *
       * Ctrl+click
       * Cmd+click
       * Shift+click
       * Alt+click
       */
      if (
        event.defaultPrevented ||
        event.button !==
          0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }


      const target =
        event.target as
          HTMLElement | null;


      const anchor =
        target?.closest(
          'a[href]',
        ) as
          HTMLAnchorElement | null;


      if (
        !anchor
      ) {
        return;
      }


      /*
       * Some links, such as the application brand, are simple
       * navigation shortcuts and must never block the current page
       * with the global overlay while Next prepares the destination.
       */
      if (
        anchor.hasAttribute(
          'data-no-loading',
        )
      ) {
        return;
      }


      /*
       * Downloads should not show page-navigation loading.
       */
      if (
        anchor.hasAttribute(
          'download',
        )
      ) {
        return;
      }


      /*
       * Links explicitly opening a new tab/window.
       */
      if (
        anchor.target &&
        anchor.target !==
          '_self'
      ) {
        return;
      }


      const href =
        anchor.getAttribute(
          'href',
        );


      if (
        !href ||
        href.startsWith(
          '#',
        ) ||
        href.startsWith(
          'mailto:',
        ) ||
        href.startsWith(
          'tel:',
        ) ||
        href.startsWith(
          'javascript:',
        )
      ) {
        return;
      }


      let url:
        URL;


      try {
        url =
          new URL(
            anchor.href,
            window.location.href,
          );
      } catch {
        return;
      }


      /*
       * External links are handled by the browser.
       */
      if (
        url.origin !==
        window.location.origin
      ) {
        return;
      }


      const currentUrl =
        new URL(
          window.location.href,
        );


      /*
       * Same exact URL = no navigation.
       */
      if (
        url.pathname ===
          currentUrl.pathname &&
        url.search ===
          currentUrl.search &&
        url.hash ===
          currentUrl.hash
      ) {
        return;
      }


      /*
       * Hash-only change doesn't need a loader.
       */
      if (
        url.pathname ===
          currentUrl.pathname &&
        url.search ===
          currentUrl.search &&
        url.hash !==
          currentUrl.hash
      ) {
        return;
      }


      navigationPendingRef.current =
        true;


      scheduleShow();
    }


    document.addEventListener(
      'click',
      handleDocumentClick,
      true,
    );


    return () => {
      document.removeEventListener(
        'click',
        handleDocumentClick,
        true,
      );
    };
  }, [
    scheduleShow,
  ]);


  /*
   * ==========================================================
   * NAVIGATION COMPLETE
   * ==========================================================
   *
   * Next updates pathname after the new route renders.
   * ==========================================================
   */

  useEffect(() => {
    navigationPendingRef.current =
      false;

    hideIfFinished();
  }, [
    pathname,
    hideIfFinished,
  ]);


  /*
   * ==========================================================
   * CLEANUP
   * ==========================================================
   */

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [
    clearTimers,
  ]);


  /*
   * ==========================================================
   * UI
   * ==========================================================
   */

  return (
    <LoadingContext.Provider
      value={{
        isLoading,
        startLoading,
        stopLoading,
      }}
    >
      {children}


      {isLoading && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            pointer-events-none
          "
          role="status"
          aria-live="polite"
          aria-label={
            uiText(isArabic, 'text0265')
          }
        >
          <div
            className="
              hidden
              min-w-[170px]
              flex-col
              items-center
              rounded-2xl
              border
              border-slate-200
              bg-white/95
              px-7
              py-6
              shadow-[0_20px_60px_rgba(15,23,42,0.18)]
              backdrop-blur-xl
            "
          >
            {/*
             * BRAND SPINNER
             */}

            <div
              className="
                relative
                h-11
                w-11
              "
            >
              <div
                className="
                  absolute
                  inset-0
                  rounded-full
                  border-[3px]
                  border-slate-100
                "
              />

              <div
                className="
                  absolute
                  inset-0
                  animate-spin
                  rounded-full
                  border-[3px]
                  border-transparent
                  border-t-brand-600
                  border-r-brand-400
                "
              />
            </div>


            <div
              className="
                mt-4
                text-sm
                font-semibold
                text-slate-800
              "
            >
              {uiText(isArabic, 'text0258')}
            </div>


            <div
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              {uiText(isArabic, 'text0266')}
            </div>
          </div>


          {/*
           * TOP PROGRESS BAR
           */}

          <div
            className="
              absolute
              inset-x-0
              top-0
              h-[3px]
              overflow-hidden
              bg-brand-100
            "
          >
            <div
              className="
                h-full
                w-1/3
                animate-[global-loading-bar_1s_ease-in-out_infinite]
                bg-brand-600
              "
            />
          </div>
        </div>
      )}
    </LoadingContext.Provider>
  );
}


/*
 * ============================================================
 * HOOK
 * ============================================================
 */

export function useLoading() {
  const context =
    useContext(
      LoadingContext,
    );


  if (
    !context
  ) {
    throw new Error(
      'useLoading must be used inside LoadingProvider',
    );
  }


  return context;
}
