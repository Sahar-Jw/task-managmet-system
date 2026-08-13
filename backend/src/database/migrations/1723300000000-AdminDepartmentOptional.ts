import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admins no longer belong to a Department. `users.department_id` becomes
 * nullable (it stays required for non-Admin Users — enforced in
 * UsersService, not at the DB level, since that rule depends on role and
 * can change per-user over time). Any existing Admin rows have their
 * department_id cleared so the data matches the new rule immediately.
 */
export class AdminDepartmentOptional1723300000000 implements MigrationInterface {
  name = 'AdminDepartmentOptional1723300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "department_id" DROP NOT NULL`);

    await queryRunner.query(`
      UPDATE "users"
      SET "department_id" = NULL
      WHERE "role_id" IN (SELECT "id" FROM "roles" WHERE "name" = 'ADMIN')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-tighten the column. Any Admin left with no department needs a
    // real one first, or this will fail — that's intentional: silently
    // guessing a department for them would be worse than a loud migration
    // failure prompting a manual fix.
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "department_id" SET NOT NULL`);
  }
}
