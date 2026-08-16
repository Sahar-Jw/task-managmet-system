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
  ]);


export const avatarMulterConfig =
  (
    maxFileSizeMb:
      number,
  ) => ({
    storage:
      diskStorage({
        /*
         * backend/storage/avatars/YYYY/MM
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
                'avatars',
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


      const validMime =
        file.mimetype.startsWith(
          'image/',
        );


      if (
        !validMime ||
        !ALLOWED_EXTENSIONS.has(
          extension,
        )
      ) {
        return callback(
          new BadRequestException(
            'Avatar must be an image (png, jpg, jpeg, webp, gif)',
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