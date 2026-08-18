'use client';

import { useEffect, useRef, useState } from 'react';

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
  destroy: () => Promise<void>;
};

export default function PdfCanvasPreview({
  data,
  isArabic,
}: {
  data: ArrayBuffer;
  isArabic: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const documentRef = useRef<PdfDocument | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => setContainerWidth(element.clientWidth);
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: any;
    let loadedDocument: PdfDocument | null = null;

    async function loadPdf() {
      setStatus('loading');
      setError('');

      try {
        const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
        /* Served by our same-origin Next route from the installed package. */
        pdfjs.GlobalWorkerOptions.workerSrc =
          '/pdf.worker.min.mjs?v=4.10.38';

        // PDF.js may transfer its input buffer to the worker, so give it a copy.
        const bytes = new Uint8Array(data.slice(0));
        loadingTask = pdfjs.getDocument({
          data: bytes,
          useSystemFonts: true,
        });
        loadedDocument = await loadingTask.promise;

        if (cancelled) {
          await loadedDocument.destroy();
          return;
        }


        const meaningfulOperators =
          new Set(
            [
              pdfjs.OPS.stroke,
              pdfjs.OPS.closeStroke,
              pdfjs.OPS.fill,
              pdfjs.OPS.eoFill,
              pdfjs.OPS.fillStroke,
              pdfjs.OPS.eoFillStroke,
              pdfjs.OPS.closeFillStroke,
              pdfjs.OPS.closeEOFillStroke,
              pdfjs.OPS.showText,
              pdfjs.OPS.showSpacedText,
              pdfjs.OPS.nextLineShowText,
              pdfjs.OPS.nextLineSetSpacingShowText,
              pdfjs.OPS.shadingFill,
              pdfjs.OPS.paintXObject,
              pdfjs.OPS.paintImageMaskXObject,
              pdfjs.OPS.paintImageMaskXObjectGroup,
              pdfjs.OPS.paintImageXObject,
              pdfjs.OPS.paintInlineImageXObject,
              pdfjs.OPS.paintInlineImageXObjectGroup,
              pdfjs.OPS.paintImageXObjectRepeat,
              pdfjs.OPS.paintImageMaskXObjectRepeat,
              pdfjs.OPS.paintSolidColorImageMask,
            ].filter(
              (
                value,
              ): value is number =>
                typeof value ===
                'number',
            ),
          );


        let hasMeaningfulContent =
          false;


        for (
          let pageIndex = 1;
          pageIndex <= loadedDocument.numPages &&
          !hasMeaningfulContent;
          pageIndex += 1
        ) {
          const page =
            await loadedDocument.getPage(
              pageIndex,
            );


          const textContent =
            await page.getTextContent();


          hasMeaningfulContent =
            textContent.items.some(
              (
                item:
                  any,
              ) =>
                typeof item?.str ===
                  'string' &&
                item.str.trim() !==
                  '',
            );


          if (
            !hasMeaningfulContent
          ) {
            const operatorList =
              await page.getOperatorList();


            hasMeaningfulContent =
              operatorList.fnArray.some(
                (
                  operator:
                    number,
                ) =>
                  meaningfulOperators.has(
                    operator,
                  ),
              );
          }


          page.cleanup?.();
        }


        if (
          !hasMeaningfulContent
        ) {
          setPageCount(
            loadedDocument.numPages,
          );
          setStatus(
            'empty',
          );

          return;
        }

        documentRef.current = loadedDocument;
        setPageCount(loadedDocument.numPages);
        setPageNumber(1);
        setStatus('ready');
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to open this PDF.');
          setStatus('error');
        }
      }
    }

    loadPdf();

    return () => {
      cancelled = true;
      documentRef.current = null;
      if (loadingTask) void loadingTask.destroy();
      if (loadedDocument) void loadedDocument.destroy();
    };
  }, [data]);

  useEffect(() => {
    const pdfDocument = documentRef.current;
    const canvas = canvasRef.current;
    if (!pdfDocument || !canvas || status !== 'ready' || containerWidth === 0) return;

    let cancelled = false;
    let renderTask: any;

    async function renderPage() {
      try {
        const page = await pdfDocument.getPage(pageNumber);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(240, containerWidth - 24);
        const scale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas is not supported by this browser.');

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        renderTask = page.render({
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
      } catch (renderError: any) {
        if (!cancelled && renderError?.name !== 'RenderingCancelledException') {
          setError(renderError instanceof Error ? renderError.message : 'Unable to display this PDF page.');
          setStatus('error');
        }
      }
    }

    renderPage();
    return () => {
      cancelled = true;
      if (renderTask) renderTask.cancel();
    };
  }, [containerWidth, pageNumber, status]);

  return (
    <div ref={containerRef} dir="ltr" className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-slate-100">
      {status === 'loading' && (
        <div className="flex min-h-48 flex-1 items-center justify-center text-sm text-slate-600">
          {isArabic ? 'جارٍ تحميل ملف PDF…' : 'Loading PDF…'}
        </div>
      )}

      {status === 'error' && (
        <div className="flex min-h-48 flex-1 items-center justify-center p-6 text-center text-sm font-medium text-red-600">
          {isArabic ? 'تعذّر عرض ملف PDF.' : 'Unable to display this PDF.'} {error}
        </div>
      )}

      {status === 'empty' && (
        <div className="flex min-h-48 flex-1 items-center justify-center p-6 text-center">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-3xl">
              ⚠️
            </div>
            <h3 className="mt-5 text-base font-semibold text-slate-800">
              {isArabic ? 'المرفق فارغ' : 'Empty attachment'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {isArabic
                ? 'لا يحتوي ملف PDF على محتوى قابل للعرض.'
                : 'This PDF contains no displayable content.'}
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="flex shrink-0 items-center justify-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
            <button
              type="button"
              className="btn-secondary min-w-10 px-3"
              disabled={pageNumber <= 1}
              aria-label={isArabic ? 'الصفحة السابقة' : 'Previous page'}
              onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
            >
              ‹
            </button>
            <span className="min-w-24 text-center text-sm font-medium text-slate-700" dir="ltr">
              {pageNumber} / {pageCount}
            </span>
            <button
              type="button"
              className="btn-secondary min-w-10 px-3"
              disabled={pageNumber >= pageCount}
              aria-label={isArabic ? 'الصفحة التالية' : 'Next page'}
              onClick={() => setPageNumber((page) => Math.min(pageCount, page + 1))}
            >
              ›
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            <canvas ref={canvasRef} className="mx-auto block bg-white shadow-sm" />
          </div>
        </>
      )}
    </div>
  );
}
