/**
 * Machine-readable codes for *system-generated* audit reasons.
 *
 * Audit logs are append-only (see AuditLogEntity), so this does not
 * change how reasons are stored (still the `reason` text column) — it
 * only changes *what* gets written for reasons the backend itself
 * generates, so the frontend can translate them.
 *
 * IMPORTANT: `reason` is also used to store free text typed by a user
 * (e.g. a task rejection reason, a reassignment note). That text is
 * NOT translatable and must never use this enum — it is written as-is
 * from the DTO. Only reasons the backend decides on its own (with no
 * user input) should use one of these codes.
 *
 * The `SYS_` prefix lets the frontend tell system codes apart from
 * both free-text reasons and any legacy plain-English reasons written
 * before this enum existed, without needing a schema change.
 */
export enum AuditReasonCode {
  PASSWORD_CHANGED_BY_USER = 'SYS_PASSWORD_CHANGED_BY_USER',
  SELF_SERVICE_REGISTRATION = 'SYS_SELF_SERVICE_REGISTRATION',
  AVATAR_UPDATED = 'SYS_AVATAR_UPDATED',
  AVATAR_REMOVED = 'SYS_AVATAR_REMOVED',
  ACCOUNT_DEACTIVATED_BY_ADMIN = 'SYS_ACCOUNT_DEACTIVATED_BY_ADMIN',
  PERMANENT_DELETION_BY_ADMIN = 'SYS_PERMANENT_DELETION_BY_ADMIN',
  HARD_DELETE = 'SYS_HARD_DELETE',
  TASK_COMPLETION_DERIVED = 'SYS_TASK_COMPLETION_DERIVED',
  ATTACHMENT_DELETED_BY_OWNER = 'SYS_ATTACHMENT_DELETED_BY_OWNER',
  SITE_BRANDING_UPDATED = 'SYS_SITE_BRANDING_UPDATED',
}
