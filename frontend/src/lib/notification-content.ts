import { uiText } from '@/lib/ui-text';
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
      : uiText(isArabic, 'text1181');

  const project =
    projectName
      ? `“${projectName}”`
      : uiText(isArabic, 'text1182');

  switch (notification.type) {
    case 'TaskAssigned':
      return {
        title: uiText(isArabic, 'text1183'),
        message: actor
          ? uiText(isArabic, 'text1184', { value0: actor, value1: task })
          : uiText(isArabic, 'text1185', { value0: task }),
      };

    case 'TaskReassigned':
      return {
        title: uiText(isArabic, 'text1186'),
        message: actor
          ? uiText(isArabic, 'text1187', { value0: actor, value1: task })
          : uiText(isArabic, 'text1188', { value0: task }),
      };

    case 'AssignmentAccepted':
      return {
        title: uiText(isArabic, 'text1189'),
        message: actor
          ? uiText(isArabic, 'text1190', { value0: actor, value1: task })
          : uiText(isArabic, 'text1191', { value0: task }),
      };

    case 'AssignmentRejected':
      return {
        title: uiText(isArabic, 'text1192'),
        message: actor
          ? uiText(isArabic, 'text1193', { value0: actor, value1: task })
          : uiText(isArabic, 'text1194', { value0: task }),
      };

    case 'ApprovalRequested':
      return {
        title: uiText(isArabic, 'text1195'),
        message: uiText(isArabic, 'text1196', { value0: task }),
      };

    case 'ApprovalDecision': {
      const approved =
        decision === 'approved' ||
        (!decision && notification.title.toLowerCase().includes('approved'));
      return {
        title: approved ? uiText(isArabic, 'text1197') : uiText(isArabic, 'text1198'),
        message: actor
          ? uiText(isArabic, approved ? 'text1199' : 'text1200', { value0: actor, value1: task })
          : uiText(isArabic, approved ? 'text1201' : 'text1202', { value0: task }),
      };
    }

    case 'NewComment':
      return {
        title: uiText(isArabic, 'text1203'),
        message: actor
          ? uiText(isArabic, 'text1204', { value0: actor, value1: task })
          : uiText(isArabic, 'text1205', { value0: task }),
      };

    case 'TaskStatusChanged':
      return { title: uiText(isArabic, 'text1206'), message: uiText(isArabic, 'text1207', { value0: task }) };
    case 'TaskCompleted':
      return { title: uiText(isArabic, 'text1208'), message: uiText(isArabic, 'text1209', { value0: task }) };
    case 'TaskReopened':
      return { title: uiText(isArabic, 'text1210'), message: uiText(isArabic, 'text1211', { value0: task }) };
    case 'TaskUpdated':
      return { title: uiText(isArabic, 'text1212'), message: uiText(isArabic, 'text1213', { value0: task }) };
    case 'DueDateChanged':
      return { title: uiText(isArabic, 'text1214'), message: uiText(isArabic, 'text1215', { value0: task }) };
    case 'DueDateApproaching':
      return { title: uiText(isArabic, 'text1216'), message: uiText(isArabic, 'text1217', { value0: task }) };
    case 'TaskOverdue':
      return { title: uiText(isArabic, 'text1218'), message: uiText(isArabic, 'text1219', { value0: task }) };
    case 'ProjectUpdated':
      return { title: uiText(isArabic, 'text1220'), message: uiText(isArabic, 'text1221', { value0: project }) };
    case 'ProjectArchived':
      return { title: uiText(isArabic, 'text1222'), message: uiText(isArabic, 'text1223', { value0: project }) };
    case 'ProjectRestored':
      return { title: uiText(isArabic, 'text1224'), message: uiText(isArabic, 'text1225', { value0: project }) };
    default:
      return {
        title: notification.title,
        message: notification.message,
      };
  }
}
