// International digits including the country calling code — mirrors the
// @IsPhoneNumber12() (backend/src/common/validators/
// is-phone-number.decorator.ts). Keep the two in sync if this ever changes.
export const PHONE_NUMBER_REGEX = /^\d{8,15}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_NUMBER_REGEX.test(phone);
}

export const PHONE_VALIDATION_MESSAGE = 'Enter 8 to 15 digits including the country code.';
