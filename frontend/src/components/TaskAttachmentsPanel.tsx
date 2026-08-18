'use client';

import { uiText } from '@/lib/ui-text';



import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import {
  useLocale,
} from 'next-intl';

import * as XLSX
  from 'xlsx';

import * as mammoth
  from 'mammoth';

import DOMPurify
  from 'dompurify';

import {
  AttachmentsApi,
  TasksApi,
} from '@/lib/endpoints';

import {
  ApiError,
  downloadFile,
  fetchFileAsBlob,
  fetchFileAsObjectUrl,
} from '@/lib/api';

import {
  ATTACHMENT_ACCEPT,
  formatFileSize,
  getFileKind,
  getFileTypeLabel,
} from '@/lib/file-kind';

import PdfCanvasPreview
  from '@/components/PdfCanvasPreview';

import type {
  Task,
  TaskAttachment,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

type PreviewMode =
  | 'image'
  | 'pdf'
  | 'text'
  | 'excel'
  | 'docx'
  | 'empty'
  | 'unsupported';


interface PreviewState {
  attachment:
    TaskAttachment;

  mode:
    PreviewMode;

  objectUrl?:
    string;

  pdfData?:
    ArrayBuffer;

  html?:
    string;

  text?:
    string;

  sheetNames?:
    string[];

  activeSheet?:
    string;

  workbookHtml?:
    Record<
      string,
      string
    >;
}


/*
 * ============================================================
 * TOGGLE
 * ============================================================
 */

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked:
    boolean;

  disabled?:
    boolean;

  onChange:
    (
      value:
        boolean,
    ) => void;

  label:
    string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={
        label
      }
      aria-checked={
        checked
      }
      disabled={
        disabled
      }
      onClick={() =>
        onChange(
          !checked,
        )
      }
      className={`
        relative
        inline-flex
        h-7
        w-12
        shrink-0
        items-center
        rounded-full
        transition-all
        duration-200
        focus:outline-none
        focus:ring-2
        focus:ring-brand-200
        focus:ring-offset-2
        disabled:cursor-not-allowed
        disabled:opacity-50
        ${
          checked
            ? 'bg-brand-600'
            : 'bg-slate-200'
        }
      `}
    >
      <span
        className={`
          absolute
          top-1
          h-5
          w-5
          rounded-full
          bg-white
          shadow-sm
          transition-all
          duration-200
          ${
            checked
              ? 'end-1'
              : 'start-1'
          }
        `}
      />
    </button>
  );
}


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function extensionOf(
  fileName:
    string,
) {
  const pieces =
    fileName
      .toLowerCase()
      .split(
        '.',
      );


  return pieces.length >
    1
    ? pieces[
        pieces.length -
        1
      ]
    : '';
}


function fileIcon(
  mimeType:
    string,

  fileName:
    string,
) {
  const kind =
    getFileKind(
      mimeType,
      fileName,
    );


  switch (
    kind
  ) {
    case 'image':
      return '🖼️';

    case 'pdf':
      return '📕';

    case 'docx':
      return '📘';

    case 'excel':
      return '📊';

    default:
      break;
  }


  const extension =
    extensionOf(
      fileName,
    );


  if (
    extension ===
      'ppt' ||
    extension ===
      'pptx'
  ) {
    return '📙';
  }


  if (
    extension ===
    'zip'
  ) {
    return '🗜️';
  }


  if (
    extension ===
    'txt'
  ) {
    return '📄';
  }


  return '📎';
}


function getPreviewMode(
  attachment:
    TaskAttachment,
): PreviewMode {
  const mime =
    attachment.mimeType
      .toLowerCase();


  const extension =
    extensionOf(
      attachment.fileName,
    );


  if (
    mime.startsWith(
      'image/',
    )
  ) {
    return 'image';
  }


  if (
    mime ===
      'application/pdf' ||
    extension ===
      'pdf'
  ) {
    return 'pdf';
  }


  if (
    extension ===
      'xlsx' ||
    extension ===
      'xls' ||
    mime ===
      'application/vnd.ms-excel' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'excel';
  }


  if (
    extension ===
      'docx' ||
    mime ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }


  if (
    mime.startsWith(
      'text/',
    ) ||
    extension ===
      'txt' ||
    extension ===
      'csv'
  ) {
    return 'text';
  }


  return 'unsupported';
}


/*
 * ============================================================
 * MODAL PORTAL
 * ============================================================
 *
 * Rendering into document.body avoids the modal being clipped
 * or constrained by transformed / sticky / fixed ancestors in
 * the normal Task Details layout.
 * ============================================================
 */

