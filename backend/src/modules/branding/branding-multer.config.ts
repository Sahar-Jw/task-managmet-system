import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

// Logo/favicon are images only, plus .ico for favicons — stricter than the
// general task-attachment allow-list (see task-attachments/multer.config.ts),
// mirrors avatar-multer.config.ts.
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico']);
const ALLOWED_MIME_PREFIXES = ['image/'];
// Some browsers send .ico files under these instead of an "image/" prefix.
const ALLOWED_EXTRA_MIME_TYPES = new Set(['image/x-icon', 'image/vnd.microsoft.icon']);

export const brandingMulterConfig = (maxFileSizeMb: number) => ({
  storage: diskStorage({
    destination: './uploads/branding',
    filename: (_req, file, cb) => {
      const unique = randomUUID();
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = extname(file.originalname).toLowerCase();
    const mimeAllowed =
      ALLOWED_MIME_PREFIXES.some((prefix) => file.mimetype.startsWith(prefix)) ||
      ALLOWED_EXTRA_MIME_TYPES.has(file.mimetype);
    if (!ALLOWED_EXTENSIONS.has(ext) || !mimeAllowed) {
      return cb(
        new BadRequestException('File must be an image (png, jpg, jpeg, webp, gif, svg, ico)'),
        false,
      );
    }
    cb(null, true);
  },
});
