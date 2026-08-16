import {
  mkdirSync,
} from 'fs';

import {
  extname,
  relative,
  resolve,
  sep,
} from 'path';

import {
  randomUUID,
} from 'crypto';


/*
 * ============================================================
 * STORAGE ROOT
 * ============================================================
 *
 * The backend is started with backend/ as its working directory in
 * development and production, so all uploaded files live under:
 *
 *   backend/storage/<category>/YYYY/MM
 *
 * Only avatars and branding are exposed as static assets. Attachments
 * continue to be served through the authenticated attachment endpoints.
 * ============================================================
 */
export const STORAGE_ROOT =
  resolve(
    process.cwd(),
    'storage',
  );


type StorageCategory =
  | 'avatars'
  | 'branding'
  | 'attachments';


function twoDigits(
  value:
    number,
): string {
  return String(
    value,
  ).padStart(
    2,
    '0',
  );
}


/*
 * Return (and create) the current YYYY/MM directory for a storage
 * category. Multer's diskStorage destination callback requires the
 * destination to exist before it writes the uploaded file.
 */
export function getStorageDirectory(
  category:
    StorageCategory,
  date:
    Date = new Date(),
): string {
  const directory =
    resolve(
      STORAGE_ROOT,
      category,
      String(
        date.getFullYear(),
      ),
      twoDigits(
        date.getMonth() +
          1,
      ),
    );


  mkdirSync(
    directory,
    {
      recursive:
        true,
    },
  );


  return directory;
}


/*
 * Generate an opaque collision-resistant filename while retaining the
 * original extension. The extension is already validated by the relevant
 * Multer configuration before the file is accepted.
 */
export function generateStoredFileName(
  originalName:
    string,
): string {
  const extension =
    extname(
      originalName,
    ).toLowerCase();


  return `${randomUUID()}${extension}`;
}


/*
 * Convert an absolute path under STORAGE_ROOT into the URL stored in the
 * database, e.g.
 *
 *   /storage/avatars/2026/08/file.jpg
 */
export function storedFileUrl(
  filePath:
    string,
): string {
  const absolutePath =
    resolve(
      filePath,
    );

  const relativePath =
    relative(
      STORAGE_ROOT,
      absolutePath,
    );


  if (
    relativePath ===
      '..' ||
    relativePath.startsWith(
      `..${sep}`,
    ) ||
    resolve(
      STORAGE_ROOT,
      relativePath,
    ) !==
      absolutePath
  ) {
    throw new Error(
      'File path is outside the configured storage directory',
    );
  }


  const urlPath =
    relativePath
      .split(
        sep,
      )
      .join(
        '/',
      );


  return `/storage/${urlPath}`;
}


/*
 * Resolve a database storage URL back to a local path. Invalid, external,
 * or traversal URLs return null so callers can safely ignore them.
 */
export function storagePathFromUrl(
  value?:
    string | null,
): string | null {
  if (
    !value
  ) {
    return null;
  }


  let pathname =
    value;


  try {
    if (
      /^https?:\/\//i.test(
        value,
      )
    ) {
      pathname =
        new URL(
          value,
        ).pathname;
    }
  } catch {
    return null;
  }


  if (
    !pathname.startsWith(
      '/storage/',
    )
  ) {
    return null;
  }


  let decodedPath:
    string;


  try {
    decodedPath =
      decodeURIComponent(
        pathname.slice(
          '/storage/'.length,
        ),
      );
  } catch {
    return null;
  }


  if (
    !decodedPath ||
    decodedPath.includes(
      '\0',
    )
  ) {
    return null;
  }


  const target =
    resolve(
      STORAGE_ROOT,
      decodedPath,
    );

  const relativePath =
    relative(
      STORAGE_ROOT,
      target,
    );


  if (
    relativePath ===
      '..' ||
    relativePath.startsWith(
      `..${sep}`,
    )
  ) {
    return null;
  }


  return target;
}
