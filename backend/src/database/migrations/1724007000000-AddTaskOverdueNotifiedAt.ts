import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Adds `overdue_notified_at` to `tasks`.
 *
 * Why this is needed:
 * The Task creator now gets a notification the first time their Task
 * becomes overdue. "Overdue" is a time-based condition (deadline passed,
 * not yet Completed/Finished/Archived) checked by a periodic job rather
 * than a single event, so we need to remember whether that notification
 * has already been sent for a given Task — otherwise the same Task would
 * generate a fresh notification on every run of the check.
 */
export class AddTaskOverdueNotifiedAt1724007000000
  implements MigrationInterface {
  name =
    'AddTaskOverdueNotifiedAt1724007000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks
      ADD COLUMN overdue_notified_at TIMESTAMP NULL DEFAULT NULL
    `);
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks
      DROP COLUMN overdue_notified_at
    `);
  }
}
