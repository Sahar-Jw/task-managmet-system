import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

// NFR-SEC-06: MIME type and extension allow-listing; executables rejected.
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.txt', '.csv', '.zip',
]);

const ALLOWED_MIME_PREFIXES = ['image/', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument', 'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint', 'text/plain', 'text/csv', 'application/zip'];

export const multerConfig = (maxFileSizeMb: number) => ({
  storage: diskStorage({
    destination: './uploads',
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
      return cb(new BadRequestException('File type is not permitted'), false);
    }
    cb(null, true);
  },
});
