import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

// International digits including the country calling code, without + or
// 00. E.164 numbers contain at most 15 digits; eight is a practical minimum.
export const PHONE_NUMBER_REGEX = /^\d{8,15}$/;

// @IsOptional() only skips validation for undefined/null, not an empty
// string — and the profile form submits '' on purpose when someone clears
// their phone number to remove it. So the validator itself has to accept
// '' too (as "no phone"), on top of the 12-digit case.
const PHONE_FIELD_REGEX = /^$|^\d{8,15}$/;

/**
 * Validates an optional international number such as 963912345678.
 */
export function IsPhoneNumber12() {
  return applyDecorators(
    Matches(PHONE_FIELD_REGEX, {
      message: 'phone must contain 8 to 15 digits including the country code (e.g. 963912345678)',
    }),
  );
}
