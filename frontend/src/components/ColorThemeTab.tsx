'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  DEFAULT_THEME,
  type ThemeColors,
  useTheme,
} from '@/lib/theme-context';
import { useLocale } from 'next-intl';
import { uiText, type GeneratedKey } from '@/lib/ui-text';

type ColorFieldDefinition = {
  key: keyof ThemeColors;
  labelKey: GeneratedKey;
  descriptionKey: GeneratedKey;
};

const COLOR_FIELDS: ColorFieldDefinition[] = [
  {
    key: 'primary',
    labelKey: 'text0986',
    descriptionKey: 'text0987',
  },

  {
    key: 'primaryText',
    labelKey: 'text0988',
    descriptionKey: 'text0989',
  },

  {
    key: 'pageBackground',
    labelKey: 'text0990',
    descriptionKey: 'text0991',
  },

  {
    key: 'surface',
    labelKey: 'text0992',
    descriptionKey: 'text0993',
  },

  {
    key: 'bodyText',
    labelKey: 'text0994',
    descriptionKey: 'text0995',
  },
];

function isValidHex(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

function ColorField({
  field,
  value,
  onChange,
  isArabic,
}: {
  field: ColorFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  isArabic: boolean;
}) {
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  function commitTypedColor() {
    const cleanedValue = inputValue.trim();

    if (!isValidHex(cleanedValue)) {
      setInputValue(value);
      return;
    }

    const normalized = cleanedValue.toLowerCase();

    setInputValue(normalized);
    onChange(normalized);
  }

  return (
    <div>
      <label className="label uppercase tracking-wide">
        {uiText(isArabic, field.labelKey)}
      </label>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          aria-label={uiText(isArabic, field.labelKey)}
          onChange={(event) => {
            const nextColor = event.target.value;

            setInputValue(nextColor);
            onChange(nextColor);
          }}
          className="h-[62px] w-[88px] shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-transparent p-1"
        />

        <input
          type="text"
          value={inputValue}
          maxLength={7}
          spellCheck={false}
          className="input h-[62px] font-mono text-base font-semibold"
          onChange={(event) => {
            setInputValue(event.target.value);
          }}
          onBlur={commitTypedColor}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();

              commitTypedColor();

              event.currentTarget.blur();
            }

            if (event.key === 'Escape') {
              setInputValue(value);

              event.currentTarget.blur();
            }
          }}
        />
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {uiText(isArabic, field.descriptionKey)}
      </p>
    </div>
  );
}

