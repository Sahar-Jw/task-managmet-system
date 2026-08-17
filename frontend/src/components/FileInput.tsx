'use client';

import { useRef } from 'react';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileInputProps {
  id?: string;
  accept?: string;
  /** The currently-selected file, or null if none. Fully controlled. */
  file: File | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}

/**
 * A styled drop-in replacement for `<input type="file" className="input" />`.
 * Renders as a dashed "Choose file" control matching `.btn-secondary` while
 * empty, and swaps to a filled chip with the file name, size, and a delete
 * icon once a file is selected — so the person can see and remove what
 * they've picked before it's actually submitted/uploaded anywhere.
 */
export default function FileInput({ id, accept, file, onSelect, disabled }: FileInputProps) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onSelect(e.target.files?.[0] ?? null);
  }

  function handleRemove() {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  if (file) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 shrink-0 text-slate-400"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <span className="truncate text-sm text-slate-700">{file.name}</span>
          <span className="shrink-0 text-xs text-slate-400">{formatBytes(file.size)}</span>
        </div>
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="icon-btn-danger h-7 w-7 shrink-0"
          aria-label={uiText(isArabic, 'text0894', { value0: file.name })}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 transition-colors ${
        disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-brand-400 hover:bg-brand-50'
      }`}
    >
      <span className="btn-secondary pointer-events-none shrink-0 !px-3 !py-1.5 text-xs">{uiText(isArabic, 'text0853')}</span>
      <span className="truncate">{uiText(isArabic, 'text0854')}</span>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
        disabled={disabled}
      />
    </label>
  );
}
