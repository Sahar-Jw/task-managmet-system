'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useLocale,
} from 'next-intl';
import { useDictionary } from '@/lib/dictionary-context';

import Link from 'next/link';

import {
  usePathname,
} from 'next/navigation';

import {
  useAuth,
} from '@/lib/auth-context';

import {
  useNotifications,
} from '@/lib/notifications-context';

import {
  resolveBrandingAssetUrl,
} from '@/lib/api';

import {
  useBranding,
} from '@/lib/branding-context';

import {
  useTheme,
} from '@/lib/theme-context';

import Avatar from './Avatar';


/*
 * ============================================================
 * ICONS
 * ============================================================
 */

function DashboardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}


function TaskIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="3"
        width="16"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="m8 9 1.5 1.5L12 8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M14 9h3M8 15h9"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}


function ProjectIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <path
        d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <circle
        cx="9"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M3.5 19c.5-3.3 2.3-5 5.5-5s5 1.7 5.5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M15 6.2a3 3 0 0 1 0 5.6M16 14c2.5.4 3.9 2 4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}


function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M19 13.5v-3l-2-.7a7 7 0 0 0-.7-1.7l.9-1.9-2.1-2.1-1.9.9a7 7 0 0 0-1.7-.7L10.5 2h-3l-.7 2a7 7 0 0 0-1.7.7l-1.9-.9L1.1 5.9l.9 1.9a7 7 0 0 0-.7 1.7L0 10.5v3l2 .7c.2.6.4 1.2.7 1.7l-.9 1.9 2.1 2.1 1.9-.9c.5.3 1.1.5 1.7.7l.7 2h3l.7-2c.6-.2 1.2-.4 1.7-.7l1.9.9 2.1-2.1-.9-1.9c.3-.5.5-1.1.7-1.7l1.6-.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform="translate(2)"
      />
    </svg>
  );
}


function AuditIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-[17px] w-[17px]"
      aria-hidden="true"
    >
      <path
        d="M5 4h14v16H5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <path
        d="M8 8h8M8 12h8M8 16h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}


function BellIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
      />
    </svg>
  );
}


function ChevronDown() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        d="m7 10 5 5 5-5"
      />
    </svg>
  );
}


function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="M4 7h16M4 12h16M4 17h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-5 w-5"
    >
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}


/*
 * ============================================================
 * NAVBAR
 * ============================================================
 */

