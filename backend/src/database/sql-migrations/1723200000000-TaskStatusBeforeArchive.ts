import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `status_before_archive` to `tasks` so an archived Task can be
 * restored to whatever status it actually held before archiving, instead
 * of unarchiving always dropping it into a single hardcoded status.
 * Powers the new Archive page's "Unarchive" action.
 */
export class TaskStatusBeforeArchive1723200000000 implements MigrationInterface {
  name = 'TaskStatusBeforeArchive1723200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "status_before_archive" task_status_enum
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "status_before_archive"`);
  }
}
