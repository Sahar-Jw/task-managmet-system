'use client';


import {
  useState,
} from 'react';

import {
  useLocale,
} from 'next-intl';

import {
  AttachmentsApi,
} from '@/lib/endpoints';

import {
  ApiError,
  downloadFile,
  fetchFileAsObjectUrl,
} from '@/lib/api';

import type {
  Task,
  TaskAttachment,
  User,
} from '@/lib/types';


/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function fileSizeLabel(
  value:
    number,
) {
  const bytes =
    Number(
      value,
    );


  if (
    !Number.isFinite(
      bytes,
    ) ||
    bytes <=
      0
  ) {
    return '0 B';
  }


  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }


  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(
      1,
    )} KB`;
  }


  if (
    bytes <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      bytes /
      (
        1024 *
        1024
      )
    ).toFixed(
      1,
    )} MB`;
  }


  return `${(
    bytes /
    (
      1024 *
      1024 *
      1024
    )
  ).toFixed(
    1,
  )} GB`;
}


function extensionOf(
  name:
    string,
) {
  const pieces =
    name.split(
      '.',
    );


  if (
    pieces.length <
    2
  ) {
    return '';
  }


  return pieces[
    pieces.length -
    1
  ].toLowerCase();
}


function fileIcon(
  attachment:
    TaskAttachment,
) {
  const extension =
    extensionOf(
      attachment.fileName,
    );


  if (
    attachment.mimeType.startsWith(
      'image/',
    )
  ) {
    return '🖼️';
  }


  if (
    attachment.mimeType ===
      'application/pdf' ||
    extension ===
      'pdf'
  ) {
    return '📕';
  }


  if (
    [
      'doc',
      'docx',
    ].includes(
      extension,
    )
  ) {
    return '📘';
  }


  if (
    [
      'xls',
      'xlsx',
      'csv',
    ].includes(
      extension,
    )
  ) {
    return '📊';
  }


  if (
    [
      'ppt',
      'pptx',
    ].includes(
      extension,
    )
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


function canBrowserPreview(
  attachment:
    TaskAttachment,
) {
  return (
    attachment.mimeType.startsWith(
      'image/',
    ) ||
    attachment.mimeType ===
      'application/pdf' ||
    attachment.mimeType.startsWith(
      'text/',
    )
  );
}


/*
 * ============================================================
 * PROPS
 * ============================================================
 */

interface Props {
  task:
    Task;

  user:
    User | null;

  onChanged:
    () => Promise<void> | void;
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
}: Props) {
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
    useState<{
      attachment:
        TaskAttachment;

      url:
        string;
    } | null>(
      null,
    );


  /*
   * ==========================================================
   * ATTACHMENTS
   * ==========================================================
   */

  const attachments =
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
      );


  /*
   * ==========================================================
   * PERMISSIONS
   * ==========================================================
   */

  const isAdmin =
    user?.role.name ===
    'ADMIN';


  const isCreator =
    user?.id ===
    task.createdById;


  /*
   * Backend currently permits upload/delete to:
   *
   * Admin
   * Task creator
   */
  const canManage =
    Boolean(
      (
        isAdmin ||
        isCreator
      ) &&
      task.status !==
        'Archived',
    );


  /*
   * Admin + creator can always download.
   *
   * For assignees this uses the permission configured on Task.
   * Backend remains the final authority.
   */
  const canDownload =
    Boolean(
      isAdmin ||
      isCreator ||
      task.assigneeCanDownloadAttachments,
    );


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
        isArabic
          ? 'تم رفع المرفقات بنجاح.'
          : 'Attachments uploaded successfully.',
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
              isArabic
                ? 'تعذر رفع المرفقات.'
                : 'Could not upload attachments.'
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
   * PREVIEW
   * ==========================================================
   */

  async function previewAttachment(
    attachment:
      TaskAttachment,
  ) {
    if (
      !canBrowserPreview(
        attachment,
      )
    ) {
      return;
    }


    setBusy(
      true,
    );

    setError('');


    try {
      const url =
        await fetchFileAsObjectUrl(
          AttachmentsApi.previewPath(
            attachment.id,
          ),
        );


      /*
       * Release previous Blob URL before replacing it.
       */
      if (
        preview?.url
      ) {
        URL.revokeObjectURL(
          preview.url,
        );
      }


      setPreview({
        attachment,
        url,
      });
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : (
              isArabic
                ? 'تعذر معاينة الملف.'
                : 'Could not preview this file.'
            ),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  function closePreview() {
    if (
      preview?.url
    ) {
      URL.revokeObjectURL(
        preview.url,
      );
    }


    setPreview(
      null,
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
              isArabic
                ? 'تعذر تنزيل الملف.'
                : 'Could not download this file.'
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
   * REMOVE
   * ==========================================================
   */

  async function remove(
    attachment:
      TaskAttachment,
  ) {
    if (
      busy
    ) {
      return;
    }


    const confirmed =
      window.confirm(
        isArabic
          ? `هل تريد حذف "${attachment.fileName}"؟`
          : `Delete "${attachment.fileName}"?`,
      );


    if (
      !confirmed
    ) {
      return;
    }


    setBusy(
      true,
    );

    setError('');

    setNotice('');


    try {
      /*
       * If currently previewing this attachment, close first.
       */
      if (
        preview?.attachment.id ===
        attachment.id
      ) {
        closePreview();
      }


      await AttachmentsApi.remove(
        attachment.id,
      );


      setNotice(
        isArabic
          ? 'تم حذف المرفق.'
          : 'Attachment deleted.',
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
              isArabic
                ? 'تعذر حذف المرفق.'
                : 'Could not delete this attachment.'
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
              sm:flex-row
              sm:items-center
              sm:justify-between
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
                {isArabic
                  ? 'المرفقات'
                  : 'Attachments'}
              </h2>

              <p
                className="
                  mt-1
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                {attachments.length ===
                0
                  ? (
                      isArabic
                        ? 'لا توجد مرفقات بعد.'
                        : 'No attachments yet.'
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


            
          </div>
        </div>


        <div
          className="
            p-5
            sm:p-6
          "
        >
          {/*
           * ==================================================
           * MESSAGES
           * ==================================================
           */}

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

          {canManage && (
            <div
              className="
                mb-5
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
                <span
                  className="
                    text-sm
                    font-semibold
                    text-slate-700
                  "
                >
                  {isArabic
                    ? 'إضافة مرفقات'
                    : 'Add attachments'}
                </span>

                <span
                  className="
                    mt-1
                    block
                    text-xs
                    leading-5
                    text-slate-400
                  "
                >
                  {isArabic
                    ? 'يمكن رفع الصور وPDF وWord وExcel وPowerPoint وTXT وCSV وZIP.'
                    : 'Images, PDF, Word, Excel, PowerPoint, TXT, CSV and ZIP are supported.'}
                </span>

                <input
                  type="file"
                  multiple
                  className="
                    mt-3
                    block
                    w-full
                    cursor-pointer
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-sm
                    text-slate-600
                    file:me-3
                    file:rounded-lg
                    file:border-0
                    file:bg-brand-50
                    file:px-3
                    file:py-2
                    file:text-xs
                    file:font-semibold
                    file:text-brand-700
                    hover:file:bg-brand-100
                  "
                  accept="
                    image/*,
                    application/pdf,
                    .doc,
                    .docx,
                    .xls,
                    .xlsx,
                    .ppt,
                    .pptx,
                    .txt,
                    .csv,
                    .zip
                  "
                  disabled={
                    busy
                  }
                  onChange={(
                    event,
                  ) => {
                    setSelectedFiles(
                      Array.from(
                        event.target.files ??
                        [],
                      ),
                    );
                  }}
                />
              </label>


              {selectedFiles.length >
                0 && (
                <div
                  className="
                    mt-3
                    rounded-lg
                    bg-white
                    px-3
                    py-2
                    text-xs
                    text-slate-500
                  "
                >
                  <strong>
                    {selectedFiles.length}
                  </strong>{' '}

                  {isArabic
                    ? 'ملف محدد'
                    : (
                        selectedFiles.length ===
                        1
                          ? 'file selected'
                          : 'files selected'
                      )}
                </div>
              )}


              <div
                className="
                  mt-3
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
                        isArabic
                          ? 'جاري الرفع…'
                          : 'Uploading…'
                      )
                    : (
                        isArabic
                          ? 'رفع الملفات'
                          : 'Upload files'
                      )}
                </button>
              </div>
            </div>
          )}


          {/*
           * ==================================================
           * LIST
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
                px-5
                py-10
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-100
                  text-xl
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
                {isArabic
                  ? 'لا توجد مرفقات'
                  : 'No attachments'}
              </div>

              <p
                className="
                  mt-1
                  text-xs
                  text-slate-400
                "
              >
                {canManage
                  ? (
                      isArabic
                        ? 'استخدم أداة الرفع أعلاه لإضافة الملفات.'
                        : 'Use the upload area above to add files.'
                    )
                  : (
                      isArabic
                        ? 'لم تتم إضافة ملفات لهذه المهمة.'
                        : 'No files have been added to this task.'
                    )}
              </p>
            </div>
          ) : (
            <div
              className="
                space-y-3
              "
            >
              {attachments.map(
                (
                  attachment,
                ) => {
                  const previewable =
                    canBrowserPreview(
                      attachment,
                    );


                  const image =
                    attachment.storageType ===
                      'IMAGE';


                  return (
                    <article
                      key={
                        attachment.id
                      }
                      className="
                        group
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        p-4
                        transition
                        hover:border-slate-300
                        hover:shadow-sm
                      "
                    >
                      <div
                        className="
                          flex
                          flex-col
                          gap-4
                          sm:flex-row
                          sm:items-center
                        "
                      >
                        {/*
                         * ICON
                         */}

                        <div
                          className="
                            flex
                            h-12
                            w-12
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-slate-50
                            text-xl
                          "
                        >
                          {fileIcon(
                            attachment,
                          )}
                        </div>


                        {/*
                         * INFO
                         */}

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
                            title={
                              attachment.fileName
                            }
                          >
                            {
                              attachment.fileName
                            }
                          </div>


                          <div
                            className="
                              mt-1
                              flex
                              flex-wrap
                              items-center
                              gap-2
                              text-xs
                              text-slate-400
                            "
                          >
                            <span>
                              {fileSizeLabel(
                                attachment.fileSize,
                              )}
                            </span>

                            <span>
                              •
                            </span>

                            <span>
                              {image
                                ? (
                                    isArabic
                                      ? 'صورة'
                                      : 'Image'
                                  )
                                : (
                                    isArabic
                                      ? 'مستند'
                                      : 'Document'
                                  )}
                            </span>

                            <span>
                              •
                            </span>

                            <span
                              className={`
                                rounded-full
                                px-2
                                py-0.5
                                text-[10px]
                                font-semibold
                                ${
                                  image
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'bg-violet-50 text-violet-600'
                                }
                              `}
                            >
                              {image
                                ? (
                                    isArabic
                                      ? 'التخزين'
                                      : 'STORAGE'
                                  )
                                : (
                                    isArabic
                                      ? 'قاعدة البيانات'
                                      : 'DATABASE'
                                  )}
                            </span>

                            <span>
                              {new Date(
                                attachment.createdAt,
                              ).toLocaleString(
                                locale,
                              )}
                            </span>
                          </div>
                        </div>


                        {/*
                         * ACTIONS
                         */}

                        <div
                          className="
                            flex
                            shrink-0
                            flex-wrap
                            gap-2
                          "
                        >
                          {previewable && (
                            <button
                              type="button"
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
                                hover:border-brand-200
                                hover:bg-brand-50
                                hover:text-brand-700
                              "
                              disabled={
                                busy
                              }
                              onClick={() =>
                                previewAttachment(
                                  attachment,
                                )
                              }
                            >
                              {isArabic
                                ? 'معاينة'
                                : 'Preview'}
                            </button>
                          )}


                          <button
                            type="button"
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
                              hover:border-brand-200
                              hover:bg-brand-50
                              hover:text-brand-700
                              disabled:cursor-not-allowed
                              disabled:opacity-40
                            "
                            disabled={
                              busy ||
                              !canDownload
                            }
                            title={
                              !canDownload
                                ? (
                                    isArabic
                                      ? 'قام منشئ المهمة بتعطيل تنزيل المرفقات للمكلف.'
                                      : 'The task creator disabled attachment downloads for assignees.'
                                  )
                                : undefined
                            }
                            onClick={() =>
                              download(
                                attachment,
                              )
                            }
                          >
                            {isArabic
                              ? 'تنزيل'
                              : 'Download'}
                          </button>


                          {canManage && (
                            <button
                              type="button"
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
                              disabled={
                                busy
                              }
                              onClick={() =>
                                remove(
                                  attachment,
                                )
                              }
                            >
                              {isArabic
                                ? 'حذف'
                                : 'Delete'}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          )}


          {/*
           * ==================================================
           * DOWNLOAD PERMISSION MESSAGE
           * ==================================================
           */}

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
              {isArabic
                ? 'يمكنك معاينة المرفقات، لكن منشئ المهمة عطّل تنزيل المرفقات للمكلفين.'
                : 'You may preview attachments, but the task creator has disabled downloads for assignees.'}
            </div>
          )}
        </div>
      </section>


      {/*
       * ======================================================
       * PREVIEW MODAL
       * ======================================================
       */}

      {preview && (
        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-slate-950/70
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(
            event,
          ) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              closePreview();
            }
          }}
        >
          <div
            className="
              flex
              max-h-[92vh]
              w-full
              max-w-5xl
              flex-col
              overflow-hidden
              rounded-2xl
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-4
                border-b
                border-slate-200
                px-4
                py-3
                sm:px-5
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
                    mt-0.5
                    text-xs
                    text-slate-400
                  "
                >
                  {fileSizeLabel(
                    preview.attachment.fileSize,
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
                    {isArabic
                      ? 'تنزيل'
                      : 'Download'}
                  </button>
                )}


                <button
                  type="button"
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    text-xl
                    text-slate-500
                    transition
                    hover:bg-slate-100
                    hover:text-slate-800
                  "
                  onClick={
                    closePreview
                  }
                  aria-label="Close preview"
                >
                  ×
                </button>
              </div>
            </div>


            <div
              className="
                flex
                min-h-[400px]
                flex-1
                items-center
                justify-center
                overflow-auto
                bg-slate-100
                p-3
              "
            >
              {preview.attachment.mimeType.startsWith(
                'image/',
              ) ? (
                <img
                  src={
                    preview.url
                  }
                  alt={
                    preview.attachment.fileName
                  }
                  className="
                    max-h-[75vh]
                    max-w-full
                    rounded-lg
                    object-contain
                    shadow-sm
                  "
                />
              ) : (
                <iframe
                  src={
                    preview.url
                  }
                  title={
                    preview.attachment.fileName
                  }
                  className="
                    h-[75vh]
                    w-full
                    rounded-lg
                    border-0
                    bg-white
                  "
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}