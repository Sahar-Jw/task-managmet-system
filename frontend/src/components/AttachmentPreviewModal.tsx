'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadFile, fetchFileAsArrayBuffer, fetchFileAsBlob } from '@/lib/api';
import { AttachmentsApi } from '@/lib/endpoints';
import { getFileKind } from '@/lib/file-kind';
import type { TaskAttachment } from '@/lib/types';
import { useLocale } from 'next-intl';
import { uiText } from '@/lib/ui-text';
import InlineLoader from '@/components/InlineLoader';

// 'empty' = the file itself has no usable content (0 bytes, no sheet data,
// no visible text/images). 'unsupported' = we simply don't render a preview
// for this file type (e.g. .zip). Both offer a Download fallback, but the
// message shown to the user is different so "empty" isn't mistaken for a bug.
type LoadState = 'loading' | 'ready' | 'empty' | 'unsupported' | 'error';

export default function AttachmentPreviewModal({
  attachment,
  canDownload,
  onClose,
}: {
  attachment: TaskAttachment;
  canDownload: boolean;
  onClose: () => void;
}) {
  const locale = useLocale();
  const isArabic = locale === 'ar';
  const kind = getFileKind(attachment.mimeType, attachment.fileName);
  const [state, setState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [emptyMessage, setEmptyMessage] = useState('This file is empty.');
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [excelRows, setExcelRows] = useState<Record<string, any>[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const docxContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    // Preview path — never gated by the download-permission toggle.
    const path = AttachmentsApi.previewPath(attachment.id);

    async function load() {
      setState('loading');
      setError('');

      try {
        if (kind === 'image' || kind === 'pdf') {
          const blob = await fetchFileAsBlob(path);
          if (cancelled) return;
          if (blob.size === 0) {
            setEmptyMessage(
              kind === 'image' ? 'This image file is empty (0 bytes).' : 'This PDF file is empty (0 bytes).',
            );
            setState('empty');
            return;
          }
          const url = URL.createObjectURL(blob);
          createdUrl = url;
          setObjectUrl(url);
          setState('ready');
          return;
        }

        if (kind === 'docx') {
          const buffer = await fetchFileAsArrayBuffer(path);
          if (cancelled) return;
          if (buffer.byteLength === 0) {
            setEmptyMessage('This Word document is empty (0 bytes).');
            setState('empty');
            return;
          }
          const { renderAsync } = await import('docx-preview');
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '';
            await renderAsync(buffer, docxContainerRef.current, undefined, {
              className: 'docx-preview',
              inWrapper: true,
              ignoreWidth: true,
              ignoreHeight: true,
              breakPages: false,
            });
            const hasText = (docxContainerRef.current.textContent || '').trim().length > 0;
            const hasImage = !!docxContainerRef.current.querySelector('img');
            if (!hasText && !hasImage) {
              setEmptyMessage('This Word document has no content.');
              if (!cancelled) setState('empty');
              return;
            }
          }
          if (!cancelled) setState('ready');
          return;
        }

        if (kind === 'excel') {
          const buffer = await fetchFileAsArrayBuffer(path);
          if (cancelled) return;
          if (buffer.byteLength === 0) {
            setEmptyMessage('This Excel file is empty (0 bytes).');
            setState('empty');
            return;
          }
          const XLSX = await import('xlsx');
          const workbook = XLSX.read(buffer, { type: 'array' });
          if (!workbook.SheetNames.length) {
            setEmptyMessage(uiText(isArabic, 'text0917'));
            setState('empty');
            return;
          }
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
          if (!rows.length) {
            setEmptyMessage(uiText(isArabic, 'text0918'));
            setState('empty');
            return;
          }
          const columns = new Set<string>();
          rows.forEach((row) => Object.keys(row).forEach((key) => columns.add(key)));
          setExcelColumns(Array.from(columns));
          setExcelRows(rows);
          setState('ready');
          return;
        }

        // No inline preview for this file type (e.g. .zip) — user can still download it.
        setState('unsupported');
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : uiText(isArabic, 'text0916'));
          setState('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachment.id, kind, isArabic]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[90dvh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3 sm:px-5">
          <h3 className="truncate text-sm font-semibold text-slate-800" title={attachment.fileName}>
            {attachment.fileName}
          </h3>
          <button className="icon-btn ml-3 shrink-0" onClick={onClose} aria-label={uiText(isArabic, 'text0842')}>
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-5">
          {state === 'loading' && (
            <InlineLoader className="min-h-48" />
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-red-200 bg-red-50 py-12 text-center">
              <p className="text-sm font-medium text-red-600">{error || uiText(isArabic, 'text0916')}</p>
              {canDownload && (
                <button
                  className="btn-primary"
                  onClick={() => downloadFile(AttachmentsApi.downloadPath(attachment.id), attachment.fileName)}
                >
                  {uiText(isArabic, 'text0848', { value0: attachment.fileName })}
                </button>
              )}
            </div>
          )}

          {state === 'empty' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-amber-200 bg-amber-50 py-12 text-center">
              <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm font-medium text-amber-800">{emptyMessage}</p>
              <p className="text-sm text-amber-700">{uiText(isArabic, 'text0844')}</p>
            </div>
          )}

          {state === 'unsupported' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-slate-200 bg-slate-50 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">{uiText(isArabic, 'text0845')}</p>
              <p className="text-sm text-slate-500">
                {canDownload ? uiText(isArabic, 'text0846') : uiText(isArabic, 'text0847')}
              </p>
              {canDownload && (
                <button
                  className="btn-primary"
                  onClick={() => downloadFile(AttachmentsApi.downloadPath(attachment.id), attachment.fileName)}
                >
                  {uiText(isArabic, 'text0848', { value0: attachment.fileName })}
                </button>
              )}
            </div>
          )}

          {state === 'ready' && kind === 'image' && objectUrl && (
            <img
              src={objectUrl}
              alt={attachment.fileName}
              className="mx-auto max-h-[65vh] w-auto rounded-md border border-slate-200 object-contain"
            />
          )}

          {kind === 'pdf' && objectUrl && state === 'ready' && (
            <iframe
              src={objectUrl}
              title={attachment.fileName}
              className="h-[65vh] w-full rounded-md border border-slate-200"
            />
          )}

          {kind === 'docx' && (
            <div
              ref={docxContainerRef}
              className="docx-preview-container overflow-auto rounded-md border border-slate-200 bg-white p-3"
              style={{ display: state === 'ready' ? 'block' : 'none' }}
            />
          )}

          {state === 'ready' && kind === 'excel' && excelRows.length > 0 && (
            <div className="overflow-auto rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    {excelColumns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left font-semibold text-slate-600">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {excelRows.slice(0, 100).map((row, idx) => (
                    <tr key={idx}>
                      {excelColumns.map((col) => (
                        <td key={col} className="px-3 py-2 text-slate-700">
                          {row[col] !== undefined ? String(row[col]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelRows.length > 100 && (
                <div className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  {uiText(isArabic, 'text0895', { value0: excelRows.length })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          {canDownload && (
            <button
              className="btn-secondary"
              onClick={() => downloadFile(AttachmentsApi.downloadPath(attachment.id), attachment.fileName)}
            >
              {uiText(isArabic, 'text0259')}
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            {uiText(isArabic, 'text0842')}
          </button>
        </div>
      </div>
    </div>
  );
}
