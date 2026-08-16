import {
  BadRequestException,
} from '@nestjs/common';

import {
  diskStorage,
} from 'multer';

import {
  extname,
} from 'path';

import {
  generateStoredFileName,
  getStorageDirectory,
} from '../../common/storage/storage.util';


const ALLOWED_EXTENSIONS =
  new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.gif',
    '.svg',
    '.ico',
  ]);


const ALLOWED_EXTRA_MIME_TYPES =
  new Set([
    'image/x-icon',
    'image/vnd.microsoft.icon',
  ]);


export const brandingMulterConfig =
  (
    maxFileSizeMb:
      number,
  ) => ({
    storage:
      diskStorage({
        /*
         * backend/storage/branding/YYYY/MM
         */
        destination: (
          _req,
          _file,
          callback,
        ) => {
          try {
            callback(
              null,
              getStorageDirectory(
                'branding',
              ),
            );
          } catch (
            error
          ) {
            callback(
              error as Error,
              '',
            );
          }
        },


        filename: (
          _req,
          file,
          callback,
        ) => {
          callback(
            null,
            generateStoredFileName(
              file.originalname,
            ),
          );
        },
      }),


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
        any,
    ) => {
      const extension =
        extname(
          file.originalname,
        )
          .toLowerCase();


      const mimeAllowed =
        file.mimetype.startsWith(
          'image/',
        ) ||
        ALLOWED_EXTRA_MIME_TYPES.has(
          file.mimetype,
        );


      if (
        !mimeAllowed ||
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return callback(
          new BadRequestException(
            'File must be an image (png, jpg, jpeg, webp, gif, svg, ico)',
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