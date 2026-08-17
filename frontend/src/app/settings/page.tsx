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

import ProtectedRoute from '@/components/ProtectedRoute';
import Pagination from '@/components/Pagination';
import BrandingTab from '@/components/BrandingTab';
import ListSettingsTab from '@/components/ListSettingsTab';
import ColorThemeTab from '@/components/ColorThemeTab';
import WorkflowSettingsTab from '@/components/WorkflowSettingsTab';
import DictionarySettingsTab from '@/components/DictionarySettingsTab';

import {
  ApiError,
} from '@/lib/api';

import {
  SettingsApi,
  type CreateSettingPayload,
} from '@/lib/endpoints';

import type {
  Setting,
  SettingType,
  SettingValueType,
} from '@/lib/types';


/*
 * ============================================================
 * CONFIG
 * ============================================================
 */

const PAGE_SIZE =
  10;


type DataSettingType =
  | 'department'
  | 'branch';


type PageTab =
  | 'data'
  | 'branding'
  | 'color-theme'
  | 'lists'
  | 'workflow'
  | 'dictionary';


type FormState = {
  code:
    string;

  valueType:
    SettingValueType;

  value:
    string;

  valueNumber:
    string;

  address:
    string;
};


const EMPTY_FORM:
  FormState = {
  code:
    '',

  valueType:
    'string',

  value:
    '',

  valueNumber:
    '',

  address:
    '',
};


/*
 * ============================================================
 * ICONS
 * ============================================================
 */

function DataIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        d="M4 6.5h16v11H4z"
        strokeWidth="1.7"
      />

      <path
        d="M8 10h8M8 14h5"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}


function BrandingIcon() {
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


function ThemeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        d="
          M12 4
          a8 8 0 1 0 0 16
          h1.1
          a1.8 1.8 0 0 0 0-3.6
          H12
          a1.8 1.8 0 0 1 0-3.6
          h2.8
          A5.2 5.2 0 0 0 20 7.6
          C20 5.6 16.6 4 12 4Z
        "
        strokeWidth="1.7"
      />

      <circle
        cx="8"
        cy="9"
        r=".8"
        fill="currentColor"
      />

      <circle
        cx="11"
        cy="7"
        r=".8"
        fill="currentColor"
      />

      <circle
        cx="15"
        cy="8"
        r=".8"
        fill="currentColor"
      />
    </svg>
  );
}


function ListsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <path
        d="M9 6h11M9 12h11M9 18h11"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      <path
        d="
          m4 6 .7.7L6 5.4
          M4 12l.7.7L6 11.4
          M4 18l.7.7L6 17.4
        "
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}


function DictionaryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
      <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4Z" strokeWidth="1.7" />
      <path d="M8 8h7M8 12h7M8 16h4" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}


function WorkflowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      className="h-5 w-5"
    >
      <circle
        cx="6"
        cy="6"
        r="2"
        strokeWidth="1.7"
      />

      <circle
        cx="18"
        cy="12"
        r="2"
        strokeWidth="1.7"
      />

      <circle
        cx="6"
        cy="18"
        r="2"
        strokeWidth="1.7"
      />

      <path
        d="
          M8 6h3
          a3 3 0 0 1 3 3
          a3 3 0 0 0 3 3
          h-1
        "
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="
          M8 18h3
          a3 3 0 0 0 3-3
          a3 3 0 0 1 3-3
          h-1
        "
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}


/*
 * ============================================================
 * SETTINGS DATA TAB
 * ============================================================
 */

