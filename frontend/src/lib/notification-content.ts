import type {
  Notification,
} from '@/lib/types';


type LocalizedNotificationContent = {
  title: string;
  message: string;
};


function metadataText(
  notification: Notification,
  key: string,
): string {
  const value =
    notification.metadata?.[key];

  return typeof value === 'string'
    ? value.trim()
    : '';
}


/**
 * Notification rows are stored as events plus metadata. Render their human
 * text at display time so changing the site language also changes existing
 * notifications instead of permanently storing an English-only sentence.
 */
export function localizedNotificationContent(
  notification: Notification,
  isArabic: boolean,
): LocalizedNotificationContent {
  const actor =
    metadataText(notification, 'actorName');

  const taskTitle =
    isArabic
      ? metadataText(notification, 'taskTitleAr') ||
        metadataText(notification, 'taskTitleEn') ||
        metadataText(notification, 'taskTitle')
      : metadataText(notification, 'taskTitleEn') ||
        metadataText(notification, 'taskTitleAr') ||
        metadataText(notification, 'taskTitle');

  const projectName =
    metadataText(notification, 'projectName');

  const decision =
    metadataText(notification, 'decision').toLowerCase();

  const task =
    taskTitle
      ? `“${taskTitle}”`
      : isArabic
        ? 'المهمة'
        : 'the task';

  const project =
    projectName
      ? `“${projectName}”`
      : isArabic
        ? 'المشروع'
        : 'the project';

  switch (notification.type) {
    case 'TaskAssigned':
      return isArabic
        ? {
            title: 'تم إسناد مهمة جديدة إليك',
            message: actor
              ? `قام ${actor} بإسناد ${task} إليك.`
              : `تم إسناد ${task} إليك.`,
          }
        : {
            title: 'New task assigned to you',
            message: actor
              ? `${actor} assigned ${task} to you.`
              : `${task} was assigned to you.`,
          };

    case 'TaskReassigned':
      return isArabic
        ? {
            title: 'تمت إعادة إسناد مهمة إليك',
            message: actor
              ? `قام ${actor} بإعادة إسناد ${task} إليك.`
              : `تمت إعادة إسناد ${task} إليك.`,
          }
        : {
            title: 'Task reassigned to you',
            message: actor
              ? `${actor} reassigned ${task} to you.`
              : `${task} was reassigned to you.`,
          };

    case 'AssignmentAccepted':
      return isArabic
        ? {
            title: 'تم قبول إسناد المهمة',
            message: actor
              ? `وافق ${actor} على إسناد ${task}.`
              : `تم قبول إسناد ${task}.`,
          }
        : {
            title: 'Assignment accepted',
            message: actor
              ? `${actor} accepted the assignment for ${task}.`
              : `The assignment for ${task} was accepted.`,
          };

    case 'AssignmentRejected':
      return isArabic
        ? {
            title: 'تم رفض إسناد المهمة',
            message: actor
              ? `رفض ${actor} إسناد ${task}.`
              : `تم رفض إسناد ${task}.`,
          }
        : {
            title: 'Assignment rejected',
            message: actor
              ? `${actor} rejected the assignment for ${task}.`
              : `The assignment for ${task} was rejected.`,
          };

    case 'ApprovalRequested':
      return isArabic
        ? {
            title: 'طلب موافقة جديد',
            message: `توجد موافقة مطلوبة على ${task}.`,
          }
        : {
            title: 'New approval request',
            message: `Approval is required for ${task}.`,
          };

    case 'ApprovalDecision': {
      const approved =
        decision === 'approved' ||
        (!decision && notification.title.toLowerCase().includes('approved'));
      return isArabic
        ? {
            title: approved ? 'تمت الموافقة على المهمة' : 'تم رفض المهمة',
            message: actor
              ? `${approved ? 'وافق' : 'رفض'} ${actor} على ${task}.`
              : `${approved ? 'تمت الموافقة على' : 'تم رفض'} ${task}.`,
          }
        : {
            title: approved ? 'Task approved' : 'Task rejected',
            message: actor
              ? `${actor} ${approved ? 'approved' : 'rejected'} ${task}.`
              : `${task} was ${approved ? 'approved' : 'rejected'}.`,
          };
    }

    case 'NewComment':
      return isArabic
        ? {
            title: 'تعليق جديد على مهمة',
            message: actor
              ? `أضاف ${actor} تعليقاً على ${task}.`
              : `تمت إضافة تعليق جديد على ${task}.`,
          }
        : {
            title: 'New comment on a task',
            message: actor
              ? `${actor} commented on ${task}.`
              : `A new comment was added to ${task}.`,
          };

    case 'TaskStatusChanged':
      return isArabic
        ? { title: 'تغيّرت حالة المهمة', message: `تم تحديث حالة ${task}.` }
        : { title: 'Task status changed', message: `The status of ${task} was updated.` };
    case 'TaskCompleted':
      return isArabic
        ? { title: 'اكتملت المهمة', message: `تم إكمال ${task}.` }
        : { title: 'Task completed', message: `${task} was completed.` };
    case 'TaskReopened':
      return isArabic
        ? { title: 'أُعيد فتح المهمة', message: `تمت إعادة فتح ${task}.` }
        : { title: 'Task reopened', message: `${task} was reopened.` };
    case 'TaskUpdated':
      return isArabic
        ? { title: 'تم تحديث المهمة', message: `تم تحديث معلومات ${task}.` }
        : { title: 'Task updated', message: `${task} was updated.` };
    case 'DueDateChanged':
      return isArabic
        ? { title: 'تغيّر الموعد النهائي', message: `تم تغيير الموعد النهائي لـ ${task}.` }
        : { title: 'Due date changed', message: `The due date for ${task} changed.` };
    case 'DueDateApproaching':
      return isArabic
        ? { title: 'الموعد النهائي يقترب', message: `اقترب الموعد النهائي لـ ${task}.` }
        : { title: 'Due date approaching', message: `The due date for ${task} is approaching.` };
    case 'TaskOverdue':
      return isArabic
        ? { title: 'المهمة متأخرة', message: `تجاوزت ${task} موعدها النهائي.` }
        : { title: 'Task overdue', message: `${task} is past its due date.` };
    case 'ProjectUpdated':
      return isArabic
        ? { title: 'تم تحديث المشروع', message: `تم تحديث ${project}.` }
        : { title: 'Project updated', message: `${project} was updated.` };
    case 'ProjectArchived':
      return isArabic
        ? { title: 'تمت أرشفة المشروع', message: `تمت أرشفة ${project}.` }
        : { title: 'Project archived', message: `${project} was archived.` };
    case 'ProjectRestored':
      return isArabic
        ? { title: 'تمت استعادة المشروع', message: `تمت استعادة ${project}.` }
        : { title: 'Project restored', message: `${project} was restored.` };
    default:
      return {
        title: notification.title,
        message: notification.message,
      };
  }
}
