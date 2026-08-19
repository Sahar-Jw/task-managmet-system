import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Adds an explicit 'Accept' Audit action.
 *
 * Why this is needed:
 * Assignment acceptance used to be recorded as a generic 'Update', which
 * made it indistinguishable from any other Task Assignment edit in the
 * Audit Log. Splitting it into its own action makes the log readable at a
 * glance ("Ali Hassan accepted ...") instead of a vague "Updated ...".
 */
export class AddAcceptAuditAction1724006000000
  implements MigrationInterface {
  name =
    'AddAcceptAuditAction1724006000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE audit_logs
      MODIFY COLUMN action ENUM(
        'Create',
        'Update',
        'Delete',
        'Approve',
        'Reject',
        'Assign',
        'Accept',
        'Reassign',
        'StatusChange',
        'Login',
        'Logout',
        'LoginFailed',
        'AccountLocked',
        'AccountUnlocked',
        'Activate',
        'Deactivate',
        'Restore',
        'Archive'
      ) NOT NULL
    `);
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * Convert any 'Accept' rows back to 'Update' before shrinking the ENUM
     * so the rollback never leaves an invalid enum value behind.
     */
    await queryRunner.query(`
      UPDATE audit_logs
      SET action = 'Update'
      WHERE action = 'Accept'
    `);


    await queryRunner.query(`
      ALTER TABLE audit_logs
      MODIFY COLUMN action ENUM(
        'Create',
        'Update',
        'Delete',
        'Approve',
        'Reject',
        'Assign',
        'Reassign',
        'StatusChange',
        'Login',
        'Logout',
        'LoginFailed',
        'AccountLocked',
        'AccountUnlocked',
        'Activate',
        'Deactivate',
        'Restore',
        'Archive'
      ) NOT NULL
    `);
  }
}
