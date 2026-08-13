// Digits only, exactly 10, and must start with "09" — mirrors the
// backend's @IsPhoneNumber10() (backend/src/common/validators/
// is-phone-number.decorator.ts). Keep the two in sync if this ever changes.
export const PHONE_NUMBER_REGEX = /^09\d{8}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_NUMBER_REGEX.test(phone);
}

export const PHONE_VALIDATION_MESSAGE =
  'Enter a valid 10-digit phone number starting with 09, numbers only.';