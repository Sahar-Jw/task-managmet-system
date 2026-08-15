import { TaskEntity } from '../../modules/tasks/entities/task.entity';

/**
 * Builds a short "(Priority: X, Due: Y)" suffix from a Task's priority and
 * deadline, for appending to Notification messages so recipients get useful
 * context (priority, due date) without having to open the Task first.
 * Omits the Due segment when the Task has no deadlineDate set.
 */
export function formatTaskDetails(task: TaskEntity): string {
  const parts: string[] = [`Priority: ${task.priority}`];
  if (task.deadlineDate) parts.push(`Due: ${task.deadlineDate}`);
  return ` (${parts.join(', ')})`;
}
