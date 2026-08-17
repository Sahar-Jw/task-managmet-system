'use client';

import { uiText } from '@/lib/ui-text';


import {
  useEffect,
  useState,
} from 'react';

import {
  useLocale,
} from 'next-intl';

import {
  ApiError,
} from '@/lib/api';

import {
  TaskWorkflowApi,
} from '@/lib/endpoints';

import type {
  TaskWorkflowAction,
  TaskWorkflowConfig,
  TaskWorkflowMode,
} from '@/lib/types';


function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked:
    boolean;

  disabled?:
    boolean;

  onChange:
    (
      value:
        boolean,
    ) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={
        checked
      }
      disabled={
        disabled
      }
      onClick={() =>
        onChange(
          !checked,
        )
      }
      className={`
        relative
        inline-flex
        h-7
        w-12
        shrink-0
        items-center
        rounded-full
        transition
        disabled:cursor-not-allowed
        disabled:opacity-40
        ${
          checked
            ? 'bg-brand-600'
            : 'bg-slate-200'
        }
      `}
    >
      <span
        className={`
          absolute
          top-1
          h-5
          w-5
          rounded-full
          bg-white
          shadow-sm
          transition-all
          ${
            checked
              ? 'end-1'
              : 'start-1'
          }
        `}
      />
    </button>
  );
}


