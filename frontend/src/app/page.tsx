'use client';

import { uiText } from '@/lib/ui-text';


import {
  useEffect,
  useRef,
  useState,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
} from 'next/navigation';

import {
  useLocale,
} from 'next-intl';
import { useDictionary } from '@/lib/dictionary-context';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  useBranding,
} from '@/lib/branding-context';

import {
  ApiError,
  resolveBrandingAssetUrl,
} from '@/lib/api';

import {
  PublicApi,
  TeamsApi,
} from '@/lib/endpoints';

import type {
  TeamInvitePreview,
} from '@/lib/types';

import {
  isValidPhone,
} from '@/lib/validation';

import PasswordInput from '@/components/PasswordInput';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type AuthMode =
  | 'login'
  | 'register'
  | null;

type RegistrationOption = {
  id: string;
  codeAr: string;
  codeEn: string;
  valueAr?: string;
  valueEn?: string;
};


/*
 * ============================================================
 * MAIN PAGE
 * ============================================================
 */

export default function Home() {
  const {
    user,
    loading,
    login,
    register,
  } = useAuth();

  const {
    branding,
  } = useBranding();

  const router =
    useRouter();

  const locale =
    useLocale();

  const isArabic =
    locale === 'ar';

  const { text: dictionaryText } = useDictionary();

  const t = (key: string) => dictionaryText(`home.${key}`);


  /*
   * ==========================================================
   * AUTH PANEL
   * ==========================================================
   */

  const authRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [
    mode,
    setMode,
  ] = useState<AuthMode>(
    null,
  );

  const [
    authError,
    setAuthError,
  ] = useState('');

  const [
    submitting,
    setSubmitting,
  ] = useState(false);


  /*
   * ==========================================================
   * FORM
   * ==========================================================
   */

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [
    phone,
    setPhone,
  ] = useState('');

  const [
    phoneError,
    setPhoneError,
  ] = useState('');

  const [
    inviteToken,
    setInviteToken,
  ] = useState('');

  const [
    invitePreview,
    setInvitePreview,
  ] = useState<TeamInvitePreview | null>(null);

  const [
    loadingInvite,
    setLoadingInvite,
  ] = useState(false);

  const [
    inviteError,
    setInviteError,
  ] = useState('');

  const [
    branches,
    setBranches,
  ] = useState<RegistrationOption[]>([]);

  const [
    departments,
    setDepartments,
  ] = useState<RegistrationOption[]>([]);

  const [
    branchId,
    setBranchId,
  ] = useState('');

  const [
    departmentId,
    setDepartmentId,
  ] = useState('');


  /*
   * ==========================================================
   * REDIRECT AUTHENTICATED USERS
   * ==========================================================
   */

  useEffect(() => {
    if (
      !loading &&
      user &&
      mode !== 'register'
    ) {
      router.replace(
        '/dashboard',
      );
    }
  }, [
    user,
    loading,
    router,
  ]);


  /*
   * ==========================================================
   * READ ?auth=login / register
   * ==========================================================
   */

  useEffect(() => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search,
      );

    const auth =
      params.get(
        'auth',
      );

    const requestedMode:
      AuthMode =
      auth ===
      'register'
        ? 'register'
        : auth ===
            'login'
          ? 'login'
          : null;

    setMode(
      requestedMode,
    );

    const tokenFromUrl =
      params.get(
        'inviteToken',
      );

    if (
      tokenFromUrl
    ) {
      setInviteToken(
        tokenFromUrl,
      );
    }
  }, []);


  /*
   * ==========================================================
   * SCROLL TO AUTH
   * ==========================================================
   */

  useEffect(() => {
    if (!mode) {
      return;
    }

    window.setTimeout(
      () => {
        authRef.current?.scrollIntoView({
          behavior:
            'smooth',

          block:
            'center',
        });
      },
      50,
    );
  }, [
    mode,
  ]);


  /*
   * ==========================================================
   * INVITE-TOKEN PREVIEW
   * ==========================================================
   *
   * If the register form was reached via a Team Leader's invite
   * link (?inviteToken=...), resolve it to "you're joining
   * <leader>'s team" up front so people don't fill out the whole
   * form before finding out the link is bad. No token at all is
   * also valid — that path creates a brand-new Team Leader.
   */

  useEffect(() => {
    if (mode !== 'register' || inviteToken) {
      return;
    }

    let cancelled = false;

    async function loadRegistrationOptions() {
      try {
        const [branchOptions, departmentOptions] = await Promise.all([
          PublicApi.branches(),
          PublicApi.departments(),
        ]);

        if (!cancelled) {
          setBranches(branchOptions);
          setDepartments(departmentOptions);
        }
      } catch {
        if (!cancelled) {
          setBranches([]);
          setDepartments([]);
        }
      }
    }

    void loadRegistrationOptions();

    return () => {
      cancelled = true;
    };
  }, [
    inviteToken,
    mode,
  ]);

  useEffect(() => {
    if (!inviteToken) {
      setInvitePreview(null);
      return;
    }

    let cancelled = false;

    async function loadInvitePreview() {
      setLoadingInvite(true);
      setInviteError('');

      try {
        const preview =
          await TeamsApi.invitePreview(
            inviteToken,
          );

        if (!cancelled) {
          setInvitePreview(preview);
        }
      } catch (err) {
        if (!cancelled) {
          setInvitePreview(null);

          setInviteError(
            err instanceof ApiError
              ? err.message
              : uiText(isArabic, 'text1113'),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingInvite(false);
        }
      }
    }

    loadInvitePreview();

    return () => {
      cancelled = true;
    };
  }, [
    inviteToken,
    isArabic,
  ]);


  /*
   * ==========================================================
   * AUTH PANEL
   * ==========================================================
   */

  function openAuth(
    selectedMode:
      AuthMode,
  ) {
    setMode(
      selectedMode,
    );

    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }


    const url =
      new URL(
        window.location.href,
      );


    if (
      selectedMode
    ) {
      url.searchParams.set(
        'auth',
        selectedMode,
      );

      url.hash =
        'auth';
    } else {
      url.searchParams.delete(
        'auth',
      );

      url.hash =
        '';
    }


    window.history.replaceState(
      {},
      '',
      url.toString(),
    );
  }


  function resetForm() {
    setAuthError('');
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setPhoneError('');
    // inviteToken / invitePreview are intentionally left alone: they
    // come from the URL (the leader's shared link), not from typing.
  }


  function handleModeChange(
    selectedMode:
      Exclude<
        AuthMode,
        null
      >,
  ) {
    resetForm();

    openAuth(
      mode ===
        selectedMode
        ? null
        : selectedMode,
    );
  }


  function toggleLanguage() {
    const nextLocale =
      isArabic
        ? 'en'
        : 'ar';

    document.cookie =
      `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;

    localStorage.setItem(
      'NEXT_LOCALE',
      nextLocale,
    );

    window.location.reload();
  }


  /*
   * ==========================================================
   * PHONE
   * ==========================================================
   */

  function handlePhoneChange(
    event:
      React.ChangeEvent<HTMLInputElement>,
  ) {
    const digitsOnly =
      event.target.value
        .replace(
          /\D/g,
          '',
        )
        .slice(
          0,
          15,
        );

    setPhone(
      digitsOnly,
    );

    if (
      phoneError
    ) {
      setPhoneError('');
    }
  }


  /*
   * ==========================================================
   * AUTH SUBMIT
   * ==========================================================
   */

  async function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setAuthError('');
    setPhoneError('');
    setSubmitting(
      true,
    );


    if (
      mode ===
        'register' &&
      phone &&
      !isValidPhone(
        phone,
      )
    ) {
      setPhoneError(
        uiText(isArabic, 'text1038'),
      );

      setSubmitting(
        false,
      );

      return;
    }


    try {
      if (
        mode ===
        'login'
      ) {
        await login(
          email,
          password,
        );
      }


      if (
        mode ===
        'register'
      ) {
        await register({
          fullName,
          email,
          password,

          phone:
            phone ||
            undefined,

          inviteToken:
            inviteToken ||
            undefined,

          ...(inviteToken
            ? {}
            : {
                branchId,
                departmentId,
              }),
        });
      }


      router.push(
        '/dashboard',
      );
    } catch (
      err
    ) {
      setAuthError(
        err instanceof ApiError
          ? err.message
          : uiText(isArabic, 'text0326'),
      );

      setSubmitting(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CONTENT
   * ==========================================================
   */

  const features = [
    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M4 20V8l8-4 8 4v12"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M8 20v-6h8v6M8 10h.01M12 10h.01M16 10h.01"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),

      title:
        uiText(isArabic, 'text0327'),

      description:
        uiText(isArabic, 'text0328'),
    },

    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M8 12.5 10.5 15 16 9"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle
            cx="12"
            cy="12"
            r="9"
            strokeWidth="1.8"
          />
        </svg>
      ),

      title:
        uiText(isArabic, 'text0329'),

      description:
        uiText(isArabic, 'text0330'),
    },

    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M6 4h12v16H6z"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />

          <path
            d="M9 8h6M9 12h6M9 16h4"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),

      title:
        uiText(isArabic, 'text0331'),

      description:
        uiText(isArabic, 'text0332'),
    },

    {
      icon: (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            d="M5 19V9M12 19V5M19 19v-7"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          <path
            d="M3 19h18"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      ),

      title:
        uiText(isArabic, 'text0333'),

      description:
        uiText(isArabic, 'text0334'),
    },
  ];


  const workflow = [
    {
      number:
        '01',

      title:
        uiText(isArabic, 'text0335'),

      description:
        uiText(isArabic, 'text0336'),
    },

    {
      number:
        '02',

      title:
        uiText(isArabic, 'text0046'),

      description:
        uiText(isArabic, 'text0337'),
    },

    {
      number:
        '03',

      title:
        uiText(isArabic, 'text0338'),

      description:
        uiText(isArabic, 'text0339'),
    },

    {
      number:
        '04',

      title:
        uiText(isArabic, 'text0340'),

      description:
        uiText(isArabic, 'text0341'),
    },
  ];


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[var(--page-bg,#f8fafc)] text-slate-900"
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ======================================================
       * NAVBAR
       * ======================================================
       */}

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[56px] max-w-7xl items-center justify-between gap-2 px-3 sm:h-[60px] sm:px-6 lg:px-8">
          <Link
            href={
              user
                ? '/dashboard'
                : '/'
            }
            data-no-loading
            className="flex items-center gap-2.5"
          >
            {branding?.logoUrl ? (
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveBrandingAssetUrl(branding.logoUrl) ?? undefined}
                  alt={branding.siteName || 'Task & Project Manager'}
                  className="h-full w-full object-contain p-1"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M7 12.5 10 15.5 17 8.5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="4"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
            )}

            <div className="hidden min-w-0 sm:block">
              <div className="text-xs font-semibold tracking-tight text-slate-900 sm:text-sm">
                {branding?.siteName || 'Task & Project Manager'}
              </div>

              <div className="hidden text-[10px] text-slate-400 sm:block">
                {uiText(isArabic, 'text0342')}
              </div>
            </div>
          </Link>


          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleLanguage}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              aria-label={uiText(isArabic, 'text0763')}
              title={uiText(isArabic, 'text0763')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" strokeWidth="1.7" />
                <path d="M3 12h18M12 3c2.5 2.5 3.7 5.5 3.7 9S14.5 18.5 12 21M12 3C9.5 5.5 8.3 8.5 8.3 12s1.2 6.5 3.7 9" strokeWidth="1.7" />
              </svg>

              <span className="hidden sm:inline">
                {uiText(locale === 'en', 'text0763')}
              </span>

              <span className="sm:hidden">
                {locale === 'en' ? 'AR' : 'EN'}
              </span>
            </button>


            <button
              type="button"
              onClick={() =>
                handleModeChange(
                  'login',
                )
              }
              className="hidden rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              {t(
                'signIn',
              )}
            </button>


            <button
              type="button"
              onClick={() =>
                handleModeChange(
                  'register',
                )
              }
              className="btn-primary px-2.5 text-xs sm:px-3"
            >
              {t(
                'createAccount',
              )}
            </button>
          </nav>
        </div>
      </header>


      {/*
       * ======================================================
       * HERO
       * ======================================================
       */}

      <main>
        <section className="relative overflow-hidden">
          {/*
           * Soft decorative background
           */}

          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-40 -top-40 h-[360px] w-[360px] rounded-full bg-brand-100/70 blur-3xl" />

            <div className="absolute -right-48 top-32 h-[400px] w-[400px] rounded-full bg-brand-50 blur-3xl" />

            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:64px_64px] opacity-[0.18]" />
          </div>


          <div className="relative mx-auto grid max-w-7xl gap-6 px-3 py-8 sm:min-h-[500px] sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:py-16">
            {/*
             * HERO COPY
             */}

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-brand-500" />

                {uiText(isArabic, 'text0343')}
              </div>


              <h1 className="mt-4 max-w-3xl text-xl font-semibold leading-relaxed tracking-[-0.02em] text-slate-950 sm:text-3xl lg:text-[34px]">
                {uiText(isArabic, 'text0344')}
              </h1>


              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                {uiText(isArabic, 'text0345')}
              </p>


              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      'register',
                    )
                  }
                  className="btn-primary min-h-[40px] px-6 text-sm"
                >
                  {uiText(isArabic, 'text0346')}

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    className="ml-2 h-4 w-4"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>


                <button
                  type="button"
                  onClick={() =>
                    handleModeChange(
                      'login',
                    )
                  }
                  className="btn-secondary min-h-[40px] px-6 text-sm"
                >
                  {uiText(isArabic, 'text0047')}
                </button>
              </div>


              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                {[
                  uiText(isArabic, 'text0048'),

                  uiText(isArabic, 'text0347'),

                  uiText(isArabic, 'text0348'),
                ].map(
                  (
                    label,
                  ) => (
                    <div
                      key={
                        label
                      }
                      className="flex items-center gap-2"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                        ✓
                      </span>

                      {
                        label
                      }
                    </div>
                  ),
                )}
              </div>
            </div>


            {/*
             * HERO PRODUCT MOCKUP
             */}

            <div className="relative">
              <div className="absolute -inset-5 rounded-[36px] bg-brand-200/30 blur-2xl" />


              <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,.35)]">
                {/*
                 * Window header
                 */}

                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                    <span className="h-2 w-2 rounded-full bg-slate-300" />
                  </div>

                  <div className="text-[11px] font-medium text-slate-400">
                    {uiText(isArabic, 'text0349')}
                  </div>

                  <div className="w-10" />
                </div>


                <div className="p-4 sm:p-5">
                  {/*
                   * Mini dashboard
                   */}

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        label:
                          uiText(isArabic, 'text0350'),

                        value:
                          '12',
                      },

                      {
                        label:
                          uiText(isArabic, 'text0351'),

                        value:
                          '4',
                      },

                      {
                        label:
                          uiText(isArabic, 'text0018'),

                        value:
                          '28',
                      },
                    ].map(
                      (
                        item,
                      ) => (
                        <div
                          key={
                            item.label
                          }
                          className="rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"
                        >
                          <div className="text-lg font-semibold text-slate-900">
                            {
                              item.value
                            }
                          </div>

                          <div className="mt-0.5 truncate text-[10px] text-slate-400">
                            {
                              item.label
                            }
                          </div>
                        </div>
                      ),
                    )}
                  </div>


                  {/*
                   * Main task
                   */}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-brand-500" />

                          <span className="text-xs font-medium text-slate-400">
                            {uiText(isArabic, 'text0049')}
                          </span>
                        </div>


                        <div className="mt-1.5 text-sm font-semibold text-slate-800">
                          {uiText(isArabic, 'text0352')}
                        </div>
                      </div>


                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        {uiText(isArabic, 'text0050')}
                      </span>
                    </div>


                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-slate-50 p-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {uiText(isArabic, 'text0051')}
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-700">
                          Sarah Ahmed
                        </div>
                      </div>


                      <div className="rounded-lg bg-slate-50 p-2.5">
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">
                          {uiText(isArabic, 'text0052')}
                        </div>

                        <div className="mt-1 text-xs font-medium text-brand-700">
                          {uiText(isArabic, 'text0353')}
                        </div>
                      </div>
                    </div>


                    <div className="mt-4">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {uiText(isArabic, 'text0354')}
                        </span>

                        <span className="text-[10px] text-slate-400">
                          3 / 5
                        </span>
                      </div>


                      <div className="flex items-center">
                        {[
                          true,
                          true,
                          true,
                          false,
                          false,
                        ].map(
                          (
                            active,
                            index,
                          ) => (
                            <div
                              key={
                                index
                              }
                              className="flex flex-1 items-center last:flex-none"
                            >
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                                  active
                                    ? 'bg-brand-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-400'
                                }`}
                              >
                                {active
                                  ? '✓'
                                  : index +
                                    1}
                              </div>

                              {index <
                                4 && (
                                <div
                                  className={`h-px flex-1 ${
                                    index <
                                    2
                                      ? 'bg-brand-300'
                                      : 'bg-slate-200'
                                  }`}
                                />
                              )}
                            </div>
                          ),
                        )}
                      </div>


                      <div className="mt-3 grid grid-cols-5 text-center text-[8px] text-slate-400">
                        <span>
                          {uiText(isArabic, 'text0355')}
                        </span>

                        <span>
                          {uiText(isArabic, 'text0053')}
                        </span>

                        <span>
                          {uiText(isArabic, 'text0356')}
                        </span>

                        <span>
                          {uiText(isArabic, 'text0357')}
                        </span>

                        <span>
                          {uiText(isArabic, 'text0054')}
                        </span>
                      </div>
                    </div>
                  </div>


                  {/*
                   * Activity
                   */}

                  <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {uiText(isArabic, 'text0055')}
                    </div>


                    <div className="mt-3 space-y-3">
                      {[
                        {
                          dot:
                            'bg-brand-500',

                          text:
                            uiText(isArabic, 'text0056'),

                          time:
                            '09:42',
                        },

                        {
                          dot:
                            'bg-amber-400',

                          text:
                            uiText(isArabic, 'text0057'),

                          time:
                            '09:18',
                        },

                        {
                          dot:
                            'bg-slate-300',

                          text:
                            uiText(isArabic, 'text0058'),

                          time:
                            '08:51',
                        },
                      ].map(
                        (
                          row,
                        ) => (
                          <div
                            key={
                              row.text
                            }
                            className="flex items-center gap-3"
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`}
                            />

                            <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                              {
                                row.text
                              }
                            </span>

                            <span className="text-[10px] text-slate-400">
                              {
                                row.time
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/*
         * ======================================================
         * AUTH
         * ======================================================
         */}

        {mode && (
          <section
            id="auth"
            ref={
              authRef
            }
            className="relative border-y border-slate-200 bg-white py-10"
          >
            <div className="mx-auto max-w-5xl px-5 sm:px-6">
              <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl">
                <div className="grid lg:grid-cols-[.85fr_1.15fr]">
                  {/*
                   * AUTH SIDE
                   */}

                  <div className="relative hidden overflow-hidden bg-brand-600 p-6 text-white lg:block">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
                    <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full border border-white/10" />


                    <div className="relative flex h-full min-h-[420px] flex-col">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            d="M7 12.5 10 15.5 17 8.5"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          <rect
                            x="4"
                            y="4"
                            width="16"
                            height="16"
                            rx="4"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>


                      <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                        {mode ===
                        'login'
                          ? uiText(isArabic, 'text0059')
                          : uiText(isArabic, 'text0358')}
                      </h2>


                      <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                        {mode ===
                        'login'
                          ? uiText(isArabic, 'text0359')
                          : uiText(isArabic, 'text0360')}
                      </p>


                      <div className="mt-auto space-y-2 pt-6">
                        {[
                          uiText(isArabic, 'text0361'),

                          uiText(isArabic, 'text0362'),

                          uiText(isArabic, 'text0363'),
                        ].map(
                          (
                            item,
                          ) => (
                            <div
                              key={
                                item
                              }
                              className="flex items-center gap-3 text-sm text-white/80"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-xs">
                                ✓
                              </span>

                              {
                                item
                              }
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>


                  {/*
                   * AUTH FORM
                   */}

                  <div className="p-5 sm:p-6 lg:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[.16em] text-brand-600">
                          {mode ===
                          'login'
                            ? uiText(isArabic, 'text0047')
                            : uiText(isArabic, 'text0364')}
                        </div>

                        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
                          {mode ===
                          'login'
                            ? uiText(isArabic, 'text0365')
                            : uiText(isArabic, 'text0366')}
                        </h2>
                      </div>


                      <button
                        type="button"
                        onClick={() =>
                          openAuth(
                            null,
                          )
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={uiText(isArabic, 'text0842')}
                      >
                        ✕
                      </button>
                    </div>


                    {/*
                     * Mode tabs
                     */}

                    <div className="mt-7 flex rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() =>
                          handleModeChange(
                            'login',
                          )
                        }
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          mode ===
                          'login'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {uiText(isArabic, 'text0047')}
                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          handleModeChange(
                            'register',
                          )
                        }
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                          mode ===
                          'register'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {uiText(isArabic, 'text0367')}
                      </button>
                    </div>


                    <form
                      onSubmit={
                        handleSubmit
                      }
                      className="mt-7 space-y-5"
                    >
                      {mode ===
                        'register' && (
                        <div className="sm:col-span-2">
                          {inviteToken ? (
                            loadingInvite ? (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                                {uiText(isArabic, 'text1114')}
                              </div>
                            ) : invitePreview ? (
                              <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                                {uiText(isArabic, 'text1256', {
                                  leaderName: invitePreview.leaderName ?? '',
                                  teamName: invitePreview.teamName,
                                })}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {inviteError ||
                                  (uiText(isArabic, 'text1113'))}
                              </div>
                            )
                          ) : (
                            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                              {uiText(isArabic, 'text1115')}
                            </div>
                          )}
                        </div>
                      )}


                      {mode ===
                        'register' && (
                        <div className="grid gap-5 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label
                              className="label"
                              htmlFor="fullName"
                            >
                              {uiText(isArabic, 'text0060')}
                            </label>

                            <input
                              id="fullName"
                              type="text"
                              required
                              maxLength={
                                150
                              }
                              autoFocus
                              autoComplete="name"
                              className="input"
                              value={
                                fullName
                              }
                              onChange={(
                                event,
                              ) =>
                                setFullName(
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          </div>


                          <div className="sm:col-span-2">
                            <label
                              className="label"
                              htmlFor="phone"
                            >
                              {uiText(isArabic, 'text0061')}{' '}

                              <span className="font-normal text-slate-400">
                                {uiText(isArabic, 'text0062')}
                              </span>
                            </label>

                            <input
                              id="phone"
                              type="tel"
                              inputMode="numeric"
                              maxLength={
                                15
                              }
                              placeholder="963912345678"
                              className="input"
                              value={
                                phone
                              }
                              onChange={
                                handlePhoneChange
                              }
                            />

                            {phoneError ? (
                              <p className="mt-1.5 text-xs text-red-600">
                                {
                                  phoneError
                                }
                              </p>
                            ) : (
                              <p className="mt-1.5 text-xs text-slate-400">
                                {uiText(isArabic, 'text1037')}
                              </p>
                            )}
                          </div>


                          {!inviteToken && (
                            <>
                              <div>
                                <label
                                  className="label"
                                  htmlFor="branchId"
                                >
                                  {uiText(isArabic, 'text0800')}
                                </label>

                                <select
                                  id="branchId"
                                  required
                                  className="input"
                                  value={branchId}
                                  onChange={(event) =>
                                    setBranchId(event.target.value)
                                  }
                                >
                                  <option value="">
                                    {uiText(isArabic, 'text1116')}
                                  </option>

                                  {branches.map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                      {isArabic
                                        ? branch.valueAr || branch.codeAr
                                        : branch.valueEn || branch.codeEn}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label
                                  className="label"
                                  htmlFor="departmentId"
                                >
                                  {uiText(isArabic, 'text0866')}
                                </label>

                                <select
                                  id="departmentId"
                                  required
                                  className="input"
                                  value={departmentId}
                                  onChange={(event) =>
                                    setDepartmentId(event.target.value)
                                  }
                                >
                                  <option value="">
                                    {uiText(isArabic, 'text1117')}
                                  </option>

                                  {departments.map((department) => (
                                    <option
                                      key={department.id}
                                      value={department.id}
                                    >
                                      {isArabic
                                        ? department.valueAr || department.codeAr
                                        : department.valueEn || department.codeEn}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      )}


                      <div>
                        <label
                          className="label"
                          htmlFor="email"
                        >
                          {uiText(isArabic, 'text0064')}
                        </label>

                        <input
                          id="email"
                          type="email"
                          required
                          autoComplete="email"
                          autoFocus={
                            mode ===
                            'login'
                          }
                          className="input"
                          value={
                            email
                          }
                          onChange={(
                            event,
                          ) =>
                            setEmail(
                              event
                                .target
                                .value,
                            )
                          }
                        />
                      </div>


                      <div>
                        <div className="flex items-center justify-between">
                          <label
                            className="label"
                            htmlFor="password"
                          >
                            {uiText(isArabic, 'text0368')}
                          </label>


                          {mode ===
                            'login' && (
                            <Link
                              href="/forgot-password"
                              className="mb-1 text-xs font-medium text-brand-600 hover:underline"
                            >
                              {uiText(isArabic, 'text0369')}
                            </Link>
                          )}
                        </div>

                        <PasswordInput
                          id="password"
                          required
                          minLength={
                            8
                          }
                          autoComplete={
                            mode ===
                            'login'
                              ? 'current-password'
                              : 'new-password'
                          }
                          className="input"
                          value={
                            password
                          }
                          onChange={(
                            event,
                          ) =>
                            setPassword(
                              event
                                .target
                                .value,
                            )
                          }
                        />

                        {mode ===
                          'register' && (
                          <p className="mt-1.5 text-xs text-slate-400">
                            {uiText(isArabic, 'text0370')}
                          </p>
                        )}
                      </div>


                      {authError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {
                            authError
                          }
                        </div>
                      )}


                      <button
                        type="submit"
                        className="btn-primary min-h-[46px] w-full"
                        disabled={
                          submitting ||
                          (mode === 'register' &&
                            !!inviteToken &&
                            (!invitePreview || !!inviteError))
                        }
                      >
                        {submitting
                          ? mode ===
                            'login'
                            ? uiText(isArabic, 'text0065')
                            : uiText(isArabic, 'text0377')
                          : mode ===
                              'login'
                            ? uiText(isArabic, 'text0047')
                            : uiText(isArabic, 'text0378')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}


        {/*
         * ======================================================
         * FEATURES
         * ======================================================
         */}

        <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="text-xs font-semibold uppercase tracking-[.16em] text-brand-600">
                {uiText(isArabic, 'text0379')}
              </div>

              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                {uiText(isArabic, 'text0380')}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {uiText(isArabic, 'text0381')}
              </p>
            </div>


            <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {features.map(
                (
                  feature,
                ) => (
                  <article
                    key={
                      feature.title
                    }
                    className="group rounded-2xl border border-slate-200 bg-white p-4 transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
                      {
                        feature.icon
                      }
                    </div>

                    <h3 className="mt-3 text-sm font-semibold text-slate-900">
                      {
                        feature.title
                      }
                    </h3>

                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      {
                        feature.description
                      }
                    </p>
                  </article>
                ),
              )}
            </div>
          </div>
        </section>


        {/*
         * ======================================================
         * WORKFLOW
         * ======================================================
         */}

        <section className="bg-slate-50 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[.16em] text-brand-600">
                  {uiText(isArabic, 'text0382')}
                </div>

                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-3xl">
                  {uiText(isArabic, 'text0383')}
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                  {uiText(isArabic, 'text0384')}
                </p>


                <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white">
                      ✓
                    </div>

                    <div>
                      <div className="text-sm font-semibold text-brand-900">
                        {uiText(isArabic, 'text0066')}
                      </div>

                      <p className="mt-0.5 text-xs leading-5 text-brand-800/70">
                        {uiText(isArabic, 'text0385')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>


              <div className="grid gap-3 sm:grid-cols-2">
                {workflow.map(
                  (
                    item,
                    index,
                  ) => (
                    <div
                      key={
                        item.number
                      }
                      className={`rounded-2xl border bg-white p-4 ${
                        index ===
                        0
                          ? 'border-brand-200 shadow-sm'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wider text-brand-600">
                          {
                            item.number
                          }
                        </span>

                        <span
                          className={`h-2 w-2 rounded-full ${
                            index ===
                            0
                              ? 'bg-brand-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      </div>

                      <h3 className="mt-3 text-sm font-semibold text-slate-900">
                        {
                          item.title
                        }
                      </h3>

                      <p className="mt-1.5 text-xs leading-5 text-slate-500">
                        {
                          item.description
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </section>


        {/*
         * ======================================================
         * CTA
         * ======================================================
         */}

        <section className="bg-white py-12">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] bg-brand-600 px-6 py-8 text-white sm:px-8 lg:px-10 lg:py-10">
              <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" />
              <div className="absolute -bottom-48 right-32 h-96 w-96 rounded-full border border-white/10" />


              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
                    {uiText(isArabic, 'text0386')}
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                    {uiText(isArabic, 'text0387')}
                  </p>
                </div>


                <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() =>
                      handleModeChange(
                        'register',
                      )
                    }
                    className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                  >
                    {uiText(isArabic, 'text0367')}
                  </button>


                  <button
                    type="button"
                    onClick={() =>
                      handleModeChange(
                        'login',
                      )
                    }
                    className="rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                  >
                    {uiText(isArabic, 'text0047')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>


      {/*
       * ======================================================
       * FOOTER
       * ======================================================
       */}

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveBrandingAssetUrl(branding.logoUrl) ?? undefined}
                  alt={branding.siteName || uiText(isArabic, 'text0985')}
                  className="h-full w-full object-contain p-1"
                />
              </div>
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    d="M7 12.5 10 15.5 17 8.5"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="4"
                    strokeWidth="1.8"
                  />
                </svg>
              </div>
            )}

            <div>
              <div className="text-sm font-semibold text-slate-800">
                {branding?.siteName || uiText(isArabic, 'text0985')}
              </div>

              <div className="text-xs text-slate-400">
                {uiText(isArabic, 'text0388')}
              </div>
            </div>
          </div>


          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()}{' '}
            {branding?.siteName || uiText(isArabic, 'text0985')}
          </div>
        </div>
      </footer>
    </div>
  );
}
