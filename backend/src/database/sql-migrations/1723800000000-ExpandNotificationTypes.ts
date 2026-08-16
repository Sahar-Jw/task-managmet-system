import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


export class ExpandNotificationTypes1723800000000
  implements MigrationInterface
{
  name =
    'ExpandNotificationTypes1723800000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'ApprovalRequested'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'TaskStatusChanged'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'TaskCompleted'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'TaskReopened'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'TaskUpdated'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'DueDateChanged'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'ProjectUpdated'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'ProjectArchived'
    `);

    await queryRunner.query(`
      ALTER TYPE "public"."notification_type_enum"
      ADD VALUE IF NOT EXISTS 'ProjectRestored'
    `);
  }


  public async down(
    _queryRunner: QueryRunner,
  ): Promise<void> {
    /*
     * mysql cannot safely remove individual enum values.
     *
     * Leaving this intentionally empty avoids destroying
     * notification data during a rollback.
     */
  }
}