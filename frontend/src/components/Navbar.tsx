'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { NotificationsApi } from '@/lib/endpoints';
import Avatar from './Avatar';

const linkClass = (active: boolean) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    active ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

const POLL_INTERVAL_MS = 20000;

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    async function loadUnreadCount() {
      try {
        const count = await NotificationsApi.unreadCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        // ignore — badge just won't update this cycle
      }
    }

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // Re-poll immediately whenever the user navigates (e.g. leaving
    // /notifications after marking things read updates the badge sooner).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pathname]);

  if (!user) return null;

  const isAdmin = user.role.name === 'ADMIN';

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/tasks/mine', label: 'My Tasks' },
    { href: '/projects', label: 'Projects' },
    ...(isAdmin
      ? [
          { href: '/users', label: 'Users' },
          { href: '/settings', label: 'Settings' },
          { href: '/audit-logs', label: 'Audit Log' },
          { href: '/archive', label: 'Archive' },
        ]
      : []),
  ];

  // '/tasks/mine' is nested under '/tasks', so a plain startsWith() would
  // light up both tabs at once — carve it out of the parent "Tasks" match.
  const isLinkActive = (href: string) =>
    href === '/tasks' ? pathname === '/tasks' || (pathname.startsWith('/tasks/') && !pathname.startsWith('/tasks/mine')) : pathname.startsWith(href);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="mr-4 font-semibold text-brand-700">Task &amp; Project Manager</span>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(isLinkActive(link.href))}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications"
            aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
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
                  Profile settings
                </Link>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}