'use client';

import { useMemo } from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

type PageToken = number | 'ellipsis';

function getPageNumbers(page: number, totalPages: number): PageToken[] {
  const tokens: PageToken[] = [];
  const windowSize = 1;

  tokens.push(1);
  if (page - windowSize > 2) tokens.push('ellipsis');
  for (let p = Math.max(2, page - windowSize); p <= Math.min(totalPages - 1, page + windowSize); p++) {
    tokens.push(p);
  }
  if (page + windowSize < totalPages - 1) tokens.push('ellipsis');
  if (totalPages > 1) tokens.push(totalPages);

  return tokens;
}

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  const pages = useMemo(
    () => getPageNumbers(page, Math.max(totalPages, 1)),
    [page, totalPages],
  );

  const safeTotalPages = Math.max(totalPages, 1);

  function go(p: number) {
    if (p < 1 || p > safeTotalPages || p === page) return;
    onPageChange(p);
  }

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>
          Page {page} of {safeTotalPages}
        </span>
        <span className="text-slate-300">•</span>
        <span>
          {total} {itemLabel}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M12.5 15 7.5 10l5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Previous
        </button>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-sm text-slate-400">
                …
              </span>
            ) : (
              <button
                type="button"
                key={p}
                onClick={() => go(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-brand-700 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page >= safeTotalPages}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path
              d="M7.5 15l5-5-5-5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
