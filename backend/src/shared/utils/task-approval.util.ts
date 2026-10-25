import { ConflictException } from '@nestjs/common';
import { appError } from '../../common/errors/app-error';
import { ApprovalStatus } from '../enums/approval-status.enum';

/**
 * A Task that needs approval is "locked" until its approver decides:
 *
 *  - Pending  -> the approver has not decided yet. The Task cannot be
 *               assigned, started, completed or moved to any other status.
 *  - Rejected -> the approver said no. The Task is closed (Finished) and
 *               can never be worked on again.
 *  - Approved / NotRequired -> work may proceed normally.
 *
 * This is the single source of truth for that rule so the Tasks and
 * Task-Assignments services (and any future caller) always agree.
 */
export function isTaskApprovalBlocking(
  task: { approvalStatus?: ApprovalStatus | string | null },
): boolean {
  return (
    task.approvalStatus === ApprovalStatus.PENDING ||
    task.approvalStatus === ApprovalStatus.REJECTED
  );
}

/**
 * Throws a 409 when the Task is still waiting for its approval decision,
 * or was rejected. Call this before assigning, reassigning, changing the
 * status of, or adding Sub-tasks to a Task.
 */
export function assertTaskApprovalAllowsWork(
  task: { approvalStatus?: ApprovalStatus | string | null },
): void {
  if (task.approvalStatus === ApprovalStatus.PENDING) {
    throw new ConflictException(
      appError(
        'TASK_AWAITING_APPROVAL',
        'This Task is awaiting approval. It cannot be assigned, started or completed until it is approved.',
      ),
    );
  }

  if (task.approvalStatus === ApprovalStatus.REJECTED) {
    throw new ConflictException(
      appError(
        'TASK_APPROVAL_REJECTED',
        'This Task was rejected by its approver and can no longer be worked on.',
      ),
    );
  }
}
