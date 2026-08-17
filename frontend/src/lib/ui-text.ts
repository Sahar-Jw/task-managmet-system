import arMessages from '@/i18n/messages/ar.json';
import enMessages from '@/i18n/messages/en.json';

type GeneratedKey = keyof typeof enMessages.generatedUi;

type DictionaryOverride = {
  textEn: string;
  textAr: string;
};

let runtimeOverrides: Record<string, DictionaryOverride> = {};

export function setUiTextOverrides(
  overrides: Record<string, DictionaryOverride>,
) {
  runtimeOverrides = overrides;
}

/** Catalog-backed text for non-hook helpers and legacy components during migration. */
export function uiText(
  isArabic: boolean,
  key: GeneratedKey,
  values: Record<string, string | number> = {},
): string {
  const override = runtimeOverrides[`generatedUi.${key}`];
  const catalog = isArabic ? arMessages.generatedUi : enMessages.generatedUi;
  const template =
    (isArabic ? override?.textAr : override?.textEn) ||
    catalog[key] ||
    enMessages.generatedUi[key] ||
    key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
