import {
  readFile,
} from 'node:fs/promises';

import path
  from 'node:path';


export const runtime =
  'nodejs';


let workerSource:
  Promise<string> |
  undefined;


/**
 * Serve the worker from the installed pdfjs-dist version. Keeping this on the
 * application origin avoids cross-origin/CSP failures on mobile and ensures
 * the worker version always matches the PDF.js code used by the frontend.
 */
export async function GET() {
  workerSource ??=
    readFile(
      path.join(
        process.cwd(),
        'node_modules',
        'pdfjs-dist',
        'legacy',
        'build',
        'pdf.worker.min.mjs',
      ),
      'utf8',
    );


  return new Response(
    await workerSource,
    {
      headers: {
        'Content-Type':
          'text/javascript; charset=utf-8',

        'Cache-Control':
          'public, max-age=31536000, immutable',

        'X-Content-Type-Options':
          'nosniff',
      },
    },
  );
}
