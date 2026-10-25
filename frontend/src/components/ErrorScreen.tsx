'use client';

import type { ReactNode } from 'react';

/**
 * Presentational shell shared by the 404 page, the route error boundary and
 * the global error boundary. It deliberately uses NO context hooks so it can
 * also render inside `global-error.tsx`, where none of the app providers
 * (auth, branding, dictionary, ...) exist.
 */
export interface ErrorScreenProps {
  /**
   * Three-character code for the hero, e.g. "404": the middle character becomes the box.
   * Omit it (client-side crashes are not HTTP errors) to show the box on its own.
   */
  code?: string;
  /** `warning` swaps the accent to the theme's secondary color and shows "!" in the box. */
  tone?: 'primary' | 'warning';
  badge: string;
  title: string;
  description: string;
  isArabic: boolean;

  /** Primary / secondary buttons. */
  actions: ReactNode;
  /** Optional row under the buttons (quick links, error reference, details...). */
  footer?: ReactNode;

  /** Optional slim top bar with logo + language switch (used when the app Navbar is not shown). */
  header?: {
    siteName: string;
    logoUrl?: string | null;
    homeHref: string;
    languageLabel: string;
    onToggleLanguage: () => void;
  };
}

function BrandMark({ logoUrl, siteName }: { logoUrl?: string | null; siteName: string }) {
  if (logoUrl) {
    return (
      <div
        data-brand-logo
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={siteName} className="h-full w-full object-contain p-1" />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-4 w-4" aria-hidden="true">
        <path d="M7 12.5 10 15.5 17 8.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="4" y="4" width="16" height="16" rx="4" strokeWidth="1.8" />
      </svg>
    </div>
  );
}

export default function ErrorScreen({
  code,
  tone = 'primary',
  badge,
  title,
  description,
  isArabic,
  actions,
  footer,
  header,
}: ErrorScreenProps) {
  const [first, , last] = (code ?? '').padEnd(3, ' ').split('');
  const glyph = tone === 'warning' ? '!' : '?';

  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      className={
        header
          ? /* No app Navbar (signed-out visitor / crashed app): take over the whole viewport,
               escaping the Shell's top padding that normally makes room for the Navbar. */
            'fixed inset-0 z-40 flex flex-col overflow-y-auto overflow-x-hidden bg-[var(--theme-page-background)]'
          : 'relative flex min-h-[calc(100vh-120px)] flex-col overflow-hidden'
      }
    >
      {/* Decorative background — same language as the landing hero. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="error-screen-blob-a absolute -left-40 -top-32 h-[340px] w-[340px] rounded-full blur-3xl" />
        <div className="error-screen-blob-b absolute -right-40 bottom-0 h-[380px] w-[380px] rounded-full blur-3xl" />
        <div className="error-screen-grid absolute inset-0" />
      </div>

      {header && (
        <header className="relative z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="mx-auto flex h-[56px] max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
            {/* Plain <a>: this bar can render when the router/app state is broken. */}
            <a href={header.homeHref} className="flex items-center gap-2.5">
              <BrandMark logoUrl={header.logoUrl} siteName={header.siteName} />
              <span className="text-xs font-semibold tracking-tight text-slate-900 sm:text-sm">
                {header.siteName}
              </span>
            </a>

            <button
              type="button"
              onClick={header.onToggleLanguage}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
            >
              {header.languageLabel}
            </button>
          </div>
        </header>
      )}

      {/* <section>, not <main>: the app Shell already renders the page's <main>. */}
      <section
        className="relative z-10 mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-10 text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: tone === 'warning' ? 'var(--theme-secondary)' : 'var(--theme-primary)' }}
          />
          {badge}
        </span>

        {/* Digits stay left-to-right in Arabic too. */}
        <div
          dir="ltr"
          data-tone={tone}
          aria-hidden="true"
          className="error-screen-digit mt-6 flex select-none items-center justify-center gap-2 font-semibold leading-none tracking-tight sm:gap-3"
          style={{ fontSize: code ? 'clamp(4.5rem, 20vw, 8rem)' : 'clamp(4rem, 16vw, 6.5rem)' }}
        >
          {code && <span>{first}</span>}

          {/* The middle digit is an "unchecked task" box — the app's logo motif, but empty. */}
          <span
            className="error-screen-box error-screen-float inline-flex items-center justify-center rounded-[28%]"
            style={{ width: code ? '0.78em' : '0.9em', height: code ? '0.78em' : '0.9em', fontSize: 'inherit' }}
          >
            <span style={{ fontSize: '0.5em' }}>{glyph}</span>
          </span>

          {code && <span>{last}</span>}
        </div>

        <h1 className="mt-6 text-2xl font-semibold leading-snug tracking-tight text-slate-950 sm:text-3xl">
          {title}
        </h1>

        <p className="mt-3 max-w-md text-sm leading-7 text-slate-600 sm:text-base">{description}</p>

        <div className="mt-7 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row">
          {actions}
        </div>

        {footer && <div className="mt-8 w-full text-xs text-slate-500">{footer}</div>}
      </section>
    </div>
  );
}
