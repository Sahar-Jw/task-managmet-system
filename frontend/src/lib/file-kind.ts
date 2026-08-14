// Small helpers shared by AttachmentCard and AttachmentPreviewModal to
// classify a file by its MIME type / extension and format its size.

export type FileKind = 'image' | 'pdf' | 'docx' | 'excel' | 'other';

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const XLS_MIME = 'application/vnd.ms-excel';
const CSV_MIME = 'text/csv';

export function getFileKind(mimeType?: string, fileName?: string): FileKind {
  const mime = (mimeType || '').toLowerCase();
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime === DOCX_MIME || ext === 'docx') return 'docx';
  if (mime === XLSX_MIME || mime === XLS_MIME || mime === CSV_MIME || ['xlsx', 'xls', 'csv'].includes(ext)) {
    return 'excel';
  }
  return 'other';
}

// Short badge label shown on each card, e.g. "PDF", "DOCX", "IMAGE".
export function getFileTypeLabel(mimeType?: string, fileName?: string): string {
  const kind = getFileKind(mimeType, fileName);
  if (kind !== 'other') return kind === 'image' ? 'IMAGE' : kind.toUpperCase();
  const ext = (fileName || '').split('.').pop()?.toUpperCase();
  return ext || 'FILE';
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || Number.isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

// Comma-separated `accept` attribute for the file picker: any image, PDF,
// Word, or Excel document — mirrors what the backend's multer allow-list permits.
export const ATTACHMENT_ACCEPT =
  'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,' +
  'application/msword,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'application/vnd.ms-excel,' +
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,' +
  'application/vnd.ms-powerpoint,' +
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';
