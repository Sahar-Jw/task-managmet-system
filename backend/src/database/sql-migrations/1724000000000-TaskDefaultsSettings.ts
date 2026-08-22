import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';

/**
 * Seeds two admin-editable `settings` rows (type = project_setting,
 * value_type = number) that back the new "Task Defaults" tab in
 * Settings:
 *
 * - DEFAULT_DEADLINE_DAYS: how many days after the start date the
 *   deadline field on the "New Task" form is pre-filled with. The task
 *   creator can still change the date manually before submitting.
 *
 * - MAX_ATTACHMENT_SIZE_MB: the max size (in MB) accepted for a single
 *   task/assignment attachment upload.
 *
 * Both rows are is_system=true (editable, not deletable) and carry a
 * stable `key` so the backend/frontend can look them up reliably
 * regardless of how the admin relabels the Arabic/English text.
 *
 * Written for MySQL (backtick identifiers, UUID() for the primary key)
 * to match this project's configured TypeORM driver.
 */
export class TaskDefaultsSettings1724000000000
  implements MigrationInterface {
  name =
    'TaskDefaultsSettings1724000000000';

  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO \`settings\` (
        \`id\`,
        \`type\`,
        \`code_ar\`,
        \`code_en\`,
        \`key\`,
        \`is_system\`,
        \`value_type\`,
        \`value_number\`,
        \`is_active\`,
        \`created_at\`,
        \`updated_at\`
      )
      SELECT * FROM (
        SELECT
          UUID() AS id,
          'project_setting' AS type,
          'المهلة الافتراضية للمهمة (أيام)' AS code_ar,
          'Default task deadline (days)' AS code_en,
          'DEFAULT_DEADLINE_DAYS' AS \`key\`,
          1 AS is_system,
          'number' AS value_type,
          3 AS value_number,
          1 AS is_active,
          NOW() AS created_at,
          NOW() AS updated_at
        UNION ALL
        SELECT
          UUID(),
          'project_setting',
          'الحد الأقصى لحجم المرفق (ميجابايت)',
          'Max attachment size (MB)',
          'MAX_ATTACHMENT_SIZE_MB',
          1,
          'number',
          25,
          1,
          NOW(),
          NOW()
      ) AS seed
      WHERE NOT EXISTS (
        SELECT 1 FROM \`settings\` AS existing
        WHERE existing.\`type\` = 'project_setting'
          AND existing.\`key\` = seed.\`key\`
      )
    `);
  }

  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      DELETE FROM \`settings\`
      WHERE \`type\` = 'project_setting'
        AND \`key\` IN ('DEFAULT_DEADLINE_DAYS', 'MAX_ATTACHMENT_SIZE_MB')
    `);
  }
}
