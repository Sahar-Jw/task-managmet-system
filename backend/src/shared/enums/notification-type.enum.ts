export enum NotificationType {
  /*
   * ==========================================================
   * TASK ASSIGNMENT
   * ==========================================================
   */

  TASK_ASSIGNED = 'TaskAssigned',

  TASK_REASSIGNED = 'TaskReassigned',

  ASSIGNMENT_ACCEPTED = 'AssignmentAccepted',

  ASSIGNMENT_REJECTED = 'AssignmentRejected',


  /*
   * ==========================================================
   * APPROVAL
   * ==========================================================
   */

  APPROVAL_REQUESTED = 'ApprovalRequested',

  APPROVAL_DECISION = 'ApprovalDecision',


  /*
   * ==========================================================
   * TASK ACTIVITY
   * ==========================================================
   */

  TASK_STATUS_CHANGED = 'TaskStatusChanged',

  TASK_COMPLETED = 'TaskCompleted',

  TASK_REOPENED = 'TaskReopened',

  TASK_UPDATED = 'TaskUpdated',


  /*
   * ==========================================================
   * DEADLINES
   * ==========================================================
   */

  DUE_DATE_CHANGED = 'DueDateChanged',

  DUE_DATE_APPROACHING = 'DueDateApproaching',

  TASK_OVERDUE = 'TaskOverdue',


  /*
   * ==========================================================
   * COMMENTS
   * ==========================================================
   */

  NEW_COMMENT = 'NewComment',


  /*
   * ==========================================================
   * PROJECTS
   * ==========================================================
   */

  PROJECT_UPDATED = 'ProjectUpdated',

  PROJECT_ARCHIVED = 'ProjectArchived',

  PROJECT_RESTORED = 'ProjectRestored',
}