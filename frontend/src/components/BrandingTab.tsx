'use client';

import { uiText } from '@/lib/ui-text';


import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useLocale,
} from 'next-intl';

import {
  ApiError,
  resolveBrandingAssetUrl,
} from '@/lib/api';

import {
  BrandingApi,
} from '@/lib/endpoints';

import type {
  BrandingSettings,
} from '@/lib/types';

import FileInput from '@/components/FileInput';

import {
  useBranding,
} from '@/lib/branding-context';


/*
 * ============================================================
 * FORM
 * ============================================================
 */

const EMPTY_FORM = {
  siteName: '',

  metaTitle: '',

  metaDescription: '',

  metaKeywords: '',
};


/*
 * ============================================================
 * ASSET FIELD
 * ============================================================
 */

function AssetField({
  type,
  label,
  hint,
  currentUrl,
  siteName,
  onUpload,
  onRemove,
  accept,
  isArabic,
}: {
  type:
    | 'logo'
    | 'favicon';

  label: string;

  hint: string;

  currentUrl?: string;

  siteName: string;

  onUpload:
    (
      file: File,
    ) => Promise<void>;

  onRemove:
    () => Promise<void>;

  accept: string;

  isArabic: boolean;
}) {
  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null,
    );


  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState<string>('');


  const [
    busy,
    setBusy,
  ] =
    useState(
      false,
    );


  const [
    error,
    setError,
  ] =
    useState('');


  /*
   * ==========================================================
   * LOCAL PREVIEW
   * ==========================================================
   *
   * URL.createObjectURL lets us display the local File without
   * uploading anything to the backend.
   * ==========================================================
   */

  useEffect(() => {
    if (
      !file
    ) {
      setPreviewUrl('');

      return;
    }


    const objectUrl =
      URL.createObjectURL(
        file,
      );


    setPreviewUrl(
      objectUrl,
    );


    return () => {
      URL.revokeObjectURL(
        objectUrl,
      );
    };
  }, [
    file,
  ]);


  /*
   * Prefer selected local file.
   *
   * If nothing has been selected,
   * display currently saved backend image.
   */
  const displayedUrl =
    previewUrl ||
    resolveBrandingAssetUrl(
      currentUrl,
    ) ||
    '';


  /*
   * ==========================================================
   * UPLOAD
   * ==========================================================
   */

  async function handleUpload() {
    if (
      !file
    ) {
      return;
    }


    setBusy(
      true,
    );

    setError('');


    try {
      await onUpload(
        file,
      );


      /*
       * Once successfully uploaded,
       * clear the temporary file.
       *
       * currentUrl will now represent the new saved image.
       */
      setFile(
        null,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0213'),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * REMOVE SAVED ASSET
   * ==========================================================
   */

  async function handleRemove() {
    setBusy(
      true,
    );

    setError('');


    try {
      await onRemove();


      setFile(
        null,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0613'),
      );
    } finally {
      setBusy(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CANCEL LOCAL SELECTION
   * ==========================================================
   */

  function cancelSelection() {
    setFile(
      null,
    );

    setError('');
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {
                label
              }
            </h3>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              {
                hint
              }
            </p>
          </div>


          {file && (
            <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
              {uiText(isArabic, 'text0214')}
            </span>
          )}
        </div>
      </div>


      <div className="p-5">
        {/*
         * ====================================================
         * LOGO WEBSITE PREVIEW
         * ====================================================
         */}

        {type ===
        'logo' ? (
          <div>
            <div className="mb-2 text-xs font-medium text-slate-400">
              {uiText(isArabic, 'text0614')}
            </div>


            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex h-20 items-center justify-between bg-white px-5 shadow-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {displayedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          displayedUrl
                        }
                        alt={
                          label
                        }
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand-600 text-sm font-bold text-white">
                        {siteName
                          ?.charAt(
                            0,
                          )
                          .toUpperCase() ||
                          'T'}
                      </div>
                    )}
                  </div>


                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {siteName ||
                        'Task & Project Manager'}
                    </div>

                    <div className="text-[10px] text-slate-400">
                      {uiText(isArabic, 'text0215')}
                    </div>
                  </div>
                </div>


                <div className="hidden items-center gap-4 text-xs text-slate-400 sm:flex">
                  <span>
                    Dashboard
                  </span>

                  <span>
                    Tasks
                  </span>

                  <span className="rounded-lg bg-brand-600 px-3 py-1.5 text-white">
                    Action
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /*
           * ==================================================
           * FAVICON BROWSER PREVIEW
           * ==================================================
           */

          <div>
            <div className="mb-2 text-xs font-medium text-slate-400">
              {uiText(isArabic, 'text0615')}
            </div>


            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <div className="flex h-11 items-end px-3">
                <div className="flex h-9 min-w-[220px] max-w-[320px] items-center gap-2 rounded-t-lg bg-white px-3 shadow-sm">
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                    {displayedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          displayedUrl
                        }
                        alt={
                          label
                        }
                        className="h-4 w-4 object-contain"
                      />
                    ) : (
                      <div className="h-4 w-4 rounded-sm bg-brand-600" />
                    )}
                  </div>


                  <div className="min-w-0 flex-1 truncate text-xs text-slate-600">
                    {siteName ||
                      'Task & Project Manager'}
                  </div>


                  <span className="text-xs text-slate-400">
                    ×
                  </span>
                </div>
              </div>


              <div className="h-8 bg-white" />
            </div>
          </div>
        )}


        {/*
         * ====================================================
         * CURRENT / SELECTED IMAGE
         * ====================================================
         */}

        <div className="mt-5 grid gap-4 md:grid-cols-[120px_1fr]">
          <div>
            <div className="mb-2 text-xs font-medium text-slate-400">
              {file
                ? uiText(isArabic, 'text0216')
                : uiText(isArabic, 'text0616')}
            </div>


            <div
              className={`flex items-center justify-center overflow-hidden border border-slate-200 bg-slate-50 ${
                type ===
                'favicon'
                  ? 'h-24 w-24 rounded-xl'
                  : 'h-24 w-28 rounded-xl'
              }`}
            >
              {displayedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    displayedUrl
                  }
                  alt={
                    label
                  }
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="px-2 text-center text-xs text-slate-400">
                  {uiText(isArabic, 'text0217')}
                </span>
              )}
            </div>
          </div>


          <div className="min-w-0">
            <FileInput
              file={
                file
              }
              onSelect={
                setFile
              }
              accept={
                accept
              }
              disabled={
                busy
              }
            />


            {file && (
              <div className="mt-3 rounded-xl bg-brand-50 p-3">
                <div className="text-xs font-medium text-brand-800">
                  {uiText(isArabic, 'text0617')}
                </div>

                <p className="mt-1 text-xs leading-5 text-brand-700/70">
                  {uiText(isArabic, 'text0618')}
                </p>
              </div>
            )}


            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={
                  !file ||
                  busy
                }
                onClick={
                  handleUpload
                }
              >
                {busy
                  ? uiText(isArabic, 'text0218')
                  : uiText(isArabic, 'text0219')}
              </button>


              {file && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    busy
                  }
                  onClick={
                    cancelSelection
                  }
                >
                  {uiText(isArabic, 'text0220')}
                </button>
              )}


              {!file &&
                currentUrl && (
                <button
                  type="button"
                  className="btn-danger"
                  disabled={
                    busy
                  }
                  onClick={
                    handleRemove
                  }
                >
                  {uiText(isArabic, 'text0221')}
                </button>
              )}
            </div>


            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {
                  error
                }
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


