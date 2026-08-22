/*
 * Small inline SVG icon set shared by the icon-only action buttons on the
 * projects, tasks, and users pages. Kept dependency-free (no icon package)
 * to match the rest of the codebase (see FileInput.tsx) and avoid adding a
 * new npm install step to the cPanel deployment.
 *
 * All icons: 24x24 viewBox, stroke-based, inherit color via currentColor —
 * size them from the parent with a className like "h-4 w-4".
 */

import type { ReactNode } from 'react';

type IconProps = {
  className?: string;
};

function base(children: ReactNode, className?: string) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? 'h-4 w-4'}
    >
      {children}
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return base(
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </>,
    className,
  );
}

export function DeleteIcon({ className }: IconProps) {
  return base(
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </>,
    className,
  );
}

export function ArchiveIcon({ className }: IconProps) {
  return base(
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </>,
    className,
  );
}

export function UnarchiveIcon({ className }: IconProps) {
  return base(
    <>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M12 17v-5" />
      <path d="M9.5 14.5 12 12l2.5 2.5" />
    </>,
    className,
  );
}

export function ViewIcon({ className }: IconProps) {
  return base(
    <>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    className,
  );
}

export function UserCheckIcon({ className }: IconProps) {
  return base(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m17 11 2 2 4-4" />
    </>,
    className,
  );
}

export function UserXIcon({ className }: IconProps) {
  return base(
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m17 8 5 5" />
      <path d="m22 8-5 5" />
    </>,
    className,
  );
}
