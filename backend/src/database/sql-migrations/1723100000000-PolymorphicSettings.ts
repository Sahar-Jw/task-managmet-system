import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the standalone "branches" and "departments" tables with a single
 * polymorphic "settings" table (SettingType.BRANCH / DEPARTMENT /
 * PROJECT_SETTING). Each row carries a bilingual code (code_ar/code_en) and
 * either a bilingual string value (value_ar/value_en) or a numeric value
 * (value_number), selected by value_type.
 *
 * Existing Branch/Department rows are copied over as-is (their single
 * name/code becomes both the ar and en copy, since the old tables had no
 * bilingual split) before the old tables are dropped.
 */
export class PolymorphicSettings1723100000000 implements MigrationInterface {
  name = 'PolymorphicSettings1723100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "setting_type_enum" AS ENUM ('department','branch','project_setting')`);
    await queryRunner.query(`CREATE TYPE "setting_value_type_enum" AS ENUM ('string','number')`);

    // ---------- SETTINGS ----------
    await queryRunner.query(`
      CREATE TABLE "settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" setting_type_enum NOT NULL,
        "code_ar" varchar(100) NOT NULL,
        "code_en" varchar(100) NOT NULL,
        "value_type" setting_value_type_enum NOT NULL DEFAULT 'string',
        "value_ar" varchar(255),
        "value_en" varchar(255),
        "value_number" numeric(14,2),
        "address" varchar(255),
        "is_admin_department" boolean NOT NULL DEFAULT false,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_settings_type" ON "settings" ("type")`);

    // ---------- MIGRATE EXISTING DATA ----------
    await queryRunner.query(`
      INSERT INTO "settings"
        ("id", "type", "code_ar", "code_en", "value_type", "value_ar", "value_en", "address", "is_active", "created_by", "created_at", "updated_at", "archived_at")
      SELECT "id", 'branch', "code", "code", 'string', "name", "name", "address", "is_active", "created_by", "created_at", "updated_at", "archived_at"
      FROM "branches"
    `);
    await queryRunner.query(`
      INSERT INTO "settings"
        ("id", "type", "code_ar", "code_en", "value_type", "value_ar", "value_en", "is_admin_department", "is_active", "created_by", "created_at", "updated_at", "archived_at")
      SELECT "id", 'department', "code", "code", 'string', "name", "name", "is_admin_department", "is_active", "created_by", "created_at", "updated_at", "archived_at"
      FROM "departments"
    `);

    // ---------- REPOINT FOREIGN KEYS ----------
    // Drop every FK that references branches/departments, whatever it's
    // actually named (InitSchema used TypeORM's auto-generated names, not
    // the guessable *_fkey convention), then point fresh, clearly-named
    // FKs at the new settings table.
    await queryRunner.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN
          SELECT conname, conrelid::regclass AS tbl
          FROM pg_constraint
          WHERE contype = 'f'
            AND confrelid IN ('departments'::regclass, 'branches'::regclass)
        LOOP
          EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "fk_users_department" FOREIGN KEY ("department_id") REFERENCES "settings"("id")`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "fk_users_branch" FOREIGN KEY ("branch_id") REFERENCES "settings"("id")`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_department" FOREIGN KEY ("department_id") REFERENCES "settings"("id")`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "fk_tasks_branch" FOREIGN KEY ("branch_id") REFERENCES "settings"("id")`);

    // ---------- DROP OLD TABLES ----------
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branches"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ---------- RECREATE OLD TABLES ----------
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "code" varchar(20) NOT NULL UNIQUE,
        "address" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "code" varchar(20) NOT NULL UNIQUE,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_admin_department" boolean NOT NULL DEFAULT false,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz
      )
    `);

    await queryRunner.query(`
      INSERT INTO "branches" ("id", "name", "code", "address", "is_active", "created_by", "created_at", "updated_at", "archived_at")
      SELECT "id", "value_en", "code_en", "address", "is_active", "created_by", "created_at", "updated_at", "archived_at"
      FROM "settings" WHERE "type" = 'branch'
    `);
    await queryRunner.query(`
      INSERT INTO "departments" ("id", "name", "code", "is_admin_department", "is_active", "created_by", "created_at", "updated_at", "archived_at")
      SELECT "id", "value_en", "code_en", "is_admin_department", "is_active", "created_by", "created_at", "updated_at", "archived_at"
      FROM "settings" WHERE "type" = 'department'
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_department"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "fk_users_branch"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "fk_tasks_department"`);
    await queryRunner.query(`ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "fk_tasks_branch"`);

    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id")`);
    await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id")`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "tasks_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id")`);
    await queryRunner.query(`ALTER TABLE "tasks" ADD CONSTRAINT "tasks_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id")`);

    await queryRunner.query(`ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);

    await queryRunner.query(`DROP TABLE IF EXISTS "settings"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "setting_value_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "setting_type_enum"`);
  }
}
