'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

const linkClass = (active: boolean) =>
  `px-3 py-2 rounded-md text-sm font-medium ${
    active ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const isAdmin = user.role.name === 'ADMIN';

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/projects', label: 'Projects' },
    { href: '/notifications', label: 'Notifications' },
    ...(isAdmin
      ? [
          { href: '/users', label: 'Users' },
          { href: '/settings', label: 'Settings' },
          { href: '/audit-logs', label: 'Audit Log' },
        ]
      : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="mr-4 font-semibold text-brand-700">Task &amp; Project Manager</span>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(pathname.startsWith(link.href))}>
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/profile" className="text-slate-600 hover:text-slate-900">
            {user.fullName} <span className="text-slate-400">({user.role.name})</span>
          </Link>
          <button onClick={logout} className="btn-secondary">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