function ModalPortal({
  children,
}: {
  children:
    React.ReactNode;
}) {
  const [
    mounted,
    setMounted,
  ] =
    useState(
      false,
    );


  useEffect(
    () => {
      setMounted(
        true,
      );


      return () => {
        setMounted(
          false,
        );
      };
    },
    [],
  );


  if (
    !mounted
  ) {
    return null;
  }


  return createPortal(
    children,
    document.body,
  );
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

export default function TaskAttachmentsPanel({
  task,
  user,
  onChanged,
}: {
  task:
    Task;

  user:
    User | null;

  onChanged:
    () =>
      Promise<void> |
      void;
}) {
  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  /*
   * ==========================================================
   * STATE
   * ==========================================================
   */

  const [
    selectedFiles,
    setSelectedFiles,
  ] =
    useState<File[]>(
      [],
    );


  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );


  const [
    previewBusyId,
    setPreviewBusyId,
  ] =
    useState<string | null>(
      null,
    );


  const [
    permissionBusy,
    setPermissionBusy,
  ] =
    useState(
      false,
    );


  const [
    deleteBusy,
    setDeleteBusy,
  ] =
    useState(
      false,
    );


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    notice,
    setNotice,
  ] =
    useState('');


  const [
    preview,
    setPreview,
  ] =
    useState<
      PreviewState | null
    >(
      null,
    );


  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      TaskAttachment | null
    >(
      null,
    );


  /* Upload/preview banners should not remain until a page reload. */
  useEffect(
    () => {
      if (
        !error
      ) {
        return;
      }


      const timer =
        window.setTimeout(
          () =>
            setError(''),
          5000,
        );


      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      error,
    ],
  );


  useEffect(
    () => {
      if (
        !notice
      ) {
        return;
      }


      const timer =
        window.setTimeout(
          () =>
            setNotice(''),
          5000,
        );


      return () =>
        window.clearTimeout(
          timer,
        );
    },
    [
      notice,
    ],
  );


  /*
   * ==========================================================
   * MODAL PAGE LOCK
   * ==========================================================
   */

  const modalOpen =
    Boolean(
      preview ||
      deleteTarget,
    );


  useEffect(
    () => {
      if (
        !modalOpen
      ) {
        return;
      }


      const previousOverflow =
        document.body.style.overflow;


      document.body.style.overflow =
        'hidden';


      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      modalOpen,
    ],
  );


  /*
   * ==========================================================
   * PERMISSIONS
   * ==========================================================
   */

  const isAdmin =
    user?.role.name ===
    'ADMIN';


  const isOwner =
    Boolean(
      user &&
      user.id ===
        task.createdById,
    );


  /*
   * Backend allows owner/admin upload.
   */
  const canUpload =
    Boolean(
      (
        isOwner ||
        isAdmin
      ) &&
      task.status !==
        'Archived',
    );


  /*
   * User requirement:
   *
   * only Task owner may delete.
   */
  const canDelete =
    Boolean(
      isOwner &&
      task.status !==
        'Archived',
    );


  /*
   * Only owner controls assignee download permission.
   */
  const canChangeDownloadPermission =
    Boolean(
      isOwner &&
      task.status !==
        'Archived',
    );


  /*
   * Owner/Admin:
   *
   * always download.
   *
   * Assignee:
   *
   * according to the Task toggle.
   */
  const canDownload =
    Boolean(
      isOwner ||
      isAdmin ||
      task.assigneeCanDownloadAttachments,
    );


  /*
   * ==========================================================
   * ATTACHMENTS
   * ==========================================================
   */

  const attachments =
    useMemo(
      () =>
        (
          task.attachments ??
          []
        )
          .filter(
            (
              attachment,
            ) =>
              !attachment.deletedAt,
          )
          .sort(
            (
              a,
              b,
            ) =>
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime(),
          ),

      [
        task.attachments,
      ],
    );


  /*
   * ==========================================================
   * PENDING FILES
   * ==========================================================
   */

  function addSelectedFiles(
    incoming:
      FileList |
      File[],
  ) {
    const incomingFiles =
      Array.from(
        incoming,
      );


    const emptyFiles =
      incomingFiles.filter(
        (
          file,
        ) =>
          file.size ===
          0,
      );


    if (
      emptyFiles.length >
      0
    ) {
      setError(
        isArabic
          ? `لا يمكن رفع ملف فارغ: ${emptyFiles.map((file) => file.name).join('، ')}`
          : `Empty files cannot be uploaded: ${emptyFiles.map((file) => file.name).join(', ')}`,
      );
    } else {
      setError('');
    }


    const nonEmptyFiles =
      incomingFiles.filter(
        (
          file,
        ) =>
          file.size >
          0,
      );


    setSelectedFiles(
      (
        current,
      ) => {
        const unique =
          nonEmptyFiles.filter(
            (
              file,
            ) =>
              !current.some(
                (
                  existing,
                ) =>
                  existing.name ===
                    file.name &&
                  existing.size ===
                    file.size &&
                  existing.lastModified ===
                    file.lastModified,
              ),
          );


        return [
          ...current,
          ...unique,
        ];
      },
    );
  }


  function removeSelectedFile(
    index:
      number,
  ) {
    setSelectedFiles(
      (
        current,
      ) =>
        current.filter(
          (
            _file,
            currentIndex,
          ) =>
            currentIndex !==
            index,
        ),
    );
  }


  /*
   * ==========================================================
   * UPLOAD
   * ==========================================================
   */

  async function upload() {
    if (
      selectedFiles.length ===
        0 ||
      busy
    ) {
      return;
    }


    if (
      selectedFiles.some(
        (
          file,
        ) =>
          file.size ===
          0,
      )
    ) {
      setError(
        isArabic
          ? 'لا يمكن رفع ملف فارغ.'
          : 'Empty files cannot be uploaded.',
      );

      return;
    }


    setBusy(
      true,
    );

    setError('');

    setNotice('');


    try {
      await AttachmentsApi.uploadToTask(
        task.id,
        selectedFiles,
      );


      setSelectedFiles(
        [],
      );


      setNotice(
        uiText(isArabic, 'text0246'),
      );


      await onChanged();
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : (
              uiText(isArabic, 'text0247')
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * DOWNLOAD PERMISSION
   * ==========================================================
   */

  async function updateDownloadPermission(
    value:
      boolean,
  ) {
    if (
      !canChangeDownloadPermission ||
      permissionBusy
    ) {
      return;
    }


    setPermissionBusy(
      true,
    );

    setError('');

    setNotice('');


    try {
      await TasksApi.updateAttachmentPermissions(
        task.id,
        value,
      );


      setNotice(
        value
          ? (
              uiText(isArabic, 'text0248')
            )
          : (
              uiText(isArabic, 'text0661')
            ),
      );


      await onChanged();
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : (
              uiText(isArabic, 'text0662')
            ),
      );
    } finally {
      setPermissionBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CLOSE PREVIEW
   * ==========================================================
   */

  function closePreview() {
    setPreview(
      (
        current,
      ) => {
        if (
          current?.objectUrl
        ) {
          URL.revokeObjectURL(
            current.objectUrl,
          );
        }


        return null;
      },
    );
  }


  /*
   * ==========================================================
   * IMAGE PREVIEW
   * ==========================================================
   */

  async function previewImage(
    attachment:
      TaskAttachment,
  ) {
    const objectUrl =
      await fetchFileAsObjectUrl(
        AttachmentsApi.previewPath(
          attachment.id,
        ),
      );


    setPreview({
      attachment,
      mode:
        'image',
      objectUrl,
    });
  }


  /*
   * ==========================================================
   * PDF PREVIEW
   * ==========================================================
   */

  async function previewPdf(
    attachment:
      TaskAttachment,
  ) {
    const blob =
      await fetchFileAsBlob(
        AttachmentsApi.previewPath(
          attachment.id,
        ),
      );


    const pdfData =
      await blob.arrayBuffer();


    setPreview({
      attachment,
      mode:
        'pdf',
      pdfData,
    });
  }


  /*
   * ==========================================================
   * TEXT PREVIEW
   * ==========================================================
   */

  async function previewText(
    attachment:
      TaskAttachment,
  ) {
    const blob =
      await fetchFileAsBlob(
        AttachmentsApi.previewPath(
          attachment.id,
        ),
      );


    const text =
      await blob.text();


    if (
      text.trim() ===
      ''
    ) {
      setPreview({
        attachment,
        mode:
          'empty',
      });

      return;
    }


    setPreview({
      attachment,
      mode:
        'text',
      text,
    });
  }


  /*
   * ==========================================================
   * EXCEL PREVIEW
   * ==========================================================
   *
   * Restores real spreadsheet preview.
   *
   * Reads XLS/XLSX bytes and generates an HTML table for each
   * worksheet.
   * ==========================================================
   */

  async function previewExcel(
    attachment:
      TaskAttachment,
  ) {
    const blob =
      await fetchFileAsBlob(
        AttachmentsApi.previewPath(
          attachment.id,
        ),
      );


    const bytes =
      new Uint8Array(
        await blob.arrayBuffer(),
      );


    const workbook =
      XLSX.read(
        bytes,
        {
          type:
            'array',

          cellFormula:
            true,

          cellDates:
            true,
        },
      );


    if (
      workbook.SheetNames.length ===
      0
    ) {
      throw new Error(
        isArabic
          ? 'لا يحتوي ملف Excel على أوراق قابلة للعرض.'
          : 'This Excel file has no worksheets to preview.',
      );
    }


    const nonEmptySheetNames =
      workbook.SheetNames.filter(
        (
          sheetName,
        ) => {
          const worksheet =
            workbook.Sheets[
              sheetName
            ];


          return Boolean(
            worksheet &&
            Object.keys(
              worksheet,
            ).some(
              (
                cellAddress,
              ) => {
                if (
                  cellAddress.startsWith(
                    '!',
                  )
                ) {
                  return false;
                }


                const cell =
                  worksheet[
                    cellAddress
                  ];


                return Boolean(
                  cell &&
                  (
                    cell.f ||
                    cell.v !== undefined &&
                    cell.v !== null &&
                    String(
                      cell.v,
                    ).trim() !== ''
                  )
                );
              },
            )
          );
        },
      );


    if (
      nonEmptySheetNames.length ===
      0
    ) {
      setPreview({
        attachment,
        mode:
          'empty',
      });

      return;
    }


    const workbookHtml:
      Record<
        string,
        string
      > =
      {};


    nonEmptySheetNames.forEach(
      (
        sheetName,
      ) => {
        const worksheet =
          workbook.Sheets[
            sheetName
          ];


        const rawHtml =
          XLSX.utils.sheet_to_html(
            worksheet,
            {
              id:
                `attachment-sheet-${sheetName.replace(
                  /[^a-zA-Z0-9_-]/g,
                  '-',
                )}`,
            },
          );


        workbookHtml[
          sheetName
        ] =
          DOMPurify.sanitize(
            rawHtml,
          );
      },
    );


    const firstSheet =
      nonEmptySheetNames[
        0
      ];


    setPreview({
      attachment,

      mode:
        'excel',

      sheetNames:
        nonEmptySheetNames,

      activeSheet:
        firstSheet,

      workbookHtml,
    });
  }


  /*
   * ==========================================================
   * DOCX PREVIEW
   * ==========================================================
   *
   * Restores Word DOCX preview using Mammoth.
   *
   * Old .DOC is not the DOCX ZIP/XML format and is not handled
   * by Mammoth here.
   * ==========================================================
   */

  async function previewDocx(
    attachment:
      TaskAttachment,
  ) {
    const blob =
      await fetchFileAsBlob(
        AttachmentsApi.previewPath(
          attachment.id,
        ),
      );


    const arrayBuffer =
      await blob.arrayBuffer();


    const result =
      await mammoth.convertToHtml(
        {
          arrayBuffer,
        },
        {
          convertImage:
            mammoth.images.dataUri,
        },
      );


    const safeHtml =
      DOMPurify.sanitize(
        result.value,
        {
          USE_PROFILES: {
            html:
              true,
          },
        },
      );


    const parsedDocument =
      new DOMParser()
        .parseFromString(
          safeHtml,
          'text/html',
        );


    const hasMeaningfulContent =
      Boolean(
        parsedDocument.body
          .textContent
          ?.trim() ||
        parsedDocument.querySelector(
          'img, table, svg, video, audio',
        )
      );


    if (
      !hasMeaningfulContent
    ) {
      setPreview({
        attachment,
        mode:
          'empty',
      });

      return;
    }


    setPreview({
      attachment,
      mode:
        'docx',
      html:
        safeHtml,
    });
  }


  /*
   * ==========================================================
   * OPEN PREVIEW
   * ==========================================================
   */

  async function previewAttachment(
    attachment:
      TaskAttachment,
  ) {
    if (
      previewBusyId
    ) {
      return;
    }


    setError('');

    closePreview();


    if (
      Number(
        attachment.fileSize,
      ) ===
      0
    ) {
      setPreview({
        attachment,
        mode:
          'empty',
      });

      return;
    }


    const mode =
      getPreviewMode(
        attachment,
      );


    /*
     * Unsupported formats still get a proper preview modal,
     * but without silently downloading.
     */
    if (
      mode ===
      'unsupported'
    ) {
      setPreview({
        attachment,
        mode:
          'unsupported',
      });


      return;
    }


    setPreviewBusyId(
      attachment.id,
    );


    try {
      switch (
        mode
      ) {
        case 'image':
          await previewImage(
            attachment,
          );

          break;


        case 'pdf':
          await previewPdf(
            attachment,
          );

          break;


        case 'text':
          await previewText(
            attachment,
          );

          break;


        case 'excel':
          await previewExcel(
            attachment,
          );

          break;


        case 'docx':
          await previewDocx(
            attachment,
          );

          break;


        default:
          setPreview({
            attachment,
            mode:
              'unsupported',
          });
      }
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : (
              uiText(isArabic, 'text0663')
            ),
      );
    } finally {
      setPreviewBusyId(
        null,
      );
    }
  }


  /*
   * ==========================================================
   * EXCEL SHEET CHANGE
   * ==========================================================
   */

  function changeExcelSheet(
    sheetName:
      string,
  ) {
    setPreview(
      (
        current,
      ) => {
        if (
          !current ||
          current.mode !==
            'excel'
        ) {
          return current;
        }


        return {
          ...current,

          activeSheet:
            sheetName,
        };
      },
    );
  }


  /*
   * ==========================================================
   * DOWNLOAD
   * ==========================================================
   */

  async function download(
    attachment:
      TaskAttachment,
  ) {
    if (
      !canDownload
    ) {
      return;
    }


    setBusy(
      true,
    );

    setError('');


    try {
      await downloadFile(
        AttachmentsApi.downloadPath(
          attachment.id,
        ),

        attachment.fileName,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : (
              uiText(isArabic, 'text0249')
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * DELETE MODAL
   * ==========================================================
   */

  function requestDelete(
    attachment:
      TaskAttachment,
  ) {
    if (
      !canDelete
    ) {
      return;
    }


    setDeleteTarget(
      attachment,
    );
  }


  function cancelDelete() {
    if (
      deleteBusy
    ) {
      return;
    }


    setDeleteTarget(
      null,
    );
  }


  async function confirmDelete() {
    if (
      !deleteTarget ||
      deleteBusy
    ) {
      return;
    }


    const attachment =
      deleteTarget;


    setDeleteBusy(
      true,
    );

    setError('');

    setNotice('');


    try {
      if (
        preview?.attachment.id ===
        attachment.id
      ) {
        closePreview();
      }


      await AttachmentsApi.remove(
        attachment.id,
      );


      setDeleteTarget(
        null,
      );


      setNotice(
        uiText(isArabic, 'text0250'),
      );


      await onChanged();
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : (
              uiText(isArabic, 'text0251')
            ),
      );
    } finally {
      setDeleteBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * EXCEL HTML
   * ==========================================================
   */

  const activeExcelHtml =
    preview?.mode ===
      'excel' &&
    preview.activeSheet &&
    preview.workbookHtml
      ? preview.workbookHtml[
          preview.activeSheet
        ] ||
        ''
      : '';


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <>
      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
        "
      >
        {/*
         * ====================================================
         * HEADER
         * ====================================================
         */}

        <div
          className="
            border-b
            border-slate-100
            bg-slate-50/60
            p-5
            sm:p-6
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div>
              <h2
                className="
                  text-base
                  font-semibold
                  text-slate-900
                "
              >
                {uiText(isArabic, 'text0178')}
              </h2>


              <p
                className="
                  mt-1
                  text-sm
                  text-slate-500
                "
              >
                {attachments.length ===
                0
                  ? (
                      uiText(isArabic, 'text0252')
                    )
                  : (
                      isArabic
                        ? `${attachments.length} مرفق`
                        : `${attachments.length} ${
                            attachments.length ===
                            1
                              ? 'attachment'
                              : 'attachments'
                          }`
                    )}
              </p>
            </div>


            {/*
             * ================================================
             * DOWNLOAD TOGGLE
             * ================================================
             */}

            {canChangeDownloadPermission && (
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-4
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-3
                "
              >
                <div>
                  <div
                    className="
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    {uiText(isArabic, 'text0253')}
                  </div>


                  <div
                    className="
                      mt-0.5
                      max-w-sm
                      text-xs
                      leading-5
                      text-slate-400
                    "
                  >
                    {uiText(isArabic, 'text0664')}
                  </div>
                </div>


                <ToggleSwitch
                  checked={
                    task.assigneeCanDownloadAttachments
                  }
                  disabled={
                    permissionBusy
                  }
                  label={
                    uiText(isArabic, 'text0254')
                  }
                  onChange={
                    updateDownloadPermission
                  }
                />
              </div>
            )}
          </div>
        </div>


        <div
          className="
            p-5
            sm:p-6
          "
        >
          {error && (
            <div
              className="
                mb-4
                rounded-xl
                border
                border-red-200
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-700
              "
            >
              {error}
            </div>
          )}


          {notice && (
            <div
              className="
                mb-4
                rounded-xl
                border
                border-emerald-200
                bg-emerald-50
                px-4
                py-3
                text-sm
                text-emerald-700
              "
            >
              {notice}
            </div>
          )}


          {/*
           * ==================================================
           * UPLOAD
           * ==================================================
           */}

          {canUpload && (
            <div
              className="
                mb-6
                rounded-xl
                border
                border-dashed
                border-slate-300
                bg-slate-50/60
                p-4
              "
            >
              <label
                className="
                  block
                  cursor-pointer
                "
              >
                <div
                  className="
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  {uiText(isArabic, 'text0255')}
                </div>


                <div
                  className="
                    mt-1
                    text-xs
                    leading-5
                    text-slate-400
                  "
                >
                  {uiText(isArabic, 'text0665')}
                </div>


                <input
                  type="file"
                  multiple
                  accept={
                    ATTACHMENT_ACCEPT
                  }
                  disabled={
                    busy
                  }
                  className="sr-only"
                  onChange={(
                    event,
                  ) => {
                    if (
                      event.target.files
                    ) {
                      addSelectedFiles(
                        event.target.files,
                      );
                    }


                    event.target.value =
                      '';
                  }}
                />


                <div
                  className={`
                    mt-3
                    flex
                    min-h-12
                    w-full
                    items-center
                    justify-between
                    gap-3
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-sm
                    ${
                      busy
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:border-brand-300'
                    }
                  `}
                >
                  <span className="truncate text-slate-500">
                    {selectedFiles.length === 0
                      ? uiText(isArabic, 'text0771')
                      : uiText(isArabic, 'text0772', {
                          value0: selectedFiles.length,
                        })}
                  </span>


                  <span
                    className="
                      shrink-0
                      rounded-lg
                      bg-brand-50
                      px-3
                      py-2
                      text-xs
                      font-semibold
                      text-brand-700
                    "
                  >
                    {uiText(isArabic, 'text0770')}
                  </span>
                </div>
              </label>


              {/*
               * ==============================================
               * PENDING FILE ROWS
               * ==============================================
               */}

              {selectedFiles.length >
                0 && (
                <div
                  className="
                    mt-4
                    overflow-hidden
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                  "
                >
                  {selectedFiles.map(
                    (
                      file,
                      index,
                    ) => (
                      <div
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="
                          flex
                          items-center
                          gap-3
                          border-b
                          border-slate-100
                          px-4
                          py-3
                          last:border-0
                        "
                      >
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            bg-slate-50
                            text-lg
                          "
                        >
                          {fileIcon(
                            file.type,
                            file.name,
                          )}
                        </div>


                        <span
                          className="
                            rounded-full
                            bg-slate-100
                            px-2.5
                            py-1
                            text-[10px]
                            font-semibold
                            text-slate-600
                          "
                        >
                          {getFileTypeLabel(
                            file.type,
                            file.name,
                          )}
                        </span>


                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <div
                            className="
                              truncate
                              text-sm
                              font-medium
                              text-slate-700
                            "
                          >
                            {file.name}
                          </div>


                          <div
                            className="
                              mt-0.5
                              text-xs
                              text-slate-400
                            "
                          >
                            {formatFileSize(
                              file.size,
                            )}
                          </div>
                        </div>


                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            removeSelectedFile(
                              index,
                            )
                          }
                          className="
                            rounded-lg
                            border
                            border-red-100
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-red-600
                            transition
                            hover:bg-red-50
                            disabled:opacity-50
                          "
                        >
                          {uiText(isArabic, 'text0256')}
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}


              <div
                className="
                  mt-4
                  flex
                  justify-end
                "
              >
                <button
                  type="button"
                  className="btn-primary"
                  disabled={
                    busy ||
                    selectedFiles.length ===
                      0
                  }
                  onClick={
                    upload
                  }
                >
                  {busy
                    ? (
                        uiText(isArabic, 'text0218')
                      )
                    : (
                        uiText(isArabic, 'text0753', { value0: selectedFiles.length })
                      )}
                </button>
              </div>
            </div>
          )}


          {/*
           * ==================================================
           * EXISTING FILES
           * ==================================================
           */}

          {attachments.length ===
          0 ? (
            <div
              className="
                rounded-xl
                border
                border-dashed
                border-slate-200
                bg-slate-50/40
                py-12
                text-center
              "
            >
              <div
                className="
                  text-2xl
                "
              >
                📎
              </div>


              <div
                className="
                  mt-3
                  text-sm
                  font-semibold
                  text-slate-700
                "
              >
                {uiText(isArabic, 'text0257')}
              </div>
            </div>
          ) : (
            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
              "
            >
              {attachments.map(
                (
                  attachment,
                ) => (
                  <div
                    key={
                      attachment.id
                    }
                    className="
                      flex
                      flex-col
                      gap-3
                      border-b
                      border-slate-100
                      bg-white
                      px-4
                      py-4
                      last:border-0
                      sm:flex-row
                      sm:items-center
                    "
                  >
                    <div
                      className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-lg
                        bg-slate-50
                        text-lg
                      "
                    >
                      {fileIcon(
                        attachment.mimeType,
                        attachment.fileName,
                      )}
                    </div>


                    <span
                      className="
                        w-fit
                        rounded-full
                        bg-slate-100
                        px-2.5
                        py-1
                        text-[10px]
                        font-semibold
                        text-slate-600
                      "
                    >
                      {getFileTypeLabel(
                        attachment.mimeType,
                        attachment.fileName,
                      )}
                    </span>


                    <div
                      className="
                        min-w-0
                        flex-1
                      "
                    >
                      <div
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {
                          attachment.fileName
                        }
                      </div>


                      <div
                        className="
                          mt-1
                          text-xs
                          text-slate-400
                        "
                      >
                        {formatFileSize(
                          Number(
                            attachment.fileSize,
                          ),
                        )}
                      </div>


                      {Number(
                        attachment.fileSize,
                      ) === 0 && (
                        <div className="mt-1 text-xs font-semibold text-amber-600">
                          {isArabic
                            ? 'هذا المرفق فارغ.'
                            : 'This attachment is empty.'}
                        </div>
                      )}
                    </div>


                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <button
                        type="button"
                        disabled={
                          busy ||
                          previewBusyId !==
                            null
                        }
                        onClick={() =>
                          previewAttachment(
                            attachment,
                          )
                        }
                        className="
                          rounded-lg
                          border
                          border-slate-200
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-slate-600
                          transition
                          hover:bg-slate-50
                          disabled:opacity-50
                        "
                      >
                        {previewBusyId ===
                        attachment.id
                          ? (
                              uiText(isArabic, 'text0258')
                            )
                          : (
                              uiText(isArabic, 'text0631')
                            )}
                      </button>


                      <button
                        type="button"
                        disabled={
                          busy ||
                          !canDownload
                        }
                        title={
                          !canDownload
                            ? (
                                uiText(isArabic, 'text0666')
                              )
                            : undefined
                        }
                        onClick={() =>
                          download(
                            attachment,
                          )
                        }
                        className="
                          rounded-lg
                          border
                          border-slate-200
                          bg-white
                          px-3
                          py-2
                          text-xs
                          font-semibold
                          text-slate-600
                          transition
                          hover:bg-slate-50
                          disabled:cursor-not-allowed
                          disabled:opacity-40
                        "
                      >
                        {uiText(isArabic, 'text0259')}
                      </button>


                      {canDelete && (
                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            requestDelete(
                              attachment,
                            )
                          }
                          className="
                            rounded-lg
                            border
                            border-red-200
                            bg-white
                            px-3
                            py-2
                            text-xs
                            font-semibold
                            text-red-600
                            transition
                            hover:bg-red-50
                          "
                        >
                          {uiText(isArabic, 'text0038')}
                        </button>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}


          {!canDownload &&
            attachments.length >
              0 && (
            <div
              className="
                mt-4
                rounded-xl
                border
                border-amber-200
                bg-amber-50
                px-4
                py-3
                text-xs
                leading-5
                text-amber-700
              "
            >
              {uiText(isArabic, 'text0667')}
            </div>
          )}
        </div>
      </section>


      {/*
       * ======================================================
       * PREVIEW MODAL
       * ======================================================
       *
       * PORTALLED TO BODY.
       *
       * This is what fixes the gray background not covering
       * Navbar / entire viewport.
       * ======================================================
       */}

      {preview && (
        <ModalPortal>
          <div
            className="
              fixed
              inset-0
              z-[99999]
              flex
              h-[100dvh]
              w-screen
              items-center
              justify-center
              overflow-hidden
              bg-slate-950/70
              p-4
              backdrop-blur-sm
            "
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closePreview();
              }
            }}
          >
            <div
              className="
                flex
                h-[min(88dvh,900px)]
                w-full
                max-w-6xl
                flex-col
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-2xl
              "
            >
              {/*
               * ===============================================
               * HEADER
               * ===============================================
               */}

              <div
                className="
                  flex
                  shrink-0
                  items-center
                  justify-between
                  gap-4
                  border-b
                  border-slate-200
                  bg-white
                  px-5
                  py-4
                "
              >
                <div
                  className="
                    min-w-0
                  "
                >
                  <div
                    className="
                      truncate
                      text-sm
                      font-semibold
                      text-slate-800
                    "
                  >
                    {
                      preview.attachment.fileName
                    }
                  </div>


                  <div
                    className="
                      mt-1
                      text-xs
                      text-slate-400
                    "
                  >
                    {getFileTypeLabel(
                      preview.attachment.mimeType,
                      preview.attachment.fileName,
                    )}

                    {' · '}

                    {formatFileSize(
                      Number(
                        preview.attachment.fileSize,
                      ),
                    )}
                  </div>
                </div>


                <div
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-2
                  "
                >
                  {canDownload && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() =>
                        download(
                          preview.attachment,
                        )
                      }
                    >
                      {uiText(isArabic, 'text0259')}
                    </button>
                  )}


                  <button
                    type="button"
                    aria-label={uiText(isArabic, 'text0841')}
                    onClick={
                      closePreview
                    }
                    className="
                      flex
                      h-10
                      w-10
                      items-center
                      justify-center
                      rounded-lg
                      text-xl
                      text-slate-400
                      transition
                      hover:bg-slate-100
                      hover:text-slate-700
                    "
                  >
                    ✕
                  </button>
                </div>
              </div>


              {/*
               * ===============================================
               * IMAGE
               * ===============================================
               */}

              {preview.mode ===
                'image' &&
                preview.objectUrl && (
                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    items-center
                    justify-center
                    overflow-auto
                    bg-slate-100
                    p-5
                  "
                >
                  <img
                    src={
                      preview.objectUrl
                    }
                    alt={
                      preview.attachment.fileName
                    }
                    className="
                      max-h-full
                      max-w-full
                      rounded-xl
                      object-contain
                      shadow-sm
                    "
                  />
                </div>
              )}


              {/*
               * ===============================================
               * PDF
               * ===============================================
               */}

              {preview.mode ===
                'pdf' &&
                preview.pdfData && (
                <PdfCanvasPreview
                  data={preview.pdfData}
                  isArabic={isArabic}
                />
              )}


              {/*
               * ===============================================
               * TEXT
               * ===============================================
               */}

              {preview.mode ===
                'text' && (
                <div
                  className="
                    min-h-0
                    flex-1
                    overflow-auto
                    bg-slate-50
                    p-6
                  "
                >
                  <pre
                    className="
                      whitespace-pre-wrap
                      break-words
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      p-5
                      font-mono
                      text-sm
                      leading-6
                      text-slate-700
                    "
                  >
                    {preview.text}
                  </pre>
                </div>
              )}


              {/*
               * ===============================================
               * EXCEL
               * ===============================================
               */}

              {preview.mode ===
                'excel' && (
                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    flex-col
                    bg-slate-50
                  "
                >
                  {/*
                   * SHEET TABS
                   */}

                  {preview.sheetNames &&
                    preview.sheetNames.length >
                      0 && (
                    <div
                      className="
                        flex
                        shrink-0
                        gap-2
                        overflow-x-auto
                        border-b
                        border-slate-200
                        bg-white
                        px-4
                        py-3
                      "
                    >
                      {preview.sheetNames.map(
                        (
                          sheetName,
                        ) => (
                          <button
                            key={
                              sheetName
                            }
                            type="button"
                            onClick={() =>
                              changeExcelSheet(
                                sheetName,
                              )
                            }
                            className={`
                              shrink-0
                              rounded-lg
                              px-3
                              py-2
                              text-xs
                              font-semibold
                              transition
                              ${
                                preview.activeSheet ===
                                sheetName
                                  ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                              }
                            `}
                          >
                            {
                              sheetName
                            }
                          </button>
                        ),
                      )}
                    </div>
                  )}


                  <div
                    className="
                      min-h-0
                      flex-1
                      overflow-auto
                      p-5
                    "
                  >
                    <div
                      className="
                        min-w-max
                        overflow-hidden
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        shadow-sm

                        [&_table]:border-collapse
                        [&_table]:text-sm

                        [&_td]:whitespace-nowrap
                        [&_td]:border
                        [&_td]:border-slate-200
                        [&_td]:px-3
                        [&_td]:py-2

                        [&_th]:whitespace-nowrap
                        [&_th]:border
                        [&_th]:border-slate-200
                        [&_th]:bg-slate-50
                        [&_th]:px-3
                        [&_th]:py-2
                        [&_th]:font-semibold
                        [&_th]:text-slate-700
                      "
                      dangerouslySetInnerHTML={{
                        __html:
                          activeExcelHtml,
                      }}
                    />
                  </div>
                </div>
              )}


              {/*
               * ===============================================
               * DOCX
               * ===============================================
               */}

              {preview.mode ===
                'docx' && (
                <div
                  className="
                    min-h-0
                    flex-1
                    overflow-auto
                    bg-slate-100
                    p-5
                    sm:p-8
                  "
                >
                  <article
                    className="
                      mx-auto
                      min-h-full
                      max-w-[850px]
                      rounded-xl
                      bg-white
                      p-8
                      shadow-sm

                      [&_h1]:mb-5
                      [&_h1]:mt-7
                      [&_h1]:text-2xl
                      [&_h1]:font-bold

                      [&_h2]:mb-4
                      [&_h2]:mt-6
                      [&_h2]:text-xl
                      [&_h2]:font-semibold

                      [&_h3]:mb-3
                      [&_h3]:mt-5
                      [&_h3]:text-lg
                      [&_h3]:font-semibold

                      [&_p]:my-3
                      [&_p]:leading-7
                      [&_p]:text-slate-700

                      [&_ul]:my-4
                      [&_ul]:list-disc
                      [&_ul]:ps-6

                      [&_ol]:my-4
                      [&_ol]:list-decimal
                      [&_ol]:ps-6

                      [&_li]:my-1

                      [&_table]:my-5
                      [&_table]:w-full
                      [&_table]:border-collapse

                      [&_td]:border
                      [&_td]:border-slate-200
                      [&_td]:p-2

                      [&_th]:border
                      [&_th]:border-slate-200
                      [&_th]:bg-slate-50
                      [&_th]:p-2

                      [&_img]:my-4
                      [&_img]:max-w-full
                    "
                    dangerouslySetInnerHTML={{
                      __html:
                        preview.html ||
                        '',
                    }}
                  />
                </div>
              )}


              {/*
               * ===============================================
               * EMPTY FILE
               * ===============================================
               */}

              {preview.mode ===
                'empty' && (
                <div className="flex min-h-0 flex-1 items-center justify-center bg-slate-50 p-8">
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
                      ⚠️
                    </div>
                    <h3 className="mt-5 text-base font-semibold text-slate-800">
                      {isArabic
                        ? 'المرفق فارغ'
                        : 'Empty attachment'}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {isArabic
                        ? 'لا يحتوي هذا الملف على أي بيانات لعرضها.'
                        : 'This file contains no data to preview.'}
                    </p>
                  </div>
                </div>
              )}


              {/*
               * ===============================================
               * UNSUPPORTED
               * ===============================================
               */}

              {preview.mode ===
                'unsupported' && (
                <div
                  className="
                    flex
                    min-h-0
                    flex-1
                    items-center
                    justify-center
                    bg-slate-50
                    p-8
                  "
                >
                  <div
                    className="
                      max-w-md
                      text-center
                    "
                  >
                    <div
                      className="
                        mx-auto
                        flex
                        h-16
                        w-16
                        items-center
                        justify-center
                        rounded-2xl
                        bg-white
                        text-3xl
                        shadow-sm
                      "
                    >
                      {fileIcon(
                        preview.attachment.mimeType,
                        preview.attachment.fileName,
                      )}
                    </div>


                    <h3
                      className="
                        mt-5
                        break-all
                        text-base
                        font-semibold
                        text-slate-800
                      "
                    >
                      {
                        preview.attachment.fileName
                      }
                    </h3>


                    <p
                      className="
                        mt-2
                        text-sm
                        leading-6
                        text-slate-500
                      "
                    >
                      {uiText(isArabic, 'text0668')}
                    </p>


                    {canDownload && (
                      <button
                        type="button"
                        className="
                          btn-primary
                          mt-5
                        "
                        onClick={() =>
                          download(
                            preview.attachment,
                          )
                        }
                      >
                        {uiText(isArabic, 'text0260')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}


      {/*
       * ======================================================
       * DELETE CONFIRMATION MODAL
       * ======================================================
       *
       * Replaces window.confirm().
       * ======================================================
       */}

      {deleteTarget && (
        <ModalPortal>
          <div
            className="
              fixed
              inset-0
              z-[100000]
              flex
              h-[100dvh]
              w-screen
              items-center
              justify-center
              bg-slate-950/60
              p-4
              backdrop-blur-sm
            "
            onMouseDown={(
              event,
            ) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                cancelDelete();
              }
            }}
          >
            <div
              className="
                w-full
                max-w-md
                overflow-hidden
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-2xl
              "
            >
              <div
                className="
                  p-6
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-red-50
                    text-xl
                  "
                >
                  🗑️
                </div>


                <h2
                  className="
                    mt-4
                    text-lg
                    font-semibold
                    text-slate-900
                  "
                >
                  {uiText(isArabic, 'text0261')}
                </h2>


                <p
                  className="
                    mt-2
                    text-sm
                    leading-6
                    text-slate-500
                  "
                >
                  {uiText(isArabic, 'text0669')}
                </p>


                <div
                  className="
                    mt-4
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    p-3
                  "
                >
                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-white
                      text-lg
                    "
                  >
                    {fileIcon(
                      deleteTarget.mimeType,
                      deleteTarget.fileName,
                    )}
                  </div>


                  <div
                    className="
                      min-w-0
                    "
                  >
                    <div
                      className="
                        truncate
                        text-sm
                        font-semibold
                        text-slate-700
                      "
                    >
                      {
                        deleteTarget.fileName
                      }
                    </div>


                    <div
                      className="
                        mt-0.5
                        text-xs
                        text-slate-400
                      "
                    >
                      {getFileTypeLabel(
                        deleteTarget.mimeType,
                        deleteTarget.fileName,
                      )}

                      {' · '}

                      {formatFileSize(
                        Number(
                          deleteTarget.fileSize,
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>


              <div
                className="
                  flex
                  justify-end
                  gap-2
                  border-t
                  border-slate-100
                  bg-slate-50/70
                  p-4
                "
              >
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    deleteBusy
                  }
                  onClick={
                    cancelDelete
                  }
                >
                  {uiText(isArabic, 'text0080')}
                </button>


                <button
                  type="button"
                  disabled={
                    deleteBusy
                  }
                  onClick={
                    confirmDelete
                  }
                  className="
                    rounded-lg
                    bg-red-600
                    px-4
                    py-2.5
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-red-700
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  {deleteBusy
                    ? (
                        uiText(isArabic, 'text0083')
                      )
                    : (
                        uiText(isArabic, 'text0262')
                      )}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
