'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from '@/components/Avatar';
import type { User } from '@/lib/types';

export default function AvatarSelect({
  users,
  value,
  onChange,
  placeholder,
  disabled = false,
  getLabelSuffix,
}: {
  users: User[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  getLabelSuffix?: (user: User) => string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selected = users.find((user) => user.id === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideButton = buttonRef.current && buttonRef.current.contains(target);
      const insidePanel = panelRef.current && panelRef.current.contains(target);
      if (!insideButton && !insidePanel) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return undefined;

    const updatePosition = () => {
      const rect = buttonRef.current!.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="input flex w-full items-center justify-between gap-3"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={selected.fullName} avatarUrl={selected.avatarUrl} size="sm" className="shrink-0" />
            <span className="truncate">
              {selected.fullName}
              {getLabelSuffix ? getLabelSuffix(selected) : ''}
            </span>
          </span>
        ) : (
          <span className="truncate text-slate-400">{placeholder}</span>
        )}
        <span className="shrink-0 text-slate-400">⌄</span>
      </button>

      {open && !disabled && mounted &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            className="fixed z-[200] max-h-64 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
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
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  onChange(user.id);
                  setOpen(false);
                }}
              >
                <Avatar name={user.fullName} avatarUrl={user.avatarUrl} size="sm" className="shrink-0" />
                <span className="min-w-0 truncate">
                  {user.fullName}
                  {getLabelSuffix ? getLabelSuffix(user) : ''}
                </span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}