export default function ColorThemeTab() {
  const isArabic = useLocale() === 'ar';
  /*
   * "colors" = the SAVED website theme.
   *
   * We do not modify this when the user is only experimenting
   * with colors in the settings page.
   */
  const {
    colors,
    setColors,
  } = useTheme();

  /*
   * "draftColors" = temporary colors.
   *
   * These are used only by the Live Preview until Save Theme
   * is clicked.
   */
  const [draftColors, setDraftColors] =
    useState<ThemeColors>(colors);

  const [savedMessage, setSavedMessage] =
    useState(false);

  /*
   * If the saved theme is loaded from localStorage after the
   * component mounts, copy it into the draft form.
   */
  useEffect(() => {
    setDraftColors(colors);
  }, [colors]);

  /*
   * Returns true when the preview contains changes that have
   * not been saved to the website yet.
   */
  const hasChanges =
    draftColors.primary !== colors.primary ||
    draftColors.primaryText !== colors.primaryText ||
    draftColors.pageBackground !== colors.pageBackground ||
    draftColors.surface !== colors.surface ||
    draftColors.bodyText !== colors.bodyText;

  function changeDraftColor(
    key: keyof ThemeColors,
    value: string,
  ) {
    /*
     * IMPORTANT:
     *
     * We only change draftColors here.
     *
     * We intentionally DO NOT call updateColor().
     *
     * That means the website itself will not change while
     * somebody is experimenting with the color picker.
     */
    setDraftColors((current) => ({
      ...current,
      [key]: value,
    }));

    setSavedMessage(false);
  }

  function handleReset() {
    /*
     * Reset only the PREVIEW.
     *
     * The website remains unchanged until Save Theme is clicked.
     */
    setDraftColors({
      ...DEFAULT_THEME,
    });

    setSavedMessage(false);
  }

  function handleCancel() {
    /*
     * Throw away unsaved changes and return the preview
     * to the currently saved website theme.
     */
    setDraftColors({
      ...colors,
    });

    setSavedMessage(false);
  }

  function handleSave() {
    /*
     * This is the only place where we update the actual
     * website theme.
     *
     * setColors():
     * 1. updates the ThemeProvider
     * 2. updates the CSS variables
     * 3. applies the colors across the website
     * 4. stores them in localStorage
     */
    setColors({
      ...draftColors,
    });

    setSavedMessage(true);

    window.setTimeout(() => {
      setSavedMessage(false);
    }, 2500);
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        {/* Header */}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {uiText(isArabic, 'text0970')}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {uiText(isArabic, 'text0971')}
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={handleReset}
          >
            {uiText(isArabic, 'text0837')}
          </button>
        </div>

        {/* Color fields */}

        <div className="grid grid-cols-1 gap-x-10 gap-y-9 md:grid-cols-2 xl:grid-cols-3">
          {COLOR_FIELDS.map((field) => (
            <ColorField
              key={field.key}
              field={field}
              isArabic={isArabic}
              value={draftColors[field.key]}
              onChange={(nextColor) =>
                changeDraftColor(
                  field.key,
                  nextColor,
                )
              }
            />
          ))}
        </div>

        {/* Live Preview */}

        <div className="mt-10">
          <div className="mb-3">
            <h3 className="text-base font-semibold">
              {uiText(isArabic, 'text0972')}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              {uiText(isArabic, 'text0973')}
            </p>
          </div>

          <div
            className="rounded-xl border border-slate-200 p-6 transition-colors"
            style={{
              backgroundColor:
                draftColors.pageBackground,
            }}
          >
            <div
              className="rounded-lg border border-slate-200 p-6 shadow-sm transition-colors"
              style={{
                backgroundColor:
                  draftColors.surface,

                color:
                  draftColors.bodyText,
              }}
            >
              <h3
                className="text-lg font-semibold"
                style={{
                  color:
                    draftColors.bodyText,
                }}
              >
                {uiText(isArabic, 'text0974')}
              </h3>

              <p
                className="mt-3"
                style={{
                  color:
                    draftColors.bodyText,
                }}
              >
                {uiText(isArabic, 'text0975')}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor:
                      draftColors.primary,

                    color:
                      draftColors.primaryText,
                  }}
                >
                  {uiText(isArabic, 'text0976')}
                </button>

                <div
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm"
                  style={{
                    backgroundColor:
                      draftColors.surface,

                    color:
                      draftColors.bodyText,
                  }}
                >
                  {uiText(isArabic, 'text0977')}
                </div>
              </div>

              {/* Extra preview content */}

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div
                  className="rounded-lg border border-slate-200 p-4"
                  style={{
                    backgroundColor:
                      draftColors.surface,

                    color:
                      draftColors.bodyText,
                  }}
                >
                  <p className="font-medium">
                    {uiText(isArabic, 'text0978')}
                  </p>

                  <p
                    className="mt-1 text-sm"
                    style={{
                      color:
                        draftColors.bodyText,
                    }}
                  >
                    {uiText(isArabic, 'text0979')}
                  </p>
                </div>

                <div
                  className="rounded-lg border border-slate-200 p-4"
                  style={{
                    backgroundColor:
                      draftColors.surface,

                    color:
                      draftColors.bodyText,
                  }}
                >
                  <label
                    className="mb-1 block text-sm font-medium"
                    style={{
                      color:
                        draftColors.bodyText,
                    }}
                  >
                    {uiText(isArabic, 'text0980')}
                  </label>

                  <input
                    type="text"
                    readOnly
                    value={uiText(isArabic, 'text0980')}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    style={{
                      backgroundColor:
                        draftColors.surface,

                      color:
                        draftColors.bodyText,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save section */}

        <div className="mt-8 border-t border-slate-200 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              className="btn-primary"
              disabled={!hasChanges}
              onClick={handleSave}
            >
              {uiText(isArabic, 'text0981')}
            </button>

            {hasChanges && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancel}
              >
                {uiText(isArabic, 'text0982')}
              </button>
            )}

            {savedMessage && (
              <span className="text-sm font-medium text-green-600">
                {uiText(isArabic, 'text0983')}
              </span>
            )}

            {!hasChanges && !savedMessage && (
              <span className="text-sm text-slate-500">
                {uiText(isArabic, 'text0984')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
