import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The "Administration" Department (settings row: type=department,
 * code_en=ADMIN) has been removed entirely — Admins simply don't belong to
 * any Department (see AdminDepartmentOptional1723300000000), and Tasks are
 * no longer classifiable under it either.
 *
 * Any existing Task/User rows that still point at it have their
 * department_id cleared first (settings.id is referenced by a plain FK, so
 * the row can't be deleted while something still points at it), then the
 * settings row itself is deleted.
 */
export class RemoveAdministrationDepartment1723400000000 implements MigrationInterface {
  name = 'RemoveAdministrationDepartment1723400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows: Array<{ id: string }> = await queryRunner.query(`
      SELECT "id" FROM "settings" WHERE "type" = 'department' AND "code_en" = 'ADMIN'
    `);
    if (rows.length === 0) return;

    const ids = rows.map((r) => r.id);

    await queryRunner.query(
      `UPDATE "tasks" SET "department_id" = NULL WHERE "department_id" = ANY($1)`,
      [ids],
    );
    await queryRunner.query(
      `UPDATE "users" SET "department_id" = NULL WHERE "department_id" = ANY($1)`,
      [ids],
    );
    await queryRunner.query(`DELETE FROM "settings" WHERE "id" = ANY($1)`, [ids]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-create the row (as the seed used to). Any Tasks/Users that were
    // cleared above are NOT re-linked to it — that association is
    // unrecoverable, which is intentional: silently re-guessing it would be
    // worse than a no-op down-migration.
    await queryRunner.query(`
      INSERT INTO "settings"
        ("type", "code_ar", "code_en", "value_type", "value_ar", "value_en", "is_active", "is_admin_department")
      VALUES
        ('department', 'ADMIN', 'ADMIN', 'string', 'الإدارة', 'Administration', true, true)
    `);
  }
}
