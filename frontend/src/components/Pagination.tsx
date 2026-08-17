'use client';

import { uiText } from '@/lib/ui-text';


import {
  useMemo,
} from 'react';

import {
  useLocale,
} from 'next-intl';


interface PaginationProps {
  page: number;

  totalPages: number;

  total: number;

  onPageChange:
    (page: number) => void;

  itemLabel?: string;
}


type PageToken =
  | number
  | 'ellipsis-left'
  | 'ellipsis-right';


function getPageNumbers(
  page: number,
  totalPages: number,
): PageToken[] {
  if (
    totalPages <= 7
  ) {
    return Array.from(
      {
        length:
          totalPages,
      },
      (
        _,
        index,
      ) =>
        index + 1,
    );
  }


  if (
    page <= 4
  ) {
    return [
      1,
      2,
      3,
      4,
      5,
      'ellipsis-right',
      totalPages,
    ];
  }


  if (
    page >=
    totalPages - 3
  ) {
    return [
      1,
      'ellipsis-left',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }


  return [
    1,
    'ellipsis-left',
    page - 1,
    page,
    page + 1,
    'ellipsis-right',
    totalPages,
  ];
}


function ChevronLeft() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M12.5 15 7.5 10l5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function ChevronRight() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M7.5 15l5-5-5-5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  const locale =
    useLocale();


  const isArabic =
    locale === 'ar';


  const safeTotalPages =
    Math.max(
      totalPages,
      1,
    );


  const safePage =
    Math.min(
      Math.max(
        page,
        1,
      ),
      safeTotalPages,
    );


  const pages =
    useMemo(
      () =>
        getPageNumbers(
          safePage,
          safeTotalPages,
        ),
      [
        safePage,
        safeTotalPages,
      ],
    );


  function go(
    nextPage: number,
  ) {
    if (
      nextPage < 1 ||
      nextPage >
        safeTotalPages ||
      nextPage ===
        safePage
    ) {
      return;
    }


    onPageChange(
      nextPage,
    );


    /*
     * Keeps navigation feeling natural when the list is long.
     * We don't force-scroll all the way to the top of the page.
     */
    window.requestAnimationFrame(
      () => {
        window.scrollTo({
          top:
            Math.max(
              0,
              window.scrollY -
                200,
            ),

          behavior:
            'smooth',
        });
      },
    );
  }


  const previousDisabled =
    safePage <= 1;


  const nextDisabled =
    safePage >=
    safeTotalPages;


  return (
    <nav
      aria-label={uiText(isArabic, 'text0874')}
      className="
        mt-5
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-[0_1px_2px_rgba(15,23,42,0.03)]
      "
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      <div
        className="
          flex
          flex-col
          gap-4
          px-4
          py-4
          sm:px-5
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >
        {/*
         * ====================================================
         * RESULT INFORMATION
         * ====================================================
         */}

        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-brand-50
              text-sm
              font-bold
              text-brand-700
            "
          >
            {safePage}
          </div>


          <div className="min-w-0">
            <div
              className="
                text-sm
                font-semibold
                text-slate-800
              "
            >
              {uiText(isArabic, 'text0748', { value0: safePage, value1: safeTotalPages })}
            </div>


            <div
              className="
                mt-0.5
                text-xs
                text-slate-400
              "
            >
              <span className="font-medium text-slate-500">
                {total.toLocaleString(
                  locale,
                )}
              </span>{' '}

              {itemLabel}
            </div>
          </div>
        </div>


        {/*
         * ====================================================
         * DESKTOP PAGE NUMBERS
         * ====================================================
         */}

        <div
          className="
            hidden
            items-center
            justify-center
            gap-1
            md:flex
          "
        >
          <button
            type="button"
            onClick={() =>
              go(
                safePage - 1,
              )
            }
            disabled={
              previousDisabled
            }
            aria-label={
              uiText(isArabic, 'text0637')
            }
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-500
              transition-all
              hover:border-brand-200
              hover:bg-brand-50
              hover:text-brand-700
              focus:outline-none
              focus:ring-2
              focus:ring-brand-200
              disabled:cursor-not-allowed
              disabled:border-slate-100
              disabled:bg-slate-50
              disabled:text-slate-300
            "
          >
            {isArabic
              ? <ChevronRight />
              : <ChevronLeft />}
          </button>


          <div
            className="
              mx-1
              flex
              items-center
              gap-1
            "
          >
            {pages.map(
              (
                token,
                index,
              ) => {
                if (
                  typeof token !==
                  'number'
                ) {
                  return (
                    <span
                      key={`${token}-${index}`}
                      className="
                        flex
                        h-10
                        w-8
                        items-center
                        justify-center
                        text-sm
                        font-medium
                        text-slate-400
                      "
                    >
                      •••
                    </span>
                  );
                }


                const active =
                  token ===
                  safePage;


                return (
                  <button
                    type="button"
                    key={
                      token
                    }
                    onClick={() =>
                      go(
                        token,
                      )
                    }
                    aria-label={`Page ${token}`}
                    aria-current={
                      active
                        ? 'page'
                        : undefined
                    }
                    className={`
                      relative
                      inline-flex
                      h-10
                      min-w-10
                      items-center
                      justify-center
                      rounded-xl
                      px-3
                      text-sm
                      font-semibold
                      transition-all
                      focus:outline-none
                      focus:ring-2
                      focus:ring-brand-200
                      ${
                        active
                          ? `
                            bg-brand-600
                            text-white
                            shadow-sm
                          `
                          : `
                            text-slate-600
                            hover:bg-slate-100
                            hover:text-slate-900
                          `
                      }
                    `}
                  >
                    {
                      token
                    }
                  </button>
                );
              },
            )}
          </div>


          <button
            type="button"
            onClick={() =>
              go(
                safePage + 1,
              )
            }
            disabled={
              nextDisabled
            }
            aria-label={
              uiText(isArabic, 'text0235')
            }
            className="
              inline-flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              text-slate-500
              transition-all
              hover:border-brand-200
              hover:bg-brand-50
              hover:text-brand-700
              focus:outline-none
              focus:ring-2
              focus:ring-brand-200
              disabled:cursor-not-allowed
              disabled:border-slate-100
              disabled:bg-slate-50
              disabled:text-slate-300
            "
          >
            {isArabic
              ? <ChevronLeft />
              : <ChevronRight />}
          </button>
        </div>


        {/*
         * ====================================================
         * MOBILE CONTROLS
         * ====================================================
         */}

        <div
          className="
            grid
            grid-cols-[1fr_auto_1fr]
            items-center
            gap-2
            md:hidden
          "
        >
          <button
            type="button"
            onClick={() =>
              go(
                safePage - 1,
              )
            }
            disabled={
              previousDisabled
            }
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {isArabic
              ? <ChevronRight />
              : <ChevronLeft />}

            {uiText(isArabic, 'text0638')}
          </button>


          <span
            className="
              min-w-[70px]
              text-center
              text-xs
              font-semibold
              text-slate-500
            "
          >
            {safePage} / {safeTotalPages}
          </span>


          <button
            type="button"
            onClick={() =>
              go(
                safePage + 1,
              )
            }
            disabled={
              nextDisabled
            }
            className="
              inline-flex
              h-10
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-3
              text-xs
              font-semibold
              text-slate-600
              transition
              hover:bg-slate-50
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {uiText(isArabic, 'text0236')}

            {isArabic
              ? <ChevronLeft />
              : <ChevronRight />}
          </button>
        </div>
      </div>


      {/*
       * ======================================================
       * PAGE PROGRESS
       * ======================================================
       */}

      {safeTotalPages >
        1 && (
        <div
          className="
            h-[2px]
            w-full
            bg-slate-100
          "
        >
          <div
            className="
              h-full
              bg-brand-500
              transition-all
              duration-300
            "
            style={{
              width:
                `${Math.max(
                  3,
                  (
                    safePage /
                    safeTotalPages
                  ) *
                    100,
                )}%`,
            }}
          />
        </div>
      )}
    </nav>
  );
}
