import type { Task, User } from '@/lib/types';

export function canEditTask(task: Task, user: User | null | undefined) {
  if (!user) return false;

  const isAdmin = user.role.name === 'ADMIN';
  const isCreator = task.createdById === user.id;

  if (!isAdmin && !isCreator) return false;
  if (task.status === 'Archived') return false;
  if (task.status === 'PendingApproval' && !isAdmin) return false;

  return true;
}