/*
 * ============================================================
 * BRANDING TAB
 * ============================================================
 */

export default function BrandingTab() {
  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  const {
    refreshBranding,
  } =
    useBranding();


  const [
    settings,
    setSettings,
  ] =
    useState<BrandingSettings | null>(
      null,
    );


  const [
    form,
    setForm,
  ] =
    useState(
      EMPTY_FORM,
    );


  const [
    savedForm,
    setSavedForm,
  ] =
    useState(
      EMPTY_FORM,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );


  const [
    saving,
    setSaving,
  ] =
    useState(
      false,
    );


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    saved,
    setSaved,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * LOAD
   * ==========================================================
   */

  async function load() {
    setLoading(
      true,
    );

    setError('');


    try {
      const data =
        await BrandingApi.get();


      const nextForm = {
        siteName:
          data.siteName ||
          '',

        metaTitle:
          data.metaTitle ||
          '',

        metaDescription:
          data.metaDescription ||
          '',

        metaKeywords:
          data.metaKeywords ||
          '',
      };


      setSettings(
        data,
      );


      setForm(
        nextForm,
      );


      setSavedForm(
        nextForm,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0619'),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  /*
   * ==========================================================
   * UNSAVED TEXT CHANGES
   * ==========================================================
   */

  const hasChanges =
    useMemo(
      () =>
        form.siteName !==
          savedForm.siteName ||
        form.metaTitle !==
          savedForm.metaTitle ||
        form.metaDescription !==
          savedForm.metaDescription ||
        form.metaKeywords !==
          savedForm.metaKeywords,
      [
        form,
        savedForm,
      ],
    );


  /*
   * ==========================================================
   * SAVE DETAILS
   * ==========================================================
   */

  async function saveDetails(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    setSaving(
      true,
    );

    setError('');

    setSaved(
      false,
    );


    try {
      const updated =
        await BrandingApi.update({
          siteName:
            form.siteName.trim(),

          metaTitle:
            form.metaTitle.trim(),

          metaDescription:
            form.metaDescription.trim(),

          metaKeywords:
            form.metaKeywords.trim(),
        });


      setSettings(
        updated,
      );


      const nextSaved = {
        siteName:
          updated.siteName ||
          '',

        metaTitle:
          updated.metaTitle ||
          '',

        metaDescription:
          updated.metaDescription ||
          '',

        metaKeywords:
          updated.metaKeywords ||
          '',
      };


      setForm(
        nextSaved,
      );

      setSavedForm(
        nextSaved,
      );


      await refreshBranding();


      setSaved(
        true,
      );


      window.setTimeout(
        () =>
          setSaved(
            false,
          ),
        2500,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0620'),
      );
    } finally {
      setSaving(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * CANCEL DETAILS
   * ==========================================================
   */

  function cancelDetails() {
    setForm({
      ...savedForm,
    });


    setSaved(
      false,
    );
  }


  /*
   * ==========================================================
   * LOADING
   * ==========================================================
   */

  if (
    loading
  ) {
    return (
      <div className="space-y-4">
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }


  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="space-y-6"
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ======================================================
       * INTRO
       * ======================================================
       */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <BrandingPreviewIcon />
          </div>


          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {uiText(isArabic, 'text0621')}
            </h2>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              {uiText(isArabic, 'text0622')}
            </p>
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * ASSETS
       * ======================================================
       */}

      <div className="grid gap-6 xl:grid-cols-2">
        <AssetField
          type="logo"
          label={
            uiText(isArabic, 'text0222')
          }
          hint={
            uiText(isArabic, 'text0623')
          }
          currentUrl={
            settings?.logoUrl
          }
          siteName={
            form.siteName
          }
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          isArabic={
            isArabic
          }
          onUpload={async (
            file,
          ) => {
            const updated =
              await BrandingApi.uploadLogo(
                file,
              );


            setSettings(
              updated,
            );


            await refreshBranding();
          }}
          onRemove={async () => {
            const updated =
              await BrandingApi.removeLogo();


            setSettings(
              updated,
            );


            await refreshBranding();
          }}
        />


        <AssetField
          type="favicon"
          label={
            uiText(isArabic, 'text0223')
          }
          hint={
            uiText(isArabic, 'text0624')
          }
          currentUrl={
            settings?.faviconUrl
          }
          siteName={
            form.siteName
          }
          accept="image/x-icon,image/vnd.microsoft.icon,image/png,.ico"
          isArabic={
            isArabic
          }
          onUpload={async (
            file,
          ) => {
            const updated =
              await BrandingApi.uploadFavicon(
                file,
              );


            setSettings(
              updated,
            );


            await refreshBranding();
          }}
          onRemove={async () => {
            const updated =
              await BrandingApi.removeFavicon();


            setSettings(
              updated,
            );


            await refreshBranding();
          }}
        />
      </div>


      {/*
       * ======================================================
       * SITE DETAILS
       * ======================================================
       */}

      <form
        onSubmit={
          saveDetails
        }
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-900">
            {uiText(isArabic, 'text0224')}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {uiText(isArabic, 'text0625')}
          </p>
        </div>


        <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div>
              <label className="label">
                {uiText(isArabic, 'text0225')}
              </label>

              <input
                required
                maxLength={
                  150
                }
                className="input"
                value={
                  form.siteName
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      siteName:
                        event.target.value,
                    }),
                  )
                }
              />

              <p className="mt-1 text-xs text-slate-400">
                {uiText(isArabic, 'text0626')}
              </p>
            </div>


            <div>
              <label className="label">
                {uiText(isArabic, 'text0226')}{' '}

                <span className="font-normal text-slate-400">
                  {uiText(isArabic, 'text0062')}
                </span>
              </label>

              <input
                maxLength={
                  150
                }
                className="input"
                value={
                  form.metaTitle
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      metaTitle:
                        event.target.value,
                    }),
                  )
                }
              />

              <p className="mt-1 text-xs text-slate-400">
                {uiText(isArabic, 'text0627')}
              </p>
            </div>


            <div>
              <label className="label">
                {uiText(isArabic, 'text0628')}{' '}

                <span className="font-normal text-slate-400">
                  {uiText(isArabic, 'text0062')}
                </span>
              </label>

              <textarea
                rows={
                  4
                }
                maxLength={
                  300
                }
                className="input"
                value={
                  form.metaDescription
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      metaDescription:
                        event.target.value,
                    }),
                  )
                }
              />

              <div className="mt-1 text-end text-[10px] text-slate-400">
                {form.metaDescription.length}
                /300
              </div>
            </div>


            <div>
              <label className="label">
                {uiText(isArabic, 'text0629')}{' '}

                <span className="font-normal text-slate-400">
                  {uiText(isArabic, 'text0062')}
                </span>
              </label>

              <input
                maxLength={
                  300
                }
                className="input"
                placeholder={
                  uiText(isArabic, 'text0630')
                }
                value={
                  form.metaKeywords
                }
                onChange={(
                  event,
                ) =>
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,

                      metaKeywords:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>


            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {
                  error
                }
              </div>
            )}


            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  saving ||
                  !hasChanges
                }
              >
                {saving
                  ? uiText(isArabic, 'text0081')
                  : uiText(isArabic, 'text0082')}
              </button>


              {hasChanges && (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={
                    saving
                  }
                  onClick={
                    cancelDetails
                  }
                >
                  {uiText(isArabic, 'text0227')}
                </button>
              )}


              {saved && (
                <span className="text-sm font-medium text-green-600">
                  {uiText(isArabic, 'text0228')}
                </span>
              )}


              {!hasChanges &&
                !saved && (
                <span className="text-xs text-slate-400">
                  {uiText(isArabic, 'text0229')}
                </span>
              )}
            </div>
          </div>


          {/*
           * ==================================================
           * LIVE METADATA PREVIEW
           * ==================================================
           */}

          <div>
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {uiText(isArabic, 'text0631')}
              </div>


              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex h-10 items-center gap-2 bg-slate-100 px-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-300" />
                </div>


                <div className="p-4">
                  <div className="text-sm font-semibold text-slate-800">
                    {form.metaTitle ||
                      form.siteName ||
                      'Task & Project Manager'}
                  </div>


                  <div className="mt-1 text-[10px] text-green-700">
                    example.com
                  </div>


                  <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500">
                    {form.metaDescription ||
                      (
                        uiText(isArabic, 'text0632')
                      )}
                  </p>
                </div>
              </div>


              <p className="mt-3 text-xs leading-5 text-slate-400">
                {uiText(isArabic, 'text0633')}
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}


/*
 * ============================================================
 * ICON
 * ============================================================
 */

function BrandingPreviewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        d="M5 5h14v14H5z"
        strokeWidth="1.7"
      />

      <circle
        cx="10"
        cy="10"
        r="2"
        strokeWidth="1.7"
      />

      <path
        d="m7 17 4-4 2.5 2.5L15 14l2 3"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}