export default function Navbar() {
  const {
    user,
    logout,
  } =
    useAuth();


  const {
    unreadCount,
  } =
    useNotifications();


  const {
    branding,
  } =
    useBranding();


  const {
    mode,
    toggleMode,
  } = useTheme();


  const pathname =
    usePathname();


  const locale =
    useLocale();


  const { text: dictionaryText } = useDictionary();

  const t = (key: string) => dictionaryText(`nav.${key}`);


  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(
      false,
    );


  const menuRef =
    useRef<HTMLDivElement>(
      null,
    );


  /*
   * ==========================================================
   * EVENTS
   * ==========================================================
   */

  useEffect(() => {
    function handleClickOutside(
      event:
        MouseEvent,
    ) {
      if (
        menuRef.current &&
        !menuRef.current.contains(
          event.target as Node,
        )
      ) {
        setMenuOpen(
          false,
        );
      }
    }


    function handleEscape(
      event:
        KeyboardEvent,
    ) {
      if (
        event.key ===
        'Escape'
      ) {
        setMenuOpen(
          false,
        );

      }
    }


    document.addEventListener(
      'mousedown',
      handleClickOutside,
    );

    document.addEventListener(
      'keydown',
      handleEscape,
    );


    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside,
      );

      document.removeEventListener(
        'keydown',
        handleEscape,
      );
    };
  }, []);


  /*
   * Close menus when navigating.
   */
  useEffect(() => {
    setMenuOpen(
      false,
    );

  }, [
    pathname,
  ]);


  if (!user) {
    return null;
  }


  const isAdmin =
    user.role.name ===
    'ADMIN';


  /*
   * ==========================================================
   * LINKS
   * ==========================================================
   */

  const links = [
    {
      href:
        '/dashboard',

      label:
        t(
          'dashboard',
        ),

      icon:
        <DashboardIcon />,
    },

    {
      href:
        '/tasks/mine',

      label:
        t(
          'myTasks',
        ),

      icon:
        <TaskIcon />,
    },

    {
      href:
        '/projects',

      label:
        t(
          'projects',
        ),

      icon:
        <ProjectIcon />,
    },

    ...(isAdmin
      ? [
          {
            href:
              '/tasks',

            label:
              t(
                'tasks',
              ),

            icon:
              <TaskIcon />,
          },

          {
            href:
              '/users',

            label:
              t(
                'users',
              ),

            icon:
              <UsersIcon />,
          },

          {
            href:
              '/settings',

            label:
              t(
                'settings',
              ),

            icon:
              <SettingsIcon />,
          },

          {
            href:
              '/audit-logs',

            label:
              t(
                'auditLog',
              ),

            icon:
              <AuditIcon />,
          },
        ]
      : []),
  ];


  /*
   * ==========================================================
   * ACTIVE LINK
   * ==========================================================
   */

  const isLinkActive =
    (
      href:
        string,
    ) => {
      if (
        href ===
        '/tasks'
      ) {
        return (
          pathname ===
            '/tasks' ||
          (
            pathname.startsWith(
              '/tasks/',
            ) &&
            !pathname.startsWith(
              '/tasks/mine',
            )
          )
        );
      }


      if (
        href ===
        '/tasks/mine'
      ) {
        return pathname.startsWith(
          '/tasks/mine',
        );
      }


      return pathname.startsWith(
        href,
      );
    };


  /*
   * ==========================================================
   * LANGUAGE
   * ==========================================================
   */

  function toggleLanguage() {
    const nextLocale =
      locale ===
      'en'
        ? 'ar'
        : 'en';


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
   * RENDER
   * ==========================================================
   */

  return (
   <header
  className="
    fixed
    inset-x-0
    top-0
    z-[100]
    w-full
    border-b
    border-slate-200/80
    bg-white/95
    shadow-[0_1px_3px_rgba(15,23,42,0.05)]
    backdrop-blur-xl
  "
>
      <div
        className="
          mx-auto
          flex
          h-[68px]
          max-w-[1500px]
          items-center
          gap-3
          px-4
          sm:px-6
        "
      >
        {/*
         * ====================================================
         * BRAND
         * ====================================================
         */}

        <Link
          href={user ? '/dashboard' : '/'}
          data-no-loading
          className="
            flex
            min-w-0
            shrink-0
            items-center
            gap-2.5
            transition
            hover:opacity-80
          "
        >
          {branding?.logoUrl ? (
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
              "
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  resolveBrandingAssetUrl(
                    branding.logoUrl,
                  ) ??
                  undefined
                }
                alt=""
                className="
                  h-full
                  w-full
                  object-contain
                  p-1
                "
              />
            </div>
          ) : (
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-brand-600
                text-sm
                font-bold
                text-white
                shadow-sm
              "
            >
              T
            </div>
          )}


          <div
            className="
              hidden
              min-w-0
              md:block
            "
          >
            <div
              className="
                whitespace-nowrap
                text-sm
                font-bold
                tracking-[-0.02em]
                text-slate-900
              "
            >
              {branding?.siteName ||
                'Task & Project Manager'}
            </div>
          </div>
        </Link>


        {/*
         * ====================================================
         * DESKTOP NAVIGATION
         * ====================================================
         */}

        <nav
          className="
            hidden
            min-w-0
            flex-1
            items-center
            gap-1
            xl:flex
          "
        >
          {links.map(
            (
              link,
            ) => {
              const active =
                isLinkActive(
                  link.href,
                );


              return (
                <Link
                  key={
                    link.href
                  }
                  href={
                    link.href
                  }
                  className={`
                    group
                    relative
                    flex
                    h-10
                    items-center
                    gap-2
                    whitespace-nowrap
                    rounded-xl
                    px-2.5
                    2xl:px-3
                    text-[13px]
                    font-semibold
                    transition-all
                    ${
                      active
                        ? `
                          bg-brand-50
                          text-brand-700
                        `
                        : `
                          text-slate-500
                          hover:bg-slate-100
                          hover:text-slate-900
                        `
                    }
                  `}
                >
                  <span
                    className={`
                      transition
                      ${
                        active
                          ? 'text-brand-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }
                    `}
                  >
                    {
                      link.icon
                    }
                  </span>


                  <span>
                    {
                      link.label
                    }
                  </span>


                  {active && (
                    <span
                      className="
                        absolute
                        -bottom-[15px]
                        left-1/2
                        h-[3px]
                        w-6
                        -translate-x-1/2
                        rounded-full
                        bg-brand-500
                      "
                    />
                  )}
                </Link>
              );
            },
          )}
        </nav>


        {/*
         * ====================================================
         * RIGHT SIDE
         * ====================================================
         */}

        <div
          className="
            ms-auto
            flex
            shrink-0
            items-center
            gap-1.5
          "
        >
          <button
            type="button"
            onClick={toggleMode}
            className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 xl:flex"
            aria-label={mode === 'dark' ? (locale === 'ar' ? 'تفعيل الوضع الفاتح' : 'Use light mode') : (locale === 'ar' ? 'تفعيل الوضع الداكن' : 'Use dark mode')}
          >
            <span aria-hidden="true">{mode === 'dark' ? '☀️' : '🌙'}</span>
            {mode === 'dark' ? (locale === 'ar' ? 'فاتح' : 'Light') : (locale === 'ar' ? 'داكن' : 'Dark')}
          </button>

          {/*
           * LANGUAGE
           */}

          <button
            type="button"
            onClick={
              toggleLanguage
            }
            className="
              flex
              h-9
              min-w-9
              items-center
              justify-center
              rounded-xl
              border
              border-slate-200
              bg-white
              px-2.5
              text-[11px]
              font-bold
              tracking-wide
              text-slate-600
              transition
              hover:border-brand-200
              hover:bg-brand-50
              hover:text-brand-700
            "
            aria-label={dictionaryText('generatedUi.text0849')}
          >
            {locale ===
            'en'
              ? 'AR'
              : 'EN'}
          </button>


          {/*
           * NOTIFICATIONS
           */}

          <Link
            href="/notifications"
            aria-label={
              unreadCount >
              0
                ? `${t(
                    'notifications',
                  )} (${unreadCount} unread)`
                : t(
                    'notifications',
                  )
            }
            className={`
              relative
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              transition
              ${
                pathname.startsWith(
                  '/notifications',
                )
                  ? `
                    bg-brand-50
                    text-brand-700
                  `
                  : `
                    text-slate-500
                    hover:bg-slate-100
                    hover:text-slate-800
                  `
              }
            `}
          >
            <BellIcon />


            {unreadCount >
              0 && (
              <span
                className="
                  absolute
                  -end-0.5
                  -top-0.5
                  flex
                  h-[18px]
                  min-w-[18px]
                  items-center
                  justify-center
                  rounded-full
                  border-2
                  border-white
                  bg-red-500
                  px-1
                  text-[9px]
                  font-bold
                  leading-none
                  text-white
                "
              >
                {unreadCount >
                99
                  ? '99+'
                  : unreadCount}
              </span>
            )}
          </Link>


          <div
            className="
              mx-1
              hidden
              h-6
              w-px
              bg-slate-200
              sm:block
            "
          />


          {/*
           * PROFILE
           */}

          <div
            className="relative"
            ref={
              menuRef
            }
          >
            <button
              type="button"
              onClick={() =>
                setMenuOpen(
                  (
                    open,
                  ) =>
                    !open,
                )
              }
              className={`
                flex
                h-11
                items-center
                gap-2
                rounded-xl
                border
                px-1.5
                pe-2.5
                transition
                ${
                  menuOpen
                    ? `
                      border-brand-200
                      bg-brand-50
                    `
                    : `
                      border-transparent
                      hover:border-slate-200
                      hover:bg-slate-50
                    `
                }
              `}
              aria-haspopup="menu"
              aria-expanded={
                menuOpen
              }
            >
              <Avatar
                name={
                  user.fullName
                }
                avatarUrl={
                  user.avatarUrl
                }
                size="sm"
              />


              <div
                className="
                  hidden
                  max-w-[130px]
                  text-start
                  2xl:block
                "
              >
                <div
                  className="
                    truncate
                    text-xs
                    font-semibold
                    text-slate-800
                  "
                >
                  {
                    user.fullName
                  }
                </div>

                <div
                  className="
                    mt-0.5
                    truncate
                    text-[10px]
                    font-medium
                    text-slate-400
                  "
                >
                  {
                    user.role.name
                  }
                </div>
              </div>


              <span
                className={`
                  hidden
                  text-slate-400
                  transition-transform
                  sm:block
                  ${
                    menuOpen
                      ? 'rotate-180'
                      : ''
                  }
                `}
              >
                <ChevronDown />
              </span>
            </button>


            {/*
             * PROFILE DROPDOWN
             */}

            {menuOpen && (
              <div
                role="menu"
                className={`
                  absolute
                  top-[calc(100%+10px)]
                  z-50
                  w-[min(16rem,calc(100vw-1.5rem))]
                  max-h-[calc(100dvh-5.5rem)]
                  overflow-y-auto
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  p-1.5
                  shadow-[0_18px_50px_rgba(15,23,42,0.14)]
                  ${
                    locale ===
                    'ar'
                      ? 'left-0'
                      : 'right-0'
                  }
                `}
              >
                <div
                  className="
                    rounded-xl
                    bg-slate-50
                    px-3
                    py-3
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >
                    <Avatar
                      name={
                        user.fullName
                      }
                      avatarUrl={
                        user.avatarUrl
                      }
                      size="sm"
                    />


                    <div className="min-w-0">
                      <p
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-900
                        "
                      >
                        {
                          user.fullName
                        }
                      </p>

                      <p
                        className="
                          mt-0.5
                          truncate
                          text-xs
                          text-slate-400
                        "
                      >
                        {
                          user.email
                        }
                      </p>
                    </div>
                  </div>
                </div>


                <div className="mt-1">
                  <div className="mb-1 border-b border-slate-100 pb-1 xl:hidden">
                    {links.map((link) => {
                      const active = isLinkActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>
                            {link.icon}
                          </span>
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>

                  <Link
                    href="/profile"
                    role="menuitem"
                    onClick={() =>
                      setMenuOpen(
                        false,
                      )
                    }
                    className="
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
                      text-sm
                      font-medium
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      hover:text-slate-900
                    "
                  >
                    <span
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        bg-slate-100
                        text-slate-500
                      "
                    >
                      <UsersIcon />
                    </span>

                    {
                      t(
                        'profile',
                      )
                    }
                  </Link>


                  <button
                    type="button"
                    role="menuitem"
                    onClick={toggleMode}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                      {mode === 'dark' ? '☀️' : '🌙'}
                    </span>
                    {mode === 'dark'
                      ? (locale === 'ar' ? 'الوضع الفاتح' : 'Light mode')
                      : (locale === 'ar' ? 'الوضع الداكن' : 'Dark mode')}
                  </button>


                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(
                        false,
                      );

                      logout();
                    }}
                    className="
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      px-3
                      py-2.5
                      text-start
                      text-sm
                      font-medium
                      text-red-600
                      transition
                      hover:bg-red-50
                    "
                  >
                    <span
                      className="
                        flex
                        h-8
                        w-8
                        items-center
                        justify-center
                        rounded-lg
                        bg-red-50
                      "
                    >
                      ↗
                    </span>

                    {
                      t(
                        'logout',
                      )
                    }
                  </button>
                </div>
              </div>
            )}
          </div>


        </div>
      </div>
    </header>
  );
}
