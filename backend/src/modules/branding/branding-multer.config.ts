import {
  BadRequestException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

import { memoryStorage } from 'multer';

import {
  extname,
} from 'path';



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
            appError('FILE_MUST_IMAGE_PNG_JPG_JPEG_WEBP_GIF_SVG_ICO', 'File must be an image (png, jpg, jpeg, webp, gif, svg, ico)'),
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