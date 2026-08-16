'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from 'next-intl';

import ProtectedRoute from '@/components/ProtectedRoute';
import Pagination from '@/components/Pagination';
import BrandingTab from '@/components/BrandingTab';
import ListSettingsTab from '@/components/ListSettingsTab';
import ColorThemeTab from '@/components/ColorThemeTab';

import { ApiError } from '@/lib/api';

import {
  SettingsApi,
  type CreateSettingPayload,
} from '@/lib/endpoints';

import type {
  Setting,
  SettingType,
  SettingValueType,
} from '@/lib/types';

const PAGE_SIZE = 10;

type DataSettingType = 'department' | 'branch';

const TYPE_OPTIONS: {
  value: DataSettingType;
  labelEn: string;
  labelAr: string;
}[] = [
  {
    value: 'department',
    labelEn: 'Department',
    labelAr: 'القسم',
  },
  {
    value: 'branch',
    labelEn: 'Branch',
    labelAr: 'الفرع',
  },
];

type FormState = {
  code: string;
  valueType: SettingValueType;
  value: string;
  valueNumber: string;
  address: string;
};

const EMPTY_FORM: FormState = {
  code: '',
  valueType: 'string',
  value: '',
  valueNumber: '',
  address: '',
};

type EditFormState = {
  code: string;
  valueType: SettingValueType;
  value: string;
  valueNumber: string;
  address: string;
};

const EMPTY_EDIT_FORM: EditFormState = {
  code: '',
  valueType: 'string',
  value: '',
  valueNumber: '',
  address: '',
};

