'use client';

import { useState } from 'react';
import { resolveAvatarUrl } from '@/lib/api';

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-20 w-20 text-2xl',
} as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = resolveAvatarUrl(avatarUrl);
  const sizeClass = SIZE_CLASSES[size];

  if (url && !failed) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        className={`${sizeClass} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-brand-500 font-medium text-white ${className}`}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
