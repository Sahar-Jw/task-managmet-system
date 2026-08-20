'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import type { User } from '@/lib/types';

export default function AvatarSelect({
  users,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  users: User[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = users.find((user) => user.id === value);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="input flex w-full items-center justify-between gap-3 text-left"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={selected.fullName} avatarUrl={selected.avatarUrl} size="sm" className="shrink-0" />
            <span className="truncate">{selected.fullName}</span>
          </span>
        ) : (
          <span className="truncate text-slate-400">{placeholder}</span>
        )}
        <span className="shrink-0 text-slate-400">⌄</span>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="option"
            aria-selected={!value}
            className="flex w-full items-center rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            {placeholder}
          </button>

          {users.map((user) => (
            <button
              type="button"
              role="option"
              aria-selected={user.id === value}
              key={user.id}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                onChange(user.id);
                setOpen(false);
              }}
            >
              <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{user.fullName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