function SettingsContent() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [type, setType] =
    useState<DataSettingType>('department');

  const [rows, setRows] =
    useState<Setting[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [form, setForm] =
    useState<FormState>(EMPTY_FORM);

  const [page, setPage] =
    useState(1);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [editForm, setEditForm] =
    useState<EditFormState>(EMPTY_EDIT_FORM);

  const [savingEdit, setSavingEdit] =
    useState(false);

  async function load(forType: DataSettingType) {
    setLoading(true);
    setError('');

    try {
      const data = await SettingsApi.list(
        forType as SettingType,
      );

      setRows(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر تحميل الإعدادات.'
            : 'Could not load settings.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(type);

    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditForm(EMPTY_EDIT_FORM);
    setPage(1);
  }, [type]);

  /*
   * Only show records that have data in the
   * currently selected website language.
   *
   * English mode:
   * codeEn must exist.
   *
   * Arabic mode:
   * codeAr must exist.
   */
  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (isArabic) {
        return Boolean(row.codeAr?.trim());
      }

      return Boolean(row.codeEn?.trim());
    });
  }, [rows, isArabic]);

  const totalPages = Math.max(
    Math.ceil(visibleRows.length / PAGE_SIZE),
    1,
  );

  const pagedRows = visibleRows.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /*
   * -------------------------------------------------------
   * CREATE
   * -------------------------------------------------------
   */
  async function createRow(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError('');

    const trimmedCode = form.code.trim();

    if (!trimmedCode) {
      setError(
        isArabic
          ? 'يرجى إدخال الرمز.'
          : 'Please enter the code.',
      );

      return;
    }

    /*
     * Validate String value.
     */
    if (
      form.valueType === 'string' &&
      !form.value.trim()
    ) {
      setError(
        isArabic
          ? 'يرجى إدخال القيمة.'
          : 'Please enter the value.',
      );

      return;
    }

    /*
     * Validate Integer value.
     */
    if (
      form.valueType === 'number' &&
      form.valueNumber.trim() === ''
    ) {
      setError(
        isArabic
          ? 'يرجى إدخال الرقم.'
          : 'Please enter the integer value.',
      );

      return;
    }

    if (
      form.valueType === 'number' &&
      !Number.isInteger(Number(form.valueNumber))
    ) {
      setError(
        isArabic
          ? 'يجب أن تكون القيمة رقماً صحيحاً.'
          : 'The value must be an integer.',
      );

      return;
    }

    const payload: CreateSettingPayload = {
      type,

      valueType: form.valueType,

      /*
       * Save the code only in the current language.
       */
      ...(isArabic
        ? {
            codeAr: trimmedCode,
          }
        : {
            codeEn: trimmedCode,
          }),

      /*
       * String value:
       * save only in the current language.
       */
      ...(form.valueType === 'string'
        ? isArabic
          ? {
              valueAr: form.value.trim(),
            }
          : {
              valueEn: form.value.trim(),
            }
        : {
            /*
             * Number is language-independent.
             */
            valueNumber: Number(form.valueNumber),
          }),

      /*
       * Branch-only field.
       */
      ...(type === 'branch'
        ? {
            address:
              form.address.trim() || undefined,
          }
        : {}),
    };

    try {
      await SettingsApi.create(payload);

      setForm(EMPTY_FORM);

      await load(type);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر إضافة السجل.'
            : 'Could not create the row.',
      );
    }
  }

  /*
   * -------------------------------------------------------
   * START EDIT
   * -------------------------------------------------------
   */
  function startEdit(row: Setting) {
    setError('');

    setEditingId(row.id);

    setEditForm({
      code: isArabic
        ? row.codeAr ?? ''
        : row.codeEn ?? '',

      valueType:
        row.valueType ?? 'string',

      value:
        row.valueType === 'string'
          ? isArabic
            ? row.valueAr ?? ''
            : row.valueEn ?? ''
          : '',

      valueNumber:
        row.valueType === 'number' &&
        row.valueNumber !== undefined &&
        row.valueNumber !== null
          ? String(row.valueNumber)
          : '',

      address:
        row.address ?? '',
    });
  }

  /*
   * -------------------------------------------------------
   * CANCEL EDIT
   * -------------------------------------------------------
   */
  function cancelEdit() {
    setEditingId(null);
    setEditForm(EMPTY_EDIT_FORM);
    setError('');
  }

  /*
   * -------------------------------------------------------
   * SAVE EDIT
   * -------------------------------------------------------
   */
  async function saveEdit(row: Setting) {
    const trimmedCode =
      editForm.code.trim();

    if (!trimmedCode) {
      setError(
        isArabic
          ? 'يرجى إدخال الرمز.'
          : 'Please enter the code.',
      );

      return;
    }

    if (
      editForm.valueType === 'string' &&
      !editForm.value.trim()
    ) {
      setError(
        isArabic
          ? 'يرجى إدخال القيمة.'
          : 'Please enter the value.',
      );

      return;
    }

    if (
      editForm.valueType === 'number' &&
      editForm.valueNumber.trim() === ''
    ) {
      setError(
        isArabic
          ? 'يرجى إدخال الرقم.'
          : 'Please enter the integer value.',
      );

      return;
    }

    if (
      editForm.valueType === 'number' &&
      !Number.isInteger(
        Number(editForm.valueNumber),
      )
    ) {
      setError(
        isArabic
          ? 'يجب أن تكون القيمة رقماً صحيحاً.'
          : 'The value must be an integer.',
      );

      return;
    }

    setSavingEdit(true);
    setError('');

    try {
      await SettingsApi.update(
        row.id,
        {
          valueType:
            editForm.valueType,

          /*
           * Edit only the currently active language.
           */
          ...(isArabic
            ? {
                codeAr:
                  trimmedCode,
              }
            : {
                codeEn:
                  trimmedCode,
              }),

          /*
           * String:
           * edit only current-language value.
           *
           * Integer:
           * update shared numeric value.
           */
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

          /*
           * Branch-only field.
           */
          ...(type === 'branch'
            ? {
                address:
                  editForm.address.trim() ||
                  undefined,
              }
            : {}),
        },
      );

      setEditingId(null);
      setEditForm(EMPTY_EDIT_FORM);

      await load(type);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر تحديث السجل.'
            : 'Could not update the row.',
      );
    } finally {
      setSavingEdit(false);
    }
  }

  /*
   * -------------------------------------------------------
   * ACTIVATE / DEACTIVATE
   * -------------------------------------------------------
   */
  async function toggleActive(row: Setting) {
    setError('');

    try {
      await SettingsApi.update(
        row.id,
        {
          isActive:
            !row.isActive,
        },
      );

      await load(type);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر تحديث السجل.'
            : 'Could not update the row.',
      );
    }
  }

  /*
   * -------------------------------------------------------
   * DELETE
   * -------------------------------------------------------
   */
  async function remove(row: Setting) {
    setError('');

    try {
      await SettingsApi.remove(row.id);

      if (editingId === row.id) {
        setEditingId(null);
        setEditForm(EMPTY_EDIT_FORM);
      }

      await load(type);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isArabic
            ? 'تعذر حذف السجل.'
            : 'Could not remove the row.',
      );
    }
  }

  const selectedTypeLabel =
    type === 'department'
      ? isArabic
        ? 'قسم'
        : 'Department'
      : isArabic
        ? 'فرع'
        : 'Branch';

  return (
    <div
      className="space-y-6"
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {/*
       * =====================================================
       * TYPE SELECTOR
       * =====================================================
       */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="label mb-0">
            {isArabic
              ? 'النوع'
              : 'Type'}
          </label>

          <select
            className="input w-56"
            value={type}
            onChange={(event) => {
              setType(
                event.target
                  .value as DataSettingType,
              );
            }}
          >
            {TYPE_OPTIONS.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {isArabic
                    ? option.labelAr
                    : option.labelEn}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/*
       * =====================================================
       * CREATE FORM
       * =====================================================
       */}
      <form
        onSubmit={createRow}
        className="card space-y-5 p-6"
      >
        <div>
          <h2 className="text-base font-semibold">
            {isArabic
              ? `إضافة ${selectedTypeLabel}`
              : `Add ${selectedTypeLabel}`}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isArabic
              ? 'سيتم حفظ النص باللغة العربية فقط.'
              : 'The text will be saved in English only.'}
          </p>
        </div>

        {/*
         * CODE
         */}
        <div>
          <label className="label">
            {isArabic
              ? 'الرمز'
              : 'Code'}
          </label>

          <input
            className="input"
            required
            dir={isArabic ? 'rtl' : 'ltr'}
            value={form.code}
            onChange={(event) => {
              setForm({
                ...form,
                code:
                  event.target.value,
              });
            }}
          />
        </div>

        {/*
         * VALUE TYPE
         */}
        <div>
          <label className="label">
            {isArabic
              ? 'نوع القيمة'
              : 'Value Type'}
          </label>

          <select
            className="input w-full sm:w-56"
            value={form.valueType}
            onChange={(event) => {
              const nextType =
                event.target
                  .value as SettingValueType;

              setForm({
                ...form,
                valueType: nextType,

                /*
                 * Clear the other value when switching type.
                 */
                value:
                  nextType === 'string'
                    ? form.value
                    : '',

                valueNumber:
                  nextType === 'number'
                    ? form.valueNumber
                    : '',
              });
            }}
          >
            <option value="string">
              {isArabic
                ? 'نص'
                : 'String'}
            </option>

            <option value="number">
              {isArabic
                ? 'عدد صحيح'
                : 'Integer'}
            </option>
          </select>
        </div>

        {/*
         * STRING VALUE
         */}
        {form.valueType === 'string' && (
          <div>
            <label className="label">
              {isArabic
                ? 'القيمة'
                : 'Value'}
            </label>

            <input
              className="input"
              required
              dir={isArabic ? 'rtl' : 'ltr'}
              value={form.value}
              onChange={(event) => {
                setForm({
                  ...form,
                  value:
                    event.target.value,
                });
              }}
            />
          </div>
        )}

        {/*
         * INTEGER VALUE
         */}
        {form.valueType === 'number' && (
          <div>
            <label className="label">
              {isArabic
                ? 'القيمة الرقمية'
                : 'Integer Value'}
            </label>

            <input
              type="number"
              step="1"
              className="input"
              required
              value={form.valueNumber}
              onChange={(event) => {
                setForm({
                  ...form,
                  valueNumber:
                    event.target.value,
                });
              }}
            />
          </div>
        )}

        {/*
         * BRANCH ADDRESS
         */}
        {type === 'branch' && (
          <div>
            <label className="label">
              {isArabic
                ? 'العنوان (اختياري)'
                : 'Address (optional)'}
            </label>

            <input
              className="input"
              value={form.address}
              onChange={(event) => {
                setForm({
                  ...form,
                  address:
                    event.target.value,
                });
              }}
            />
          </div>
        )}

        <div>
          <button
            type="submit"
            className="btn-primary"
          >
            {isArabic
              ? `إضافة ${selectedTypeLabel}`
              : `Add ${selectedTypeLabel}`}
          </button>
        </div>
      </form>

      {/*
       * ERROR MESSAGE
       */}
      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      {/*
       * =====================================================
       * TABLE
       * =====================================================
       */}
      <div className="card overflow-x-auto">
        {loading ? (
          <p className="p-6 text-center text-slate-500">
            {isArabic
              ? 'جاري التحميل…'
              : 'Loading…'}
          </p>
        ) : visibleRows.length === 0 ? (
          <p className="p-6 text-center text-slate-500">
            {isArabic
              ? type === 'department'
                ? 'لا توجد أقسام باللغة العربية.'
                : 'لا توجد فروع باللغة العربية.'
              : type === 'department'
                ? 'No English departments yet.'
                : 'No English branches yet.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-start">
                  {isArabic
                    ? 'الرمز'
                    : 'Code'}
                </th>

                <th className="px-4 py-3 text-start">
                  {isArabic
                    ? 'نوع القيمة'
                    : 'Value Type'}
                </th>

                <th className="px-4 py-3 text-start">
                  {isArabic
                    ? 'القيمة'
                    : 'Value'}
                </th>

                {type === 'branch' && (
                  <th className="px-4 py-3 text-start">
                    {isArabic
                      ? 'العنوان'
                      : 'Address'}
                  </th>
                )}

                <th className="px-4 py-3 text-start">
                  {isArabic
                    ? 'الحالة'
                    : 'Status'}
                </th>

                <th className="px-4 py-3 text-end">
                  {isArabic
                    ? 'الإجراءات'
                    : 'Actions'}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((row) => {
                const isEditing =
                  editingId === row.id;

                /*
                 * ============================================
                 * EDIT MODE
                 * ============================================
                 */
                if (isEditing) {
                  return (
                    <tr
                      key={row.id}
                      className="align-top"
                    >
                      {/*
                       * CODE
                       */}
                      <td className="px-4 py-3">
                        <input
                          className="input min-w-[160px]"
                          dir={
                            isArabic
                              ? 'rtl'
                              : 'ltr'
                          }
                          value={editForm.code}
                          onChange={(event) => {
                            setEditForm({
                              ...editForm,
                              code:
                                event.target.value,
                            });
                          }}
                        />
                      </td>

                      {/*
                       * VALUE TYPE
                       */}
                      <td className="px-4 py-3">
                        <select
                          className="input min-w-[140px]"
                          value={
                            editForm.valueType
                          }
                          onChange={(event) => {
                            const nextType =
                              event.target
                                .value as SettingValueType;

                            setEditForm({
                              ...editForm,

                              valueType:
                                nextType,

                              value:
                                nextType === 'string'
                                  ? editForm.value
                                  : '',

                              valueNumber:
                                nextType === 'number'
                                  ? editForm.valueNumber
                                  : '',
                            });
                          }}
                        >
                          <option value="string">
                            {isArabic
                              ? 'نص'
                              : 'String'}
                          </option>

                          <option value="number">
                            {isArabic
                              ? 'عدد صحيح'
                              : 'Integer'}
                          </option>
                        </select>
                      </td>

                      {/*
                       * VALUE
                       */}
                      <td className="px-4 py-3">
                        {editForm.valueType ===
                        'string' ? (
                          <input
                            className="input min-w-[180px]"
                            dir={
                              isArabic
                                ? 'rtl'
                                : 'ltr'
                            }
                            value={
                              editForm.value
                            }
                            onChange={(event) => {
                              setEditForm({
                                ...editForm,
                                value:
                                  event.target
                                    .value,
                              });
                            }}
                          />
                        ) : (
                          <input
                            type="number"
                            step="1"
                            className="input min-w-[150px]"
                            value={
                              editForm.valueNumber
                            }
                            onChange={(event) => {
                              setEditForm({
                                ...editForm,
                                valueNumber:
                                  event.target
                                    .value,
                              });
                            }}
                          />
                        )}
                      </td>

                      {/*
                       * BRANCH ADDRESS
                       */}
                      {type === 'branch' && (
                        <td className="px-4 py-3">
                          <input
                            className="input min-w-[180px]"
                            value={
                              editForm.address
                            }
                            onChange={(event) => {
                              setEditForm({
                                ...editForm,
                                address:
                                  event.target
                                    .value,
                              });
                            }}
                          />
                        </td>
                      )}

                      {/*
                       * STATUS
                       */}
                      <td className="px-4 py-3">
                        {row.isActive ? (
                          <span className="badge bg-green-100 text-green-700">
                            {isArabic
                              ? 'نشط'
                              : 'Active'}
                          </span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-500">
                            {isArabic
                              ? 'غير نشط'
                              : 'Inactive'}
                          </span>
                        )}
                      </td>

                      {/*
                       * EDIT ACTIONS
                       */}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={savingEdit}
                            onClick={() => {
                              saveEdit(row);
                            }}
                          >
                            {savingEdit
                              ? isArabic
                                ? 'جاري الحفظ…'
                                : 'Saving…'
                              : isArabic
                                ? 'حفظ'
                                : 'Save'}
                          </button>

                          <button
                            type="button"
                            className="btn-secondary"
                            disabled={savingEdit}
                            onClick={cancelEdit}
                          >
                            {isArabic
                              ? 'إلغاء'
                              : 'Cancel'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                /*
                 * ============================================
                 * NORMAL ROW
                 * ============================================
                 */
                return (
                  <tr key={row.id}>
                    {/*
                     * CODE
                     */}
                    <td
                      className="px-4 py-3"
                      dir={
                        isArabic
                          ? 'rtl'
                          : 'ltr'
                      }
                    >
                      {isArabic
                        ? row.codeAr
                        : row.codeEn}
                    </td>

                    {/*
                     * VALUE TYPE
                     */}
                    <td className="px-4 py-3">
                      {row.valueType ===
                      'number'
                        ? isArabic
                          ? 'عدد صحيح'
                          : 'Integer'
                        : isArabic
                          ? 'نص'
                          : 'String'}
                    </td>

                    {/*
                     * VALUE
                     */}
                    <td
                      className="px-4 py-3"
                      dir={
                        row.valueType === 'string'
                          ? isArabic
                            ? 'rtl'
                            : 'ltr'
                          : 'ltr'
                      }
                    >
                      {row.valueType ===
                      'number'
                        ? row.valueNumber
                        : isArabic
                          ? row.valueAr
                          : row.valueEn}
                    </td>

                    {/*
                     * BRANCH ADDRESS
                     */}
                    {type === 'branch' && (
                      <td className="px-4 py-3">
                        {row.address || '—'}
                      </td>
                    )}

                    {/*
                     * STATUS
                     */}
                    <td className="px-4 py-3">
                      {row.isActive ? (
                        <span className="badge bg-green-100 text-green-700">
                          {isArabic
                            ? 'نشط'
                            : 'Active'}
                        </span>
                      ) : (
                        <span className="badge bg-slate-100 text-slate-500">
                          {isArabic
                            ? 'غير نشط'
                            : 'Inactive'}
                        </span>
                      )}
                    </td>

                    {/*
                     * ACTIONS
                     */}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            startEdit(row);
                          }}
                        >
                          {isArabic
                            ? 'تعديل'
                            : 'Edit'}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => {
                            toggleActive(row);
                          }}
                        >
                          {row.isActive
                            ? isArabic
                              ? 'تعطيل'
                              : 'Deactivate'
                            : isArabic
                              ? 'تفعيل'
                              : 'Activate'}
                        </button>

                        <button
                          type="button"
                          className="btn-secondary text-red-600"
                          onClick={() => {
                            remove(row);
                          }}
                        >
                          {isArabic
                            ? 'حذف'
                            : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/*
       * PAGINATION
       */}
      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={visibleRows.length}
          onPageChange={setPage}
          itemLabel={
            type === 'department'
              ? isArabic
                ? 'أقسام'
                : 'departments'
              : isArabic
                ? 'فروع'
                : 'branches'
          }
        />
      )}
    </div>
  );
}

/*
 * =========================================================
 * SETTINGS TABS
 * =========================================================
 */
const PAGE_TABS = [
  {
    value: 'data',
    label: 'Data',
  },

  {
    value: 'branding',
    label: 'Branding',
  },

  {
    value: 'color-theme',
    label: 'Color Theme',
  },

  {
    value: 'lists',
    label: 'Statuses & Types',
  },
] as const;

type PageTab =
  (typeof PAGE_TABS)[number]['value'];

function SettingsPageContent() {
  const locale = useLocale();
  const isArabic = locale === 'ar';

  const [tab, setTab] =
    useState<PageTab>('data');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">
        {isArabic
          ? 'الإعدادات'
          : 'Settings'}
      </h1>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {PAGE_TABS.map((item) => {
          /*
           * Explicit string type avoids TypeScript trying
           * to restrict this variable to only the English
           * literal labels from PAGE_TABS.
           */
          let label: string = item.label;

          if (isArabic) {
            if (item.value === 'data') {
              label = 'البيانات';
            }

            if (item.value === 'branding') {
              label = 'الهوية';
            }

            if (
              item.value ===
              'color-theme'
            ) {
              label = 'ألوان الموقع';
            }

            if (item.value === 'lists') {
              label =
                'الحالات والأنواع';
            }
          }

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setTab(item.value);
              }}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === item.value
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === 'data' && (
        <SettingsContent />
      )}

      {tab === 'branding' && (
        <BrandingTab />
      )}

      {tab === 'color-theme' && (
        <ColorThemeTab />
      )}

      {tab === 'lists' && (
        <ListSettingsTab />
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute adminOnly>
      <SettingsPageContent />
    </ProtectedRoute>
  );
}