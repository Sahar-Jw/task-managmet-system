import {
  BadRequestException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

import {
  memoryStorage,
} from 'multer';

import {
  extname,
} from 'path';


/*
 * ============================================================
 * TASK ATTACHMENT UPLOAD CONFIG
 * ============================================================
 *
 * IMPORTANT:
 *
 * Task attachments MUST use memoryStorage().
 *
 * Why?
 *
 * IMAGE
 * -----
 * Multer gives us file.buffer.
 *
 * TaskAttachmentsService writes that buffer to:
 *
 * backend/storage/attachments/YYYY/MM/
 *
 * and stores only the URL in MySQL.
 *
 *
 * DOCUMENT
 * --------
 * Multer gives us file.buffer.
 *
 * TaskAttachmentsService stores that buffer directly in:
 *
 * task_attachments.file_data
 *
 * as LONGBLOB.
 *
 *
 * DO NOT CHANGE THIS BACK TO diskStorage().
 *
 * diskStorage() does NOT populate file.buffer and would cause:
 *
 * "Uploaded file data is missing"
 * ============================================================
 */


/*
 * ============================================================
 * ALLOWED EXTENSIONS
 * ============================================================
 */

const ALLOWED_EXTENSIONS =
  new Set([
    /*
     * Images
     */
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',

    /*
     * PDF
     */
    '.pdf',

    /*
     * Word
     */
    '.doc',
    '.docx',

    /*
     * Excel
     */
    '.xls',
    '.xlsx',

    /*
     * PowerPoint
     */
    '.ppt',
    '.pptx',

    /*
     * Text
     */
    '.txt',
    '.csv',

    /*
     * Archive
     */
    '.zip',
  ]);


/*
 * ============================================================
 * DOCUMENT MIME TYPES
 * ============================================================
 */

const ALLOWED_DOCUMENT_MIME_TYPES =
  new Set([
    /*
     * PDF
     */
    'application/pdf',

    /*
     * Word
     */
    'application/msword',

    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

    /*
     * Excel
     */
    'application/vnd.ms-excel',

    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    /*
     * PowerPoint
     */
    'application/vnd.ms-powerpoint',

    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    /*
     * Text / CSV
     */
    'text/plain',
    'text/csv',

    /*
     * ZIP
     */
    'application/zip',
    'application/x-zip-compressed',

    /*
     * Some Windows/browser combinations can report ZIP this way.
     */
    'application/octet-stream',
  ]);


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

export const multerConfig =
  (
    maxFileSizeMb:
      number,
  ) => ({
    /*
     * CRITICAL:
     *
     * Keep the uploaded file in memory.
     *
     * This creates:
     *
     * file.buffer
     */
    storage:
      memoryStorage(),


    limits: {
      fileSize:
        maxFileSizeMb *
        1024 *
        1024,
    },


    fileFilter: (
      _req:
        any,

      file:
        Express.Multer.File,

      callback:
        (
          error:
            Error | null,

          acceptFile:
            boolean,
        ) => void,
    ) => {
      if (/[ÃÂØÙÐÑ]/.test(file.originalname)) {
        const decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8');

        if (!decodedName.includes('\uFFFD')) {
          file.originalname = decodedName;
        }
      }

      const extension =
        extname(
          file.originalname,
        )
          .toLowerCase();


      /*
       * Extension must always be allowed.
       */
      if (
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return callback(
          new BadRequestException(
            appError('FILE_TYPE_NOT_PERMITTED', 'File type is not permitted'),
          ),

          false,
        );
      }


      /*
       * Any normal image MIME is accepted.
       */
      const isImage =
        file.mimetype
          .toLowerCase()
          .startsWith(
            'image/',
          );


      /*
       * Non-images must match our document MIME allow-list.
       */
      const isAllowedDocument =
        ALLOWED_DOCUMENT_MIME_TYPES.has(
          file.mimetype
            .toLowerCase(),
        );


      if (
        !isImage &&
        !isAllowedDocument
      ) {
        return callback(
          new BadRequestException(
            appError('FILE_TYPE_NOT_PERMITTED', 'File type is not permitted'),
          ),

          false,
        );
      }


      callback(
        null,
        true,
      );
    },
  });
