import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

// Digits only, no spaces/dashes/parentheses/country code — exactly 12
// digits, any prefix. Kept intentionally simple to match what the
// frontend collects; if this project ever needs to accept international
// numbers, swap this for class-validator's built-in @IsPhoneNumber()
// (libphonenumber-js-backed) instead of loosening this regex.
export const PHONE_NUMBER_REGEX = /^\d{12}$/;

// @IsOptional() only skips validation for undefined/null, not an empty
// string — and the profile form submits '' on purpose when someone clears
// their phone number to remove it. So the validator itself has to accept
// '' too (as "no phone"), on top of the 12-digit case.
const PHONE_FIELD_REGEX = /^$|^\d{12}$/;

/**
 * Validates that a field is either empty (no phone on file) or exactly 12
 * digits (e.g. "091234567890") — no spaces, dashes, parentheses, "+", or
 * letters. Combine with @IsOptional() where the field is allowed to be
 * omitted entirely.
 */
export function IsPhoneNumber12() {
  return applyDecorators(
    Matches(PHONE_FIELD_REGEX, {
      message: 'phone must be 12 digits, numbers only (e.g. 091234567890)',
    }),
  );
}