function DataSettingsTab() {
  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  /*
   * ==========================================================
   * TYPE
   * ==========================================================
   */

  const [
    type,
    setType,
  ] =
    useState<DataSettingType>(
      'department',
    );


  /*
   * ==========================================================
   * ROWS
   * ==========================================================
   */

  const [
    rows,
    setRows,
  ] =
    useState<Setting[]>(
      [],
    );


  const [
    loading,
    setLoading,
  ] =
    useState(
      true,
    );


  const [
    error,
    setError,
  ] =
    useState(
      '',
    );


  const [
    page,
    setPage,
  ] =
    useState(
      1,
    );


  /*
   * ==========================================================
   * CREATE
   * ==========================================================
   */

  const [
    form,
    setForm,
  ] =
    useState<FormState>({
      ...EMPTY_FORM,
    });


  const [
    creating,
    setCreating,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  const [
    editingRow,
    setEditingRow,
  ] =
    useState<Setting | null>(
      null,
    );


  const [
    editForm,
    setEditForm,
  ] =
    useState<FormState>({
      ...EMPTY_FORM,
    });


  const [
    editError,
    setEditError,
  ] =
    useState(
      '',
    );


  const [
    savingEdit,
    setSavingEdit,
  ] =
    useState(
      false,
    );


  /*
   * ==========================================================
   * ACTION STATE
   * ==========================================================
   */

  const [
    busyId,
    setBusyId,
  ] =
    useState<string | null>(
      null,
    );


  const [
    pendingDeactivate,
    setPendingDeactivate,
  ] =
    useState<Setting | null>(
      null,
    );


  /*
   * ==========================================================
   * LOAD
   * ==========================================================
   */

  async function load(
    selectedType:
      DataSettingType =
      type,
  ) {
    setLoading(
      true,
    );

    setError(
      '',
    );


    try {
      const data =
        await SettingsApi.list(
          selectedType as
            SettingType,
        );


      setRows(
        data,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0084'),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(
    () => {
      load(
        type,
      );


      setForm({
        ...EMPTY_FORM,
      });


      setEditingRow(
        null,
      );


      setPage(
        1,
      );

      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      type,
    ],
  );


  /*
   * ==========================================================
   * LANGUAGE FILTER
   * ==========================================================
   *
   * English interface:
   * show only records containing English data.
   *
   * Arabic interface:
   * show only records containing Arabic data.
   * ==========================================================
   */

  const visibleRows =
    useMemo(
      () =>
        rows.filter(
          (
            row,
          ) =>
            Boolean(
              isArabic
                ? row.codeAr
                    ?.trim()
                : row.codeEn
                    ?.trim(),
            ),
        ),

      [
        rows,
        isArabic,
      ],
    );


  /*
   * ==========================================================
   * PAGINATION
   * ==========================================================
   */

  const totalPages =
    Math.max(
      Math.ceil(
        visibleRows.length /
          PAGE_SIZE,
      ),

      1,
    );


  const pagedRows =
    visibleRows.slice(
      (
        page -
        1
      ) *
        PAGE_SIZE,

      page *
        PAGE_SIZE,
    );


  useEffect(
    () => {
      if (
        page >
        totalPages
      ) {
        setPage(
          totalPages,
        );
      }
    },
    [
      page,
      totalPages,
    ],
  );


  /*
   * ==========================================================
   * LABELS
   * ==========================================================
   */

  const selectedTypeName =
    type ===
    'department'
      ? uiText(isArabic, 'text0445')
      : uiText(isArabic, 'text0446');


  const pluralTypeName =
    type ===
    'department'
      ? uiText(isArabic, 'text0447')
      : uiText(isArabic, 'text0448');


  function displayCode(
    row:
      Setting,
  ) {
    return isArabic
      ? row.codeAr
      : row.codeEn;
  }


  function displayValue(
    row:
      Setting,
  ) {
    if (
      row.valueType ===
      'number'
    ) {
      return (
        row.valueNumber ??
        '—'
      );
    }


    return isArabic
      ? row.valueAr ||
          '—'
      : row.valueEn ||
          '—';
  }


  /*
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  function validateForm(
    target:
      FormState,
  ) {
    if (
      !target.code.trim()
    ) {
      return uiText(isArabic, 'text0449');
    }


    if (
      target.valueType ===
        'string' &&
      !target.value.trim()
    ) {
      return uiText(isArabic, 'text0450');
    }


    if (
      target.valueType ===
        'number' &&
      target.valueNumber.trim() ===
        ''
    ) {
      return uiText(isArabic, 'text0451');
    }


    if (
      target.valueType ===
        'number' &&
      !Number.isInteger(
        Number(
          target.valueNumber,
        ),
      )
    ) {
      return uiText(isArabic, 'text0452');
    }


    return '';
  }


  /*
   * ==========================================================
   * CREATE
   * ==========================================================
   */

  async function createRow(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    setError(
      '',
    );


    const validation =
      validateForm(
        form,
      );


    if (
      validation
    ) {
      setError(
        validation,
      );

      return;
    }


    const payload:
      CreateSettingPayload = {
      type,

      valueType:
        form.valueType,


      /*
       * Only save the currently selected language.
       */
      ...(isArabic
        ? {
            codeAr:
              form.code.trim(),
          }
        : {
            codeEn:
              form.code.trim(),
          }),


      /*
       * String values are language-specific.
       *
       * Number values are shared.
       */
      ...(form.valueType ===
      'string'
        ? isArabic
          ? {
              valueAr:
                form.value.trim(),
            }
          : {
              valueEn:
                form.value.trim(),
            }
        : {
            valueNumber:
              Number(
                form.valueNumber,
              ),
          }),


      /*
       * Address exists only for Branch.
       */
      ...(type ===
      'branch'
        ? {
            address:
              form.address.trim() ||
              undefined,
          }
        : {}),
    };


    setCreating(
      true,
    );


    try {
      await SettingsApi.create(
        payload,
      );


      setForm({
        ...EMPTY_FORM,
      });


      await load(
        type,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0453'),
      );
    } finally {
      setCreating(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * EDIT
   * ==========================================================
   */

  function startEdit(
    row:
      Setting,
  ) {
    setEditError(
      '',
    );


    setEditingRow(
      row,
    );


    setEditForm({
      code:
        isArabic
          ? row.codeAr ||
            ''
          : row.codeEn ||
            '',

      valueType:
        row.valueType ||
        'string',

      value:
        row.valueType ===
        'string'
          ? isArabic
            ? row.valueAr ||
              ''
            : row.valueEn ||
              ''
          : '',

      valueNumber:
        row.valueType ===
          'number' &&
        row.valueNumber !==
          undefined
          ? String(
              row.valueNumber,
            )
          : '',

      address:
        row.address ||
        '',
    });
  }


  function closeEdit() {
    if (
      savingEdit
    ) {
      return;
    }


    setEditingRow(
      null,
    );


    setEditError(
      '',
    );


    setEditForm({
      ...EMPTY_FORM,
    });
  }


  async function saveEdit(
    event:
      React.FormEvent,
  ) {
    event.preventDefault();


    if (
      !editingRow
    ) {
      return;
    }


    const validation =
      validateForm(
        editForm,
      );


    if (
      validation
    ) {
      setEditError(
        validation,
      );

      return;
    }


    setSavingEdit(
      true,
    );


    setEditError(
      '',
    );


    try {
      await SettingsApi.update(
        editingRow.id,

        {
          valueType:
            editForm.valueType,


          /*
           * Only edit the active language.
           */
          ...(isArabic
            ? {
                codeAr:
                  editForm.code.trim(),
              }
            : {
                codeEn:
                  editForm.code.trim(),
              }),


          ...(editForm.valueType ===
          'string'
            ? isArabic
              ? {
                  valueAr:
                    editForm.value.trim(),
                }
              : {
                  valueEn:
                    editForm.value.trim(),
                }
            : {
                valueNumber:
                  Number(
                    editForm.valueNumber,
                  ),
              }),


          ...(type ===
          'branch'
            ? {
                address:
                  editForm.address.trim() ||
                  undefined,
              }
            : {}),
        },
      );


      setEditingRow(
        null,
      );


      await load(
        type,
      );
    } catch (
      err
    ) {
      setEditError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0454'),
      );
    } finally {
      setSavingEdit(
        false,
      );
    }
  }


  /*
   * ==========================================================
   * ACTIVATE / DEACTIVATE
   * ==========================================================
   */

  async function toggleActive(
    row:
      Setting,
  ) {
    setBusyId(
      row.id,
    );


    setError(
      '',
    );


    try {
      await SettingsApi.update(
        row.id,

        {
          isActive:
            !row.isActive,
        },
      );


      setPendingDeactivate(
        null,
      );


      await load(
        type,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0455'),
      );


      setPendingDeactivate(
        null,
      );
    } finally {
      setBusyId(
        null,
      );
    }
  }


  /*
   * ==========================================================
   * DELETE
   * ==========================================================
   */

  async function remove(
    row:
      Setting,
  ) {
    setBusyId(
      row.id,
    );


    setError(
      '',
    );


    try {
      await SettingsApi.remove(
        row.id,
      );


      if (
        editingRow?.id ===
        row.id
      ) {
        setEditingRow(
          null,
        );
      }


      await load(
        type,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0456'),
      );
    } finally {
      setBusyId(
        null,
      );
    }
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
       * DATA TYPE
       * ======================================================
       */}

      <section
        className="
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-5
        "
      >
        <div
          className="
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <h2
              className="
                text-base
                font-semibold
                text-slate-900
              "
            >
              {uiText(isArabic, 'text0457')}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {uiText(isArabic, 'text0458')}
            </p>
          </div>


          <div
            className="
              inline-flex
              rounded-xl
              bg-slate-100
              p-1
            "
          >
            <button
              type="button"
              onClick={() =>
                setType(
                  'department',
                )
              }
              className={`
                rounded-lg
                px-4
                py-2
                text-sm
                font-medium
                transition
                ${
                  type ===
                  'department'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {uiText(isArabic, 'text0447')}
            </button>


            <button
              type="button"
              onClick={() =>
                setType(
                  'branch',
                )
              }
              className={`
                rounded-lg
                px-4
                py-2
                text-sm
                font-medium
                transition
                ${
                  type ===
                  'branch'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }
              `}
            >
              {uiText(isArabic, 'text0448')}
            </button>
          </div>
        </div>
      </section>


      {/*
       * ======================================================
       * CREATE + LANGUAGE INFO
       * ======================================================
       */}

      <div
        className="
          grid
          gap-6
          xl:grid-cols-[minmax(0,1fr)_320px]
        "
      >
        <form
          onSubmit={
            createRow
          }
          className="
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
          "
        >
          <div
            className="
              border-b
              border-slate-100
              px-5
              py-4
              sm:px-6
            "
          >
            <h2
              className="
                text-base
                font-semibold
                text-slate-900
              "
            >
              {uiText(isArabic, 'text0732', { value0: selectedTypeName })}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              {uiText(isArabic, 'text0459')}
            </p>
          </div>


          <div
            className="
              space-y-5
              p-5
              sm:p-6
            "
          >
            <div
              className="
                grid
                gap-4
                sm:grid-cols-2
              "
            >
              <div>
                <label className="label">
                  {uiText(isArabic, 'text0085')}
                </label>

                <input
                  required
                  className="input"
                  dir={
                    isArabic
                      ? 'rtl'
                      : 'ltr'
                  }
                  placeholder={
                    type ===
                    'department'
                      ? uiText(isArabic, 'text0086')
                      : uiText(isArabic, 'text0087')
                  }
                  value={
                    form.code
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        code:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0088')}
                </label>

                <select
                  className="input"
                  value={
                    form.valueType
                  }
                  onChange={(
                    event,
                  ) => {
                    const next =
                      event.target.value as
                        SettingValueType;


                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        valueType:
                          next,

                        value:
                          next ===
                          'string'
                            ? current.value
                            : '',

                        valueNumber:
                          next ===
                          'number'
                            ? current.valueNumber
                            : '',
                      }),
                    );
                  }}
                >
                  <option value="string">
                    {uiText(isArabic, 'text0460')}
                  </option>

                  <option value="number">
                    {uiText(isArabic, 'text0461')}
                  </option>
                </select>
              </div>
            </div>


            {form.valueType ===
            'string' ? (
              <div>
                <label className="label">
                  {uiText(isArabic, 'text0089')}
                </label>

                <input
                  required
                  className="input"
                  dir={
                    isArabic
                      ? 'rtl'
                      : 'ltr'
                  }
                  value={
                    form.value
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        value:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            ) : (
              <div>
                <label className="label">
                  {uiText(isArabic, 'text0462')}
                </label>

                <input
                  required
                  type="number"
                  step="1"
                  className="input"
                  value={
                    form.valueNumber
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        valueNumber:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            )}


            {type ===
              'branch' && (
              <div>
                <label className="label">
                  {uiText(isArabic, 'text0463')}{' '}

                  <span
                    className="
                      font-normal
                      text-slate-400
                    "
                  >
                    {uiText(isArabic, 'text0062')}
                  </span>
                </label>

                <input
                  className="input"
                  value={
                    form.address
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        address:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            )}


            {error && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-200
                  bg-red-50
                  p-3
                  text-sm
                  text-red-700
                "
              >
                {error}
              </div>
            )}


            <div
              className="
                flex
                justify-end
              "
            >
              <button
                type="submit"
                className="btn-primary"
                disabled={
                  creating
                }
              >
                {creating
                  ? uiText(isArabic, 'text0090')
                  : uiText(isArabic, 'text0732', { value0: selectedTypeName })}
              </button>
            </div>
          </div>
        </form>


        <aside
          className="
            rounded-2xl
            border
            border-brand-100
            bg-brand-50/50
            p-5
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-white
              text-brand-700
              shadow-sm
            "
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <circle
                cx="12"
                cy="12"
                r="8"
                strokeWidth="1.7"
              />

              <path
                d="
                  M4.5 12h15
                  M12 4c2 2.2 3 4.9 3 8s-1 5.8-3 8
                  M12 4c-2 2.2-3 4.9-3 8s1 5.8 3 8
                "
                strokeWidth="1.5"
              />
            </svg>
          </div>


          <h3
            className="
              mt-4
              text-sm
              font-semibold
              text-slate-900
            "
          >
            {uiText(isArabic, 'text0464')}
          </h3>


          <p
            className="
              mt-2
              text-sm
              leading-6
              text-slate-600
            "
          >
            {uiText(isArabic, 'text0465')}
          </p>


          <p
            className="
              mt-3
              text-xs
              leading-5
              text-slate-500
            "
          >
            {uiText(isArabic, 'text0466')}
          </p>
        </aside>
      </div>


      {/*
       * ======================================================
       * DIRECTORY
       * ======================================================
       */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-100
            px-5
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-6
          "
        >
          <div>
            <h2
              className="
                text-base
                font-semibold
                text-slate-900
              "
            >
              {pluralTypeName}
            </h2>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              {visibleRows.length}{' '}

              {uiText(isArabic, 'text0467')}
            </p>
          </div>


          <div
            className="
              flex
              items-center
              gap-2
              text-xs
              text-slate-400
            "
          >
            <span
              className="
                h-2
                w-2
                rounded-full
                bg-green-500
              "
            />

            {uiText(isArabic, 'text0091')}

            <span
              className="
                ms-2
                h-2
                w-2
                rounded-full
                bg-slate-300
              "
            />

            {uiText(isArabic, 'text0092')}
          </div>
        </div>


        {loading ? (
          <div
            className="
              space-y-3
              p-5
              sm:p-6
            "
          >
            {[
              1,
              2,
              3,
            ].map(
              (
                item,
              ) => (
                <div
                  key={
                    item
                  }
                  className="
                    h-20
                    animate-pulse
                    rounded-xl
                    bg-slate-100
                  "
                />
              ),
            )}
          </div>
        ) : visibleRows.length ===
          0 ? (
          <div
            className="
              flex
              min-h-[220px]
              flex-col
              items-center
              justify-center
              px-6
              text-center
            "
          >
            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                bg-slate-100
                text-slate-400
              "
            >
              <DataIcon />
            </div>

            <h3
              className="
                mt-3
                text-sm
                font-semibold
                text-slate-700
              "
            >
              {isArabic
                ? 'لا توجد بيانات'
                : `No ${pluralTypeName.toLowerCase()} yet`}
            </h3>

            <p
              className="
                mt-1
                text-xs
                text-slate-400
              "
            >
              {uiText(isArabic, 'text0468')}
            </p>
          </div>
        ) : (
          <div
            className="
              divide-y
              divide-slate-100
            "
          >
            {pagedRows.map(
              (
                row,
              ) => (
                <div
                  key={
                    row.id
                  }
                  className="
                    flex
                    flex-col
                    gap-4
                    px-5
                    py-4
                    transition
                    hover:bg-slate-50/60
                    sm:px-6
                    lg:flex-row
                    lg:items-center
                  "
                >
                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <div
                        className="
                          truncate
                          text-sm
                          font-semibold
                          text-slate-800
                        "
                      >
                        {displayCode(
                          row,
                        )}
                      </div>


                      <span
                        className={`
                          rounded-full
                          px-2
                          py-0.5
                          text-[10px]
                          font-semibold
                          ${
                            row.isActive
                              ? 'bg-green-50 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }
                        `}
                      >
                        {row.isActive
                          ? uiText(isArabic, 'text0091')
                          : uiText(isArabic, 'text0092')}
                      </span>
                    </div>


                    <div
                      className="
                        mt-2
                        flex
                        flex-wrap
                        gap-x-6
                        gap-y-2
                        text-xs
                      "
                    >
                      <div>
                        <span
                          className="
                            text-slate-400
                          "
                        >
                          {uiText(isArabic, 'text0093')}
                        </span>{' '}

                        <span
                          className="
                            font-medium
                            text-slate-600
                          "
                        >
                          {displayValue(
                            row,
                          )}
                        </span>
                      </div>


                      <div>
                        <span
                          className="
                            text-slate-400
                          "
                        >
                          {uiText(isArabic, 'text0094')}
                        </span>{' '}

                        <span
                          className="
                            font-medium
                            text-slate-600
                          "
                        >
                          {row.valueType ===
                          'number'
                            ? uiText(isArabic, 'text0461')
                            : uiText(isArabic, 'text0460')}
                        </span>
                      </div>


                      {type ===
                        'branch' && (
                        <div>
                          <span
                            className="
                              text-slate-400
                            "
                          >
                            {uiText(isArabic, 'text0469')}
                          </span>{' '}

                          <span
                            className="
                              font-medium
                              text-slate-600
                            "
                          >
                            {row.address ||
                              '—'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>


                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <button
                      type="button"
                      className="
                        btn-secondary
                        px-3
                        py-1.5
                        text-xs
                      "
                      onClick={() =>
                        startEdit(
                          row,
                        )
                      }
                    >
                      {uiText(isArabic, 'text0068')}
                    </button>


                    <button
                      type="button"
                      className="
                        btn-secondary
                        px-3
                        py-1.5
                        text-xs
                      "
                      disabled={
                        busyId ===
                        row.id
                      }
                      onClick={() => {
                        if (
                          row.isActive
                        ) {
                          setPendingDeactivate(
                            row,
                          );
                        } else {
                          toggleActive(
                            row,
                          );
                        }
                      }}
                    >
                      {busyId ===
                      row.id
                        ? uiText(isArabic, 'text0095')
                        : row.isActive
                          ? uiText(isArabic, 'text0096')
                          : uiText(isArabic, 'text0097')}
                    </button>


                    <button
                      type="button"
                      className="
                        btn-danger
                        px-3
                        py-1.5
                        text-xs
                      "
                      disabled={
                        busyId ===
                        row.id
                      }
                      onClick={() =>
                        remove(
                          row,
                        )
                      }
                    >
                      {uiText(isArabic, 'text0038')}
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </section>


      {!loading && (
        <Pagination
          page={
            page
          }
          totalPages={
            totalPages
          }
          total={
            visibleRows.length
          }
          onPageChange={
            setPage
          }
          itemLabel={
            type ===
            'department'
              ? uiText(isArabic, 'text0470')
              : uiText(isArabic, 'text0471')
          }
        />
      )}


      {/*
       * ======================================================
       * EDIT MODAL
       * ======================================================
       */}

      {editingRow && (
        <div
          className="
            fixed
            inset-0
            z-[150]
            flex
            items-center
            justify-center
            bg-slate-950/40
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeEdit();
            }
          }}
        >
          <form
            onSubmit={
              saveEdit
            }
            className="
              w-full
              max-w-xl
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            <div
              className="
                border-b
                border-slate-100
                px-6
                py-5
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-4
                "
              >
                <div>
                  <div
                    className="
                      text-xs
                      font-semibold
                      uppercase
                      tracking-[.14em]
                      text-brand-600
                    "
                  >
                    {uiText(isArabic, 'text0098')}
                  </div>

                  <h2
                    className="
                      mt-2
                      text-xl
                      font-semibold
                      text-slate-900
                    "
                  >
                    {uiText(isArabic, 'text0733', { value0: selectedTypeName })}
                  </h2>
                </div>


                <button
                  type="button"
                  className="
                    flex
                    h-9
                    w-9
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    transition
                    hover:bg-slate-100
                    hover:text-slate-700
                  "
                  onClick={
                    closeEdit
                  }
                >
                  ✕
                </button>
              </div>
            </div>


            <div
              className="
                max-h-[70vh]
                space-y-5
                overflow-y-auto
                p-6
              "
            >
              <div>
                <label className="label">
                  {uiText(isArabic, 'text0085')}
                </label>

                <input
                  required
                  className="input"
                  dir={
                    isArabic
                      ? 'rtl'
                      : 'ltr'
                  }
                  value={
                    editForm.code
                  }
                  onChange={(
                    event,
                  ) =>
                    setEditForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        code:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>


              <div>
                <label className="label">
                  {uiText(isArabic, 'text0088')}
                </label>

                <select
                  className="input"
                  value={
                    editForm.valueType
                  }
                  onChange={(
                    event,
                  ) => {
                    const next =
                      event.target.value as
                        SettingValueType;


                    setEditForm(
                      (
                        current,
                      ) => ({
                        ...current,

                        valueType:
                          next,

                        value:
                          next ===
                          'string'
                            ? current.value
                            : '',

                        valueNumber:
                          next ===
                          'number'
                            ? current.valueNumber
                            : '',
                      }),
                    );
                  }}
                >
                  <option value="string">
                    {uiText(isArabic, 'text0460')}
                  </option>

                  <option value="number">
                    {uiText(isArabic, 'text0461')}
                  </option>
                </select>
              </div>


              {editForm.valueType ===
              'string' ? (
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0089')}
                  </label>

                  <input
                    required
                    className="input"
                    dir={
                      isArabic
                        ? 'rtl'
                        : 'ltr'
                    }
                    value={
                      editForm.value
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          value:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              ) : (
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0462')}
                  </label>

                  <input
                    required
                    type="number"
                    step="1"
                    className="input"
                    value={
                      editForm.valueNumber
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          valueNumber:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              )}


              {type ===
                'branch' && (
                <div>
                  <label className="label">
                    {uiText(isArabic, 'text0463')}
                  </label>

                  <input
                    className="input"
                    value={
                      editForm.address
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditForm(
                        (
                          current,
                        ) => ({
                          ...current,

                          address:
                            event.target.value,
                        }),
                      )
                    }
                  />
                </div>
              )}


              <div
                className="
                  rounded-xl
                  bg-brand-50
                  p-3
                  text-xs
                  leading-5
                  text-brand-800
                "
              >
                {uiText(isArabic, 'text0472')}
              </div>


              {editError && (
                <div
                  className="
                    rounded-xl
                    border
                    border-red-200
                    bg-red-50
                    p-3
                    text-sm
                    text-red-700
                  "
                >
                  {editError}
                </div>
              )}
            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-slate-100
                bg-slate-50/60
                px-6
                py-4
              "
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  savingEdit
                }
                onClick={
                  closeEdit
                }
              >
                {uiText(isArabic, 'text0080')}
              </button>


              <button
                type="submit"
                className="btn-primary"
                disabled={
                  savingEdit
                }
              >
                {savingEdit
                  ? uiText(isArabic, 'text0081')
                  : uiText(isArabic, 'text0082')}
              </button>
            </div>
          </form>
        </div>
      )}


      {/*
       * ======================================================
       * DEACTIVATE CONFIRMATION
       * ======================================================
       */}

      {pendingDeactivate && (
        <div
          className="
            fixed
            inset-0
            z-[150]
            flex
            items-center
            justify-center
            bg-slate-950/40
            p-4
            backdrop-blur-sm
          "
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              busyId !==
                pendingDeactivate.id
            ) {
              setPendingDeactivate(
                null,
              );
            }
          }}
        >
          <div
            className="
              w-full
              max-w-md
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
            "
          >
            <div className="p-6">
              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  bg-amber-50
                  text-amber-700
                "
              >
                !
              </div>


              <h2
                className="
                  mt-4
                  text-lg
                  font-semibold
                  text-slate-900
                "
              >
                {uiText(isArabic, 'text0734', { value0: selectedTypeName })}
              </h2>


              <p
                className="
                  mt-2
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                {uiText(isArabic, 'text0473')}
              </p>
            </div>


            <div
              className="
                flex
                justify-end
                gap-2
                border-t
                border-slate-100
                bg-slate-50/60
                px-6
                py-4
              "
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={
                  busyId ===
                  pendingDeactivate.id
                }
                onClick={() =>
                  setPendingDeactivate(
                    null,
                  )
                }
              >
                {uiText(isArabic, 'text0080')}
              </button>


              <button
                type="button"
                className="btn-primary"
                disabled={
                  busyId ===
                  pendingDeactivate.id
                }
                onClick={() =>
                  toggleActive(
                    pendingDeactivate,
                  )
                }
              >
                {busyId ===
                pendingDeactivate.id
                  ? uiText(isArabic, 'text0099')
                  : uiText(isArabic, 'text0096')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/*
 * ============================================================
 * PAGE TABS
 * ============================================================
 */

const PAGE_TABS: {
  value:
    PageTab;

  labelKey: Parameters<typeof uiText>[1];

  descriptionKey: Parameters<typeof uiText>[1];

  icon:
    React.ReactNode;
}[] = [
  {
    value:
      'data',

    labelKey: 'text0718',

    descriptionKey: 'text0754',

    icon:
      <DataIcon />,
  },

  {
    value:
      'branding',

    labelKey: 'text0704',

    descriptionKey: 'text0755',

    icon:
      <BrandingIcon />,
  },

  {
    value:
      'color-theme',

    labelKey: 'text0719',

    descriptionKey: 'text0756',

    icon:
      <ThemeIcon />,
  },

  {
    value:
      'lists',

    labelKey: 'text0720',

    descriptionKey: 'text0757',

    icon:
      <ListsIcon />,
  },

  {
    value:
      'workflow',

    labelKey: 'text0721',

    descriptionKey: 'text0758',

    icon:
      <WorkflowIcon />,
  },

  {
    value: 'dictionary',
    labelKey: 'text0825',
    descriptionKey: 'text0826',
    icon: <DictionaryIcon />,
  },
];


/*
 * ============================================================
 * SETTINGS PAGE
 * ============================================================
 */

function SettingsPageContent() {
  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  const [
    tab,
    setTab,
  ] =
    useState<PageTab>(
      'data',
    );


  return (
    <div
      className="
        mx-auto
        max-w-[1500px]
        pb-12
      "
      dir={
        isArabic
          ? 'rtl'
          : 'ltr'
      }
    >
      {/*
       * ======================================================
       * HEADER
       * ======================================================
       */}

      <section
        className="
          relative
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          px-5
          py-6
          sm:px-7
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-32
            -top-32
            h-72
            w-72
            rounded-full
            bg-brand-50
            blur-3xl
          "
        />


        <div
          className="
            pointer-events-none
            absolute
            -bottom-28
            left-1/3
            h-56
            w-56
            rounded-full
            bg-slate-50
            blur-3xl
          "
        />


        <div className="relative">
          <div
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[.14em]
              text-brand-600
            "
          >
            {uiText(isArabic, 'text0100')}
          </div>


          <h1
            className="
              mt-2
              text-2xl
              font-semibold
              tracking-[-0.03em]
              text-slate-950
              sm:text-3xl
            "
          >
            {uiText(isArabic, 'text0101')}
          </h1>


          <p
            className="
              mt-2
              max-w-3xl
              text-sm
              leading-6
              text-slate-500
            "
          >
            {uiText(isArabic, 'text0474')}
          </p>
        </div>
      </section>


      {/*
       * ======================================================
       * TAB NAVIGATION
       * ======================================================
       */}

      <div
        className="
          mt-5
          grid
          gap-3
          sm:grid-cols-2
          lg:grid-cols-3
          2xl:grid-cols-6
        "
      >
        {PAGE_TABS.map(
          (
            item,
          ) => {
            const active =
              tab ===
              item.value;


            return (
              <button
                key={
                  item.value
                }
                type="button"
                onClick={() =>
                  setTab(
                    item.value,
                  )
                }
                className={`
                  group
                  flex
                  items-center
                  gap-3
                  rounded-2xl
                  border
                  p-4
                  text-start
                  transition-all
                  duration-200
                  ${
                    active
                      ? 'border-brand-200 bg-brand-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-sm'
                  }
                `}
              >
                <div
                  className={`
                    flex
                    h-10
                    w-10
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    transition
                    ${
                      active
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-brand-50 group-hover:text-brand-700'
                    }
                  `}
                >
                  {item.icon}
                </div>


                <div
                  className="
                    min-w-0
                    flex-1
                  "
                >
                  <div
                    className={`
                      truncate
                      text-sm
                      font-semibold
                      ${
                        active
                          ? 'text-brand-800'
                          : 'text-slate-800'
                      }
                    `}
                  >
                    {uiText(isArabic, item.labelKey)}
                  </div>


                  <div
                    className="
                      mt-0.5
                      truncate
                      text-xs
                      text-slate-400
                    "
                  >
                    {uiText(isArabic, item.descriptionKey)}
                  </div>
                </div>


                {active && (
                  <div
                    className="
                      h-2
                      w-2
                      shrink-0
                      rounded-full
                      bg-brand-500
                    "
                  />
                )}
              </button>
            );
          },
        )}
      </div>


      {/*
       * ======================================================
       * ACTIVE TAB
       * ======================================================
       */}

      <div
        className="
          mt-6
        "
      >
        {tab ===
          'data' && (
          <DataSettingsTab />
        )}


        {tab ===
          'branding' && (
          <BrandingTab />
        )}


        {tab ===
          'color-theme' && (
          <ColorThemeTab />
        )}


        {tab ===
          'lists' && (
          <ListSettingsTab />
        )}


        {tab ===
          'workflow' && (
          <WorkflowSettingsTab />
        )}


        {tab ===
          'dictionary' && (
          <DictionarySettingsTab />
        )}
      </div>
    </div>
  );
}


/*
 * ============================================================
 * PAGE
 * ============================================================
 */

export default function SettingsPage() {
  return (
    <ProtectedRoute
      adminOnly
    >
      <SettingsPageContent />
    </ProtectedRoute>
  );
}
