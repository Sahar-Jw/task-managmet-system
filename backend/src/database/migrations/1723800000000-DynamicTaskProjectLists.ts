import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Makes Task Status/Type/Priority and Project Status admin-editable from
 * Settings > "Statuses & Types", instead of fixed Postgres enums.
 *
 * - `settings.type` becomes plain varchar (was a native enum) so future
 *   SettingType categories never need an `ALTER TYPE ... ADD VALUE`
 *   migration — including the four new ones added here.
 * - `settings` gains `key` (the stable machine reference Task/Project rows
 *   actually store) and `is_system` (true = built-in, relabelable but not
 *   deletable, since these drive real workflow logic elsewhere).
 * - `tasks.task_type/priority/status/status_before_archive` and
 *   `projects.status` move from native enums to varchar, so they can hold
 *   any active list value, not just the original fixed members.
 * - Every original enum member is seeded as an `is_system = true` row with
 *   `key` set to its exact original string value, so existing data needs
 *   zero migration — a task with status='Completed' still means exactly
 *   what it always did.
 *
 * The old Postgres enum types (task_type_enum, task_priority_enum,
 * task_status_enum, project_status_enum, setting_type_enum) are left in
 * place, just unused — dropping them isn't necessary and avoids any risk
 * to data already stored with that type.
 */
export class DynamicTaskProjectLists1723800000000 implements MigrationInterface {
  name = 'DynamicTaskProjectLists1723800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------- settings: type -> varchar, + key / is_system ----------
    await queryRunner.query(`ALTER TABLE "settings" ALTER COLUMN "type" TYPE varchar(50) USING "type"::text`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN "key" varchar(150)`);
    await queryRunner.query(`ALTER TABLE "settings" ADD COLUMN "is_system" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_settings_type_key" ON "settings" ("type", "key") WHERE "key" IS NOT NULL
    `);

    // ---------- tasks: enum columns -> varchar ----------
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "task_type" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "task_type" TYPE varchar(50) USING "task_type"::text`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "task_type" SET DEFAULT 'General'`);

    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE varchar(50) USING "priority"::text`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'Medium'`);

    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" TYPE varchar(50) USING "status"::text`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'Pending'`);

    await queryRunner.query(`
      ALTER TABLE "tasks" ALTER COLUMN "status_before_archive" TYPE varchar(50) USING "status_before_archive"::text
    `);

    // ---------- projects: enum column -> varchar ----------
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" TYPE varchar(50) USING "status"::text`);
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'Planned'`);

    // ---------- seed built-in list values ----------
    const rows: Array<{
      type: string;
      key: string;
      codeEn: string;
      codeAr: string;
    }> = [
      // Task Status
      { type: 'task_status', key: 'Pending', codeEn: 'Pending', codeAr: 'قيد الانتظار' },
      { type: 'task_status', key: 'Unassigned', codeEn: 'Unassigned', codeAr: 'غير مسندة' },
      { type: 'task_status', key: 'InProgress', codeEn: 'In Progress', codeAr: 'قيد التنفيذ' },
      { type: 'task_status', key: 'PendingApproval', codeEn: 'Pending Approval', codeAr: 'بانتظار الموافقة' },
      { type: 'task_status', key: 'Completed', codeEn: 'Completed', codeAr: 'مكتملة' },
      { type: 'task_status', key: 'Reopened', codeEn: 'Reopened', codeAr: 'أعيد فتحها' },
      { type: 'task_status', key: 'Finished', codeEn: 'Finished', codeAr: 'منتهية' },
      { type: 'task_status', key: 'Archived', codeEn: 'Archived', codeAr: 'مؤرشفة' },
      // Task Type
      { type: 'task_type', key: 'General', codeEn: 'General', codeAr: 'عام' },
      { type: 'task_type', key: 'Administrative', codeEn: 'Administrative', codeAr: 'إداري' },
      { type: 'task_type', key: 'Financial', codeEn: 'Financial', codeAr: 'مالي' },
      { type: 'task_type', key: 'Technical', codeEn: 'Technical', codeAr: 'تقني' },
      { type: 'task_type', key: 'Maintenance', codeEn: 'Maintenance', codeAr: 'صيانة' },
      { type: 'task_type', key: 'HR', codeEn: 'HR', codeAr: 'الموارد البشرية' },
      { type: 'task_type', key: 'Procurement', codeEn: 'Procurement', codeAr: 'المشتريات' },
      { type: 'task_type', key: 'Other', codeEn: 'Other', codeAr: 'أخرى' },
      // Task Priority
      { type: 'task_priority', key: 'Low', codeEn: 'Low', codeAr: 'منخفضة' },
      { type: 'task_priority', key: 'Medium', codeEn: 'Medium', codeAr: 'متوسطة' },
      { type: 'task_priority', key: 'High', codeEn: 'High', codeAr: 'عالية' },
      { type: 'task_priority', key: 'Critical', codeEn: 'Critical', codeAr: 'حرجة' },
      // Project Status
      { type: 'project_status', key: 'Planned', codeEn: 'Planned', codeAr: 'مخطط له' },
      { type: 'project_status', key: 'Active', codeEn: 'Active', codeAr: 'نشط' },
      { type: 'project_status', key: 'Completed', codeEn: 'Completed', codeAr: 'مكتمل' },
      { type: 'project_status', key: 'Archived', codeEn: 'Archived', codeAr: 'مؤرشف' },
    ];

    for (const row of rows) {
      await queryRunner.query(
        `
        INSERT INTO "settings"
          ("id", "type", "code_ar", "code_en", "key", "is_system", "value_type", "value_ar", "value_en", "is_active")
        VALUES
          (gen_random_uuid(), $1, $2, $3, $4, true, 'string', $3, $3, true)
        `,
        [row.type, row.codeAr, row.codeEn, row.key],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "settings" WHERE "type" IN ('task_status','task_type','task_priority','project_status')
    `);

    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "projects" ALTER COLUMN "status" TYPE project_status_enum USING "status"::project_status_enum`,
    );
    await queryRunner.query(`ALTER TABLE "projects" ALTER COLUMN "status" SET DEFAULT 'Planned'`);

    await queryRunner.query(`
      ALTER TABLE "tasks" ALTER COLUMN "status_before_archive" TYPE task_status_enum USING "status_before_archive"::task_status_enum
    `);

    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "status" TYPE task_status_enum USING "status"::task_status_enum`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "status" SET DEFAULT 'Pending'`);

    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "priority" TYPE task_priority_enum USING "priority"::task_priority_enum`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "priority" SET DEFAULT 'Medium'`);

    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "task_type" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "task_type" TYPE task_type_enum USING "task_type"::task_type_enum`,
    );
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "task_type" SET DEFAULT 'General'`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_settings_type_key"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "is_system"`);
    await queryRunner.query(`ALTER TABLE "settings" DROP COLUMN "key"`);
    await queryRunner.query(
      `ALTER TABLE "settings" ALTER COLUMN "type" TYPE setting_type_enum USING "type"::setting_type_enum`,
    );
  }
}
