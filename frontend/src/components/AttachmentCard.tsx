'use client';

import { useEffect, useState } from 'react';
import { downloadFile, fetchFileAsObjectUrl } from '@/lib/api';
import { AttachmentsApi } from '@/lib/endpoints';
import { formatFileSize, getFileKind, getFileTypeLabel } from '@/lib/file-kind';
import type { TaskAttachment } from '@/lib/types';

const BADGE_COLORS: Record<string, string> = {
  image: 'bg-emerald-50 text-emerald-700',
  pdf: 'bg-red-50 text-red-700',
  docx: 'bg-blue-50 text-blue-700',
  excel: 'bg-green-50 text-green-700',
  other: 'bg-slate-100 text-slate-600',
};

// Generic document icon shown for non-image files (PDF/Word/Excel/other).
function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-slate-400">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.75h7.5L19.5 9.75v10.5a.75.75 0 0 1-.75.75h-12a.75.75 0 0 1-.75-.75V4.5a.75.75 0 0 1 .75-.75Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75V9h5.25" />
    </svg>
  );
}

export default function AttachmentCard({
  attachment,
  canDelete,
  canDownload,
  onPreview,
  onDelete,
}: {
  attachment: TaskAttachment;
  canDelete: boolean;
  canDownload: boolean;
  onPreview: () => void;
  onDelete: () => void;
}) {
  const kind = getFileKind(attachment.mimeType, attachment.fileName);
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);

  // Only images get a real thumbnail; other kinds show a generic file icon
  // to avoid parsing every PDF/docx/xlsx just to render the card grid.
  // Uses the preview path (not download) — thumbnailing is a form of
  // preview and must work even when download is disabled for this user.
  useEffect(() => {
    if (kind !== 'image') return;
    let cancelled = false;
    let createdUrl: string | null = null;

    fetchFileAsObjectUrl(AttachmentsApi.previewPath(attachment.id))
      .then((url) => {
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        createdUrl = url;
        setThumbUrl(url);
      })
      .catch(() => {
        // Thumbnail is a nice-to-have; silently fall back to the file icon.
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachment.id, kind]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className={`badge shrink-0 ${BADGE_COLORS[kind]}`}>
          {getFileTypeLabel(attachment.mimeType, attachment.fileName)}
        </span>
        {attachment.fileSize !== undefined && (
          <span className="shrink-0 text-xs text-slate-400">{formatFileSize(attachment.fileSize)}</span>
        )}
      </div>

      <button
        onClick={onPreview}
        className="flex h-32 w-full items-center justify-center overflow-hidden rounded-md border border-slate-100 bg-slate-50"
      >
        {kind === 'image' && thumbUrl ? (
          <img src={thumbUrl} alt={attachment.fileName} className="h-full w-full object-cover" />
        ) : (
          <FileIcon />
        )}
      </button>

      <p className="truncate text-sm font-medium text-slate-700" title={attachment.fileName}>
        {attachment.fileName}
      </p>

      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary flex-1 text-xs" onClick={onPreview}>
          Preview
        </button>
        {canDownload && (
          <button
            className="btn-secondary flex-1 text-xs"
            onClick={() => downloadFile(AttachmentsApi.downloadPath(attachment.id), attachment.fileName)}
          >
            Download
          </button>
        )}
        {canDelete && (
          <button className="btn-danger flex-1 text-xs" onClick={onDelete}>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
