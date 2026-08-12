import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

// Avatars are images only — stricter than the general task-attachment
// allow-list (see task-attachments/multer.config.ts).
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);
const ALLOWED_MIME_PREFIXES = ['image/'];

export const avatarMulterConfig = (maxFileSizeMb: number) => ({
  storage: diskStorage({
    destination: './uploads/avatars',
    filename: (_req, file, cb) => {
      const unique = randomUUID();
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    const mimeAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix));
    if (!ALLOWED_EXTENSIONS.has(ext) || !mimeAllowed) {
      return cb(new BadRequestException('Avatar must be an image (png, jpg, jpeg, webp, gif)'), false);
    }
    cb(null, true);
  },
});
