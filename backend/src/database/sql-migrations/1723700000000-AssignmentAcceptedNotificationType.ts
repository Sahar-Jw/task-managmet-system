import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds 'AssignmentAccepted' to notification_type_enum so an Assignment
 * being accepted can raise a Notification the same way rejecting one
 * already does (previously only AssignmentRejected existed).
 */
export class AssignmentAcceptedNotificationType1723700000000 implements MigrationInterface {
  name = 'AssignmentAcceptedNotificationType1723700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ALTER TYPE ... ADD VALUE cannot run inside a transaction block in
    // Postgres, but TypeORM runs migrations inside one by default — using
    // IF NOT EXISTS keeps this idempotent/safe if it's ever re-run outside one.
    await queryRunner.query(
      `ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'AssignmentAccepted'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Postgres has no DROP VALUE for enums; reverting would require
    // recreating the type and rewriting every dependent column. Left as a
    // no-op — safe as long as no row uses 'AssignmentAccepted' (true for a
    // fresh rollback right after this migration).
  }
}
