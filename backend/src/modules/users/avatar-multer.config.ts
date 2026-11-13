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
  ]);


export const avatarMulterConfig =
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
            appError('AVATAR_MUST_IMAGE_PNG_JPG_JPEG_WEBP_GIF', 'Avatar must be an image (png, jpg, jpeg, webp, gif)'),
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