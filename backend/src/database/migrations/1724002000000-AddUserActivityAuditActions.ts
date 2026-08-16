import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Adds explicit User activation/deactivation actions to the audit enum.
 *
 * Why this is needed:
 * The TypeScript AuditAction enum already contains Activate/Deactivate, but
 * existing MySQL databases were created with an older ENUM definition that
 * does not contain those values. In non-strict MySQL modes, inserting an
 * unknown ENUM value can be stored as the empty string, which is why the
 * Audit Log UI can show a blank action badge.
 *
 * This migration:
 * 1. Expands the MySQL ENUM.
 * 2. Repairs legacy blank User audit rows when their old/new JSON values make
 *    the intended action unambiguous.
 */
export class AddUserActivityAuditActions1724002000000
  implements MigrationInterface {
  name =
    'AddUserActivityAuditActions1724002000000';


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


    /*
     * Repair old rows that were saved as an empty enum value before the
     * database enum contained Activate/Deactivate.
     *
     * We only repair User rows where the JSON state proves the transition.
     */
    await queryRunner.query(`
      UPDATE audit_logs
      SET action = 'Deactivate'
      WHERE entity_type = 'User'
        AND action = ''
        AND JSON_UNQUOTE(
          JSON_EXTRACT(
            old_value,
            '$.isActive'
          )
        ) = 'true'
        AND JSON_UNQUOTE(
          JSON_EXTRACT(
            new_value,
            '$.isActive'
          )
        ) = 'false'
    `);


    await queryRunner.query(`
      UPDATE audit_logs
      SET action = 'Activate'
      WHERE entity_type = 'User'
        AND action = ''
        AND JSON_UNQUOTE(
          JSON_EXTRACT(
            old_value,
            '$.isActive'
          )
        ) = 'false'
        AND JSON_UNQUOTE(
          JSON_EXTRACT(
            new_value,
            '$.isActive'
          )
        ) = 'true'
    `);


    /*
     * Fallback for older deactivate records that stored a clear reason but
     * did not include complete JSON transition data.
     */
    await queryRunner.query(`
      UPDATE audit_logs
      SET action = 'Deactivate'
      WHERE entity_type = 'User'
        AND action = ''
        AND LOWER(COALESCE(reason, '')) LIKE '%deactivat%'
    `);


    await queryRunner.query(`
      UPDATE audit_logs
      SET action = 'Activate'
      WHERE entity_type = 'User'
        AND action = ''
        AND LOWER(COALESCE(reason, '')) LIKE '%activat%'
        AND LOWER(COALESCE(reason, '')) NOT LIKE '%deactivat%'
    `);
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * Convert the new values back to Update before shrinking the ENUM so the
     * rollback never creates invalid enum values.
     */
    await queryRunner.query(`
      UPDATE audit_logs
      SET action = 'Update'
      WHERE action IN (
        'Activate',
        'Deactivate'
      )
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
        'Restore',
        'Archive'
      ) NOT NULL
    `);
  }
}
