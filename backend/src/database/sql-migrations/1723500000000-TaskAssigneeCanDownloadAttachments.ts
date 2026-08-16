import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `assignee_can_download_attachments` to `tasks`. The Task creator
 * (or Admin) toggles this to control whether the assigned User(s) may
 * download the Task's attachments. Preview access for assignees is not
 * gated by this flag — only download is. Defaults to true so existing
 * Tasks keep their current (unrestricted) download behavior.
 */
export class TaskAssigneeCanDownloadAttachments1723500000000 implements MigrationInterface {
  name = 'TaskAssigneeCanDownloadAttachments1723500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tasks"
      ADD COLUMN "assignee_can_download_attachments" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "tasks" DROP COLUMN "assignee_can_download_attachments"`);
  }
}
