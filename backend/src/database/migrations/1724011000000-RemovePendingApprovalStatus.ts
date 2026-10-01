import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * The "Pending Approval" task status was removed.
 *
 * - Tasks currently in PendingApproval go back to InProgress.
 * - The built-in task_status setting row is deleted.
 * - The "submit_approval" action is stripped from task_workflow_config.
 */
export class RemovePendingApprovalStatus1724011000000
  implements MigrationInterface {
  name =
    'RemovePendingApprovalStatus1724011000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      UPDATE tasks
      SET status = 'InProgress'
      WHERE status = 'PendingApproval'
    `);

    await queryRunner.query(`
      UPDATE tasks
      SET status_before_archive = 'InProgress'
      WHERE status_before_archive = 'PendingApproval'
    `);

    await queryRunner.query(`
      DELETE FROM settings
      WHERE type = 'task_status'
        AND \`key\` = 'PendingApproval'
    `);

    const rows: Array<{
      id: string;
      actions: unknown;
    }> = await queryRunner.query(
      `SELECT id, actions FROM task_workflow_config`,
    );

    for (const row of rows) {
      const actions: Array<{
        key: string;
        enabled: boolean;
        order: number;
      }> =
        typeof row.actions === 'string'
          ? JSON.parse(row.actions)
          : (row.actions as any[]);

      if (
        !Array.isArray(actions) ||
        !actions.some((a) => a.key === 'submit_approval')
      ) {
        continue;
      }

      const next = actions
        .filter((a) => a.key !== 'submit_approval')
        .sort((a, b) => a.order - b.order)
        .map((a, i) => ({ ...a, order: i + 1 }));

      await queryRunner.query(
        `UPDATE task_workflow_config SET actions = ? WHERE id = ?`,
        [JSON.stringify(next), row.id],
      );
    }
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO settings (
          id, type, code_ar, code_en, \`key\`,
          is_system, value_type, value_ar, value_en, is_active
        )
        SELECT
          UUID(), 'task_status', 'بانتظار الموافقة',
          'Pending Approval', 'PendingApproval',
          1, 'string', 'بانتظار الموافقة', 'Pending Approval', 1
        FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM settings
          WHERE type = 'task_status' AND \`key\` = 'PendingApproval'
        )
      `,
    );
  }
}
