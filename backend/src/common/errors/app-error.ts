export interface AppErrorPayload {
  code: string;
  message: string;
}

/**
 * Creates the structured payload consumed by the global exception filters.
 * Every user-facing HTTP exception must use this helper so clients receive a
 * stable semantic code independently of the selected response language.
 */
export function appError(code: string, message: string): AppErrorPayload {
  return { code, message };
}
