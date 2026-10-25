import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The approval flow is now ENFORCED:
 *
 *  - A task whose approval is Pending cannot be assigned, started,
 *    completed, finished, or given sub-tasks.
 *  - A task whose approval was Rejected is closed (status Finished).
 *
 * No schema change is needed (approval_status, needs_approval, approver_id,
 * rejection_reason and the notification/audit enum values already exist).
 * This migration only brings EXISTING rows in line with the new rules so
 * nothing already in flight gets frozen or left inconsistent:
 *
 *  1. Tasks that already STARTED (any status except Pending/Unassigned) while
 *     their approval was still "Pending" are grandfathered: approval is
 *     switched off for them, because approval was never enforced before and
 *     freezing running work now would be disruptive.
 *  2. Tasks whose approval was "Rejected" but that were never closed are set
 *     to Finished, matching the new "rejected = finished" rule.
 *  3. Approvers of tasks that are genuinely still waiting for a decision get
 *     an "ApprovalRequested" notification, since nobody was told before.
 *
 * Everything that is changed in (1) and (2) is first copied to
 * `tasks_approval_migration_backup`, so `down()` can restore it exactly.
 * Every step is idempotent (safe to run twice).
 */
export class EnforceTaskApprovalFlow1724014000000
  implements MigrationInterface
{
  name = 'EnforceTaskApprovalFlow1724014000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tasks_approval_migration_backup (
        task_id varchar(36) NOT NULL,
        change_kind varchar(30) NOT NULL,
        previous_status varchar(50) NULL,
        previous_needs_approval tinyint(1) NOT NULL,
        previous_approver_id varchar(36) NULL,
        previous_approval_status varchar(20) NOT NULL,
        previous_rejection_reason text NULL,
        backed_up_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (task_id, change_kind)
      )
    `);

    // 1. Grandfather tasks that already started while approval was Pending.
    await queryRunner.query(`
      INSERT IGNORE INTO tasks_approval_migration_backup (
        task_id, change_kind, previous_status, previous_needs_approval,
        previous_approver_id, previous_approval_status, previous_rejection_reason
      )
      SELECT id, 'GRANDFATHERED', status, needs_approval,
             approver_id, approval_status, rejection_reason
      FROM tasks
      WHERE approval_status = 'Pending'
        AND status NOT IN ('Pending', 'Unassigned')
    `);

    await queryRunner.query(`
      UPDATE tasks
      SET needs_approval = 0,
          approver_id = NULL,
          approval_status = 'NotRequired',
          rejection_reason = NULL
      WHERE approval_status = 'Pending'
        AND status NOT IN ('Pending', 'Unassigned')
    `);

    // 2. Rejected approvals that were never closed -> Finished.
    await queryRunner.query(`
      INSERT IGNORE INTO tasks_approval_migration_backup (
        task_id, change_kind, previous_status, previous_needs_approval,
        previous_approver_id, previous_approval_status, previous_rejection_reason
      )
      SELECT id, 'REJECTED_CLOSED', status, needs_approval,
             approver_id, approval_status, rejection_reason
      FROM tasks
      WHERE approval_status = 'Rejected'
        AND status IN ('Pending', 'Unassigned', 'InProgress', 'Reopened')
    `);

    await queryRunner.query(`
      UPDATE tasks
      SET status = 'Finished'
      WHERE approval_status = 'Rejected'
        AND status IN ('Pending', 'Unassigned', 'InProgress', 'Reopened')
    `);

    // 3. Tell approvers about tasks that are really waiting on them.
    //    Non-essential, so a failure here must never abort the migration.
    try {
      await queryRunner.query(`
        INSERT INTO notifications (id, recipient_id, type, title, message, metadata, is_read)
        SELECT UUID(),
               t.approver_id,
               'ApprovalRequested',
               'New approval request',
               CONCAT(c.full_name, ' asked for your approval on "', t.title, '".'),
               JSON_OBJECT(
                 'taskId', t.id,
                 'actorId', t.created_by,
                 'actorName', c.full_name,
                 'taskTitle', t.title,
                 'priority', t.priority
               ),
               0
        FROM tasks t
        JOIN users c ON c.id = t.created_by
        JOIN users a ON a.id = t.approver_id AND a.is_active = 1
        WHERE t.approval_status = 'Pending'
          AND t.status IN ('Pending', 'Unassigned')
          AND t.approver_id IS NOT NULL
          AND t.approver_id <> t.created_by
          AND t.archived_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.recipient_id = t.approver_id
              AND n.type = 'ApprovalRequested'
              AND JSON_UNQUOTE(JSON_EXTRACT(n.metadata, '$.taskId')) = t.id
          )
      `);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        'EnforceTaskApprovalFlow: could not backfill approval notifications:',
        (error as Error).message,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore exactly what up() changed, then drop the backup table.
    await queryRunner.query(`
      UPDATE tasks t
      JOIN tasks_approval_migration_backup b ON b.task_id = t.id
      SET t.status = b.previous_status,
          t.needs_approval = b.previous_needs_approval,
          t.approver_id = b.previous_approver_id,
          t.approval_status = b.previous_approval_status,
          t.rejection_reason = b.previous_rejection_reason
    `);

    await queryRunner.query(
      'DROP TABLE IF EXISTS tasks_approval_migration_backup',
    );
  }
}