export default function WorkflowSettingsTab() {
  const locale =
    useLocale();


  const isArabic =
    locale ===
    'ar';


  const [
    config,
    setConfig,
  ] =
    useState<TaskWorkflowConfig | null>(
      null,
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


  async function load() {
    setLoading(
      true,
    );

    setError('');


    try {
      const result =
        await TaskWorkflowApi.get();


      setConfig(
        result,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0670'),
      );
    } finally {
      setLoading(
        false,
      );
    }
  }


  useEffect(() => {
    load();
  }, []);


  function setMode(
    mode:
      TaskWorkflowMode,
  ) {
    setSaved(
      false,
    );


    setConfig(
      (
        current,
      ) =>
        current
          ? {
              ...current,
              mode,
            }
          : current,
    );
  }


  function setEnabled(
    key:
      string,

    enabled:
      boolean,
  ) {
    setSaved(
      false,
    );


    setConfig(
      (
        current,
      ) => {
        if (
          !current
        ) {
          return current;
        }


        return {
          ...current,

          actions:
            current.actions.map(
              (
                action,
              ) =>
                action.key ===
                key
                  ? {
                      ...action,

                      enabled,
                    }
                  : action,
            ),
        };
      },
    );
  }


  function move(
    index:
      number,

    direction:
      -1 | 1,
  ) {
    if (
      !config
    ) {
      return;
    }


    const targetIndex =
      index +
      direction;


    if (
      targetIndex <
        0 ||
      targetIndex >=
        config.actions.length
    ) {
      return;
    }


    const actions =
      [
        ...config.actions,
      ];


    const temporary =
      actions[index];


    actions[index] =
      actions[targetIndex];


    actions[targetIndex] =
      temporary;


    actions.forEach(
      (
        action,
        actionIndex,
      ) => {
        action.order =
          actionIndex +
          1;
      },
    );


    setSaved(
      false,
    );


    setConfig({
      ...config,

      actions:
        actions,
    });
  }


  async function save() {
    if (
      !config
    ) {
      return;
    }


    setSaving(
      true,
    );

    setError('');
    setSaved(
      false,
    );


    try {
      const result =
        await TaskWorkflowApi.update({
          mode:
            config.mode,

          actions:
            config.actions.map(
              (
                action,
                index,
              ) => ({
                key:
                  action.key,

                enabled:
                  action.enabled,

                order:
                  index +
                  1,
              }),
            ),
        });


      setConfig(
        result,
      );

      setSaved(
        true,
      );
    } catch (
      err
    ) {
      setError(
        err instanceof
          ApiError
          ? err.message
          : uiText(isArabic, 'text0671'),
      );
    } finally {
      setSaving(
        false,
      );
    }
  }


  if (
    loading
  ) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        {uiText(isArabic, 'text0672')}
      </div>
    );
  }


  if (
    !config
  ) {
    return (
      <div className="card p-8 text-center text-red-600">
        {error ||
          'Workflow unavailable'}
      </div>
    );
  }


  return (
    <div className="space-y-5">
      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 p-6">
          <div className="text-xs font-semibold uppercase tracking-[.12em] text-brand-600">
            {uiText(isArabic, 'text0502')}
          </div>


          <h2 className="mt-1 text-xl font-semibold text-slate-900">
            {uiText(isArabic, 'text0673')}
          </h2>


          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {uiText(isArabic, 'text0674')}
          </p>
        </div>


        <div className="p-6">
          <div className="text-sm font-semibold text-slate-800">
            {uiText(isArabic, 'text0675')}
          </div>


          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setMode(
                  'all_available',
                )
              }
              className={`
                rounded-xl
                border
                p-4
                text-start
                transition
                ${
                  config.mode ===
                  'all_available'
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="font-semibold text-slate-800">
                {uiText(isArabic, 'text0263')}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {uiText(isArabic, 'text0676')}
              </p>
            </button>


            <button
              type="button"
              onClick={() =>
                setMode(
                  'guided',
                )
              }
              className={`
                rounded-xl
                border
                p-4
                text-start
                transition
                ${
                  config.mode ===
                  'guided'
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="font-semibold text-slate-800">
                {uiText(isArabic, 'text0135')}
              </div>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {uiText(isArabic, 'text0677')}
              </p>
            </button>
          </div>
        </div>
      </section>


      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/60 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                {uiText(isArabic, 'text0678')}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {uiText(isArabic, 'text0679')}
              </p>
            </div>


            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500">
              {config.actions.filter(
                (
                  action,
                ) =>
                  action.enabled,
              ).length}{' '}
              {uiText(isArabic, 'text0264')}
            </div>
          </div>
        </div>


        <div className="divide-y divide-slate-100">
          {config.actions.map(
            (
              action:
                TaskWorkflowAction,

              index,
            ) => {
              const start =
                action.key ===
                'start';


              return (
                <div
                  key={
                    action.key
                  }
                  className={`
                    flex
                    flex-col
                    gap-4
                    p-5
                    sm:flex-row
                    sm:items-center
                    ${
                      action.enabled
                        ? 'bg-white'
                        : 'bg-slate-50 opacity-65'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                      {index +
                        1}
                    </div>


                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        disabled={
                          index ===
                          0
                        }
                        onClick={() =>
                          move(
                            index,
                            -1,
                          )
                        }
                        className="flex h-6 w-7 items-center justify-center rounded border border-slate-200 text-xs text-slate-500 disabled:opacity-20"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        disabled={
                          index ===
                          config.actions.length -
                            1
                        }
                        onClick={() =>
                          move(
                            index,
                            1,
                          )
                        }
                        className="flex h-6 w-7 items-center justify-center rounded border border-slate-200 text-xs text-slate-500 disabled:opacity-20"
                      >
                        ↓
                      </button>
                    </div>
                  </div>


                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-800">
                      {isArabic
                        ? action.labelAr
                        : action.labelEn}
                    </div>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {isArabic
                        ? action.descriptionAr
                        : action.descriptionEn}
                    </p>

                    {start && (
                      <div className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                        {uiText(isArabic, 'text0680')}
                      </div>
                    )}
                  </div>


                  <Toggle
                    checked={
                      action.enabled
                    }
                    disabled={
                      start
                    }
                    onChange={(
                      enabled,
                    ) =>
                      setEnabled(
                        action.key,
                        enabled,
                      )
                    }
                  />
                </div>
              );
            },
          )}
        </div>
      </section>


      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      {saved && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {uiText(isArabic, 'text0681')}
        </div>
      )}


      <div className="flex justify-end">
        <button
          type="button"
          className="btn-primary"
          disabled={
            saving
          }
          onClick={
            save
          }
        >
          {saving
            ? uiText(isArabic, 'text0081')
            : uiText(isArabic, 'text0682')}
        </button>
      </div>
    </div>
  );
}
