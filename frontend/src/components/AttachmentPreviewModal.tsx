'use client';

import { useEffect, useRef, useState } from 'react';
import { downloadFile, fetchFileAsArrayBuffer, fetchFileAsBlob } from '@/lib/api';
import { getFileKind } from '@/lib/file-kind';
import type { TaskAttachment } from '@/lib/types';

// 'empty' = the file itself has no usable content (0 bytes, no sheet data,
// no visible text/images). 'unsupported' = we simply don't render a preview
// for this file type (e.g. .zip). Both offer a Download fallback, but the
// message shown to the user is different so "empty" isn't mistaken for a bug.
type LoadState = 'loading' | 'ready' | 'empty' | 'unsupported' | 'error';

export default function AttachmentPreviewModal({
  attachment,
  onClose,
}: {
  attachment: TaskAttachment;
  onClose: () => void;
}) {
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
    const path = `/attachments/${attachment.id}`;

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
            setEmptyMessage('This Excel file has no sheets.');
            setState('empty');
            return;
          }
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
          if (!rows.length) {
            setEmptyMessage('This Excel file is empty — the first sheet has no data.');
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
          setError(err instanceof Error ? err.message : 'Could not load preview');
          setState('error');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [attachment.id, kind]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="truncate text-sm font-semibold text-slate-800" title={attachment.fileName}>
            {attachment.fileName}
          </h3>
          <button className="icon-btn ml-3 shrink-0" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {state === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500" />
              <span className="text-sm">Loading preview…</span>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-red-200 bg-red-50 py-12 text-center">
              <p className="text-sm font-medium text-red-600">{error || 'Could not load preview'}</p>
              <button
                className="btn-primary"
                onClick={() => downloadFile(`/attachments/${attachment.id}`, attachment.fileName)}
              >
                Download {attachment.fileName}
              </button>
            </div>
          )}

          {state === 'empty' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-amber-200 bg-amber-50 py-12 text-center">
              <svg className="h-8 w-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p className="text-sm font-medium text-amber-800">{emptyMessage}</p>
              <p className="text-sm text-amber-700">There's nothing to preview.</p>
            </div>
          )}

          {state === 'unsupported' && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-slate-200 bg-slate-50 py-12 text-center">
              <p className="text-sm font-medium text-slate-700">No inline preview available</p>
              <p className="text-sm text-slate-500">Download the file to view it.</p>
              <button
                className="btn-primary"
                onClick={() => downloadFile(`/attachments/${attachment.id}`, attachment.fileName)}
              >
                Download {attachment.fileName}
              </button>
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
                  Showing first 100 of {excelRows.length} rows
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            className="btn-secondary"
            onClick={() => downloadFile(`/attachments/${attachment.id}`, attachment.fileName)}
          >
            Download
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

