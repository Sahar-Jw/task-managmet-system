import arMessages from '@/i18n/messages/ar.json';
import enMessages from '@/i18n/messages/en.json';

type GeneratedKey = keyof typeof enMessages.generatedUi;

/** Catalog-backed text for non-hook helpers and legacy components during migration. */
export function uiText(
  isArabic: boolean,
  key: GeneratedKey,
  values: Record<string, string | number> = {},
): string {
  const catalog = isArabic ? arMessages.generatedUi : enMessages.generatedUi;
  const template = catalog[key] ?? enMessages.generatedUi[key] ?? key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}
