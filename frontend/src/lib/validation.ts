// Digits only, exactly 12, any prefix — mirrors the backend's
// @IsPhoneNumber12() (backend/src/common/validators/
// is-phone-number.decorator.ts). Keep the two in sync if this ever changes.
export const PHONE_NUMBER_REGEX = /^\d{12}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_NUMBER_REGEX.test(phone);
}

export const PHONE_VALIDATION_MESSAGE = 'Enter a valid 12-digit phone number, numbers only.';