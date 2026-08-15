'use client';

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notifications-context';
import { resolveBrandingAssetUrl } from '@/lib/api';
import Avatar from './Avatar';
import { useBranding } from '@/lib/branding-context';

const linkClass = (active: boolean) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    active ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { branding } = useBranding();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations('nav');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) return null;

  const isAdmin = user.role.name === 'ADMIN';

  const links = [
    { href: '/dashboard', label: t('dashboard') },
    { href: '/tasks/mine', label: t('myTasks') },
    { href: '/projects', label: t('projects') },
    ...(isAdmin
      ? [
          { href: '/tasks', label: t('tasks') },
          { href: '/users', label: t('users') },
          { href: '/settings', label: t('settings') },
          { href: '/audit-logs', label: t('auditLog') },
        ]
      : []),
  ];

  // '/tasks/mine' is nested under '/tasks', so a plain startsWith() would
  // light up both tabs at once — carve it out of the parent "Tasks" match.
  const isLinkActive = (href: string) =>
    href === '/tasks' ? pathname === '/tasks' || (pathname.startsWith('/tasks/') && !pathname.startsWith('/tasks/mine')) : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="mr-4 flex items-center gap-2 font-semibold text-brand-700 hover:text-brand-600"
          >
            {branding?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveBrandingAssetUrl(branding.logoUrl) ?? undefined}
                alt=""
                className="h-6 w-6 rounded object-contain"
              />
            )}
            {branding?.siteName || 'Task & Project Manager'}
          </Link>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isLinkActive(link.href))}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const nextLocale = locale === 'en' ? 'ar' : 'en';
              document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
              window.location.reload();
            }}
            className="rounded-full border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            aria-label="Toggle language"
          >
            {locale === 'en' ? 'AR' : 'EN'}
          </button>

          <Link
            href="/notifications"
            aria-label={unreadCount > 0 ? `${t('notifications')} (${unreadCount} unread)` : t('notifications')}
            className={`relative rounded-full p-2 hover:bg-slate-100 ${
              pathname.startsWith('/notifications') ? 'bg-slate-100' : ''
            }`}
          >
            <svg
              className="h-5 w-5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 text-sm hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" />
              <span className="text-slate-700">{user.fullName}</span>
              <svg
                className={`h-4 w-4 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-800">{user.fullName}</p>
                  <p className="truncate text-xs text-slate-400">{user.email}</p>
                </div>
                <Link
                  href="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  {t('profile')}
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
                >
                  {t('logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}