export interface Role {
  id: string;
  name: 'ADMIN' | 'USER';
}


export type SettingType =
  | 'department'
  | 'branch'
  | 'project_setting'
  | 'task_status'
  | 'task_type'
  | 'task_priority'
  | 'project_status';


export type SettingValueType =
  | 'string'
  | 'number';


export interface Setting {
  id: string;

  type: SettingType;

  codeAr: string;
  codeEn: string;

  valueType: SettingValueType;

  valueAr?: string;
  valueEn?: string;

  valueNumber?: string;

  address?: string;

  isAdminDepartment?: boolean;

  isActive: boolean;

  key?: string;

  isSystem?: boolean;
}


export type Branch =
  Setting;


export type Department =
  Setting;


/*
 * ============================================================
 * BRANDING
 * ============================================================
 */

export interface BrandingSettings {
  id: string;

  siteName: string;

  logoUrl?: string | null;

  faviconUrl?: string | null;

  metaTitle?: string;

  metaDescription?: string;

  metaKeywords?: string;
}


/*
 * ============================================================
 * USER
 * ============================================================
 */

export interface User {
  id: string;

  fullName: string;

  email: string;

  phone?: string;

  avatarUrl?: string | null;

  role: Role;

  roleId?: string;

  departmentId?:
    string | null;

  branchId?:
    string;

  isActive:
    boolean;

  locale?:
    string;

  timezone?:
    string;

  createdAt:
    string;

  updatedAt?:
    string;

  archivedAt?:
    string | null;

  failedLoginAttempts?:
    number;

  lockedUntil?:
    string | null;
}


/*
 * ============================================================
 * PROJECT
 * ============================================================
 */

export type ProjectStatus =
  | 'Planned'
  | 'Active'
  | 'Completed'
  | 'Archived';


export interface Project {
  id:
    string;

  name:
    string;

  description?:
    string;

  status:
    ProjectStatus;

  startDate?:
    string;

  endDate?:
    string;

  createdById?:
    string;

  ownerName?:
    string;

  ownerDepartmentName?:
    string;

  ownerBranchName?:
    string;

  createdAt:
    string;

  archivedAt?:
    string;
}


/*
 * ============================================================
 * TASK
 * ============================================================
 */

export type TaskStatus =
  | 'Pending'
  | 'Unassigned'
  | 'InProgress'
  | 'PendingApproval'
  | 'Completed'
  | 'Reopened'
  | 'Finished'
  | 'Archived';


export type TaskPriority =
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical';


export type TaskType =
  | 'General'
  | 'Administrative'
  | 'Financial'
  | 'Technical'
  | 'Maintenance'
  | 'HR'
  | 'Procurement'
  | 'Other';


export type ApprovalStatus =
  | 'NotRequired'
  | 'Pending'
  | 'Approved'
  | 'Rejected';


export interface Task {
  id:
    string;


  /*
   * Bilingual content
   */

  titleAr:
    string;

  titleEn:
    string;

  descriptionAr?:
    string;

  descriptionEn?:
    string;


  /*
   * Classification
   */

  taskType:
    TaskType;

  priority:
    TaskPriority;

  status:
    TaskStatus;

  color?:
    string;


  /*
   * Organization
   */

  branchId?:
    string;

  branch?:
    Branch;

  departmentId?:
    string;

  department?:
    Department;

  projectId?:
    string;

  project?:
    Project;


  /*
   * People
   */

  assignedToId?:
    string;

  assignedTo?:
    User;

  createdById:
    string;

  createdBy?:
    User;


  /*
   * Approval
   */

  needsApproval:
    boolean;

  approverId?:
    string;

  approver?:
    User;

  approvalStatus:
    ApprovalStatus;

  rejectionReason?:
    string;


  /*
   * Budget
   */

  needsBudget:
    boolean;

  budgetMin?:
    string;

  budgetMax?:
    string;

  budgetCurrency?:
    string;


  /*
   * Dates
   */

  startDate?:
    string;

  deadlineDate?:
    string;

  actualEndDate?:
    string;


  /*
   * Hierarchy
   */

  parentTaskId?:
    string;

  parentTask?:
    Task;

  subTasks?:
    Task[];


  createdAt:
    string;


  /*
   * Attachment permissions
   */

  assigneeCanDownloadAttachments:
    boolean;


  /*
   * Children
   */

  assignments?:
    TaskAssignment[];

  comments?:
    TaskComment[];

  ratings?:
    TaskRating[];

  attachments?:
    TaskAttachment[];
}


/*
 * ============================================================
 * ASSIGNMENT
 * ============================================================
 */

export type AssignmentStatus =
  | 'PendingAcceptance'
  | 'Accepted'
  | 'Rejected'
  | 'Reassigned'
  | 'Completed';


export interface TaskAssignment {
  id:
    string;

  taskId:
    string;

  assigneeId:
    string;

  assignedById:
    string;

  dueDate?:
    string | null;

  status:
    AssignmentStatus;

  rejectionReason?:
    string | null;

  acceptedAt?:
    string | null;

  rejectedAt?:
    string | null;

  createdAt:
    string;

  updatedAt:
    string;

  assignee?:
    User;

  assignedBy?:
    User;
}


/*
 * ============================================================
 * COMMENT
 * ============================================================
 */

export interface TaskComment {
  id:
    string;

  taskId:
    string;

  authorId:
    string;

  author?:
    User;

  content:
    string;

  isEdited:
    boolean;

  createdAt:
    string;
}


/*
 * ============================================================
 * RATING
 * ============================================================
 */

export interface TaskRating {
  id:
    string;

  taskId:
    string;

  ratedById:
    string;

  ratedBy?:
    User;

  score:
    number;

  feedback?:
    string;
}


/*
 * ============================================================
 * ATTACHMENT
 * ============================================================
 *
 * IMAGE
 *
 * fileUrl points to:
 *
 * /storage/attachments/YYYY/MM/file.jpg
 *
 * Actual bytes live on disk.
 *
 *
 * DATABASE
 *
 * fileUrl = null
 *
 * Actual bytes live inside MySQL LONGBLOB.
 *
 * fileData is deliberately NOT sent in Task API responses.
 * ============================================================
 */

export type AttachmentStorageType =
  | 'IMAGE'
  | 'DATABASE';


export interface TaskAttachment {
  id:
    string;

  taskId?:
    string | null;

  assignmentId?:
    string | null;

  uploadedById:
    string;

  fileName:
    string;

  fileUrl?:
    string | null;

  mimeType:
    string;

  fileSize:
    number;

  storageType:
    AttachmentStorageType;

  createdAt:
    string;

  deletedAt?:
    string | null;
}


/*
 * ============================================================
 * NOTIFICATIONS
 * ============================================================
 */

export type NotificationType =
  | 'TaskAssigned'
  | 'TaskReassigned'
  | 'AssignmentAccepted'
  | 'AssignmentRejected'
  | 'ApprovalRequested'
  | 'ApprovalDecision'
  | 'TaskStatusChanged'
  | 'TaskCompleted'
  | 'TaskReopened'
  | 'TaskUpdated'
  | 'DueDateChanged'
  | 'DueDateApproaching'
  | 'TaskOverdue'
  | 'NewComment'
  | 'ProjectUpdated'
  | 'ProjectArchived'
  | 'ProjectRestored';


export interface NotificationMetadata {
  taskId?:
    string;

  taskTitle?:
    string;

  taskTitleAr?:
    string;

  taskTitleEn?:
    string;

  projectId?:
    string;

  projectName?:
    string;

  assignmentId?:
    string;

  commentId?:
    string;

  approvalId?:
    string;

  actorId?:
    string;

  actorName?:
    string;

  decision?:
    string;

  priority?:
    string;

  status?:
    string;

  previousStatus?:
    string;

  dueDate?:
    string;

  previousDueDate?:
    string;

  reason?:
    string;

  [key: string]:
    unknown;
}


export interface Notification {
  id:
    string;

  type:
    NotificationType;

  title:
    string;

  message:
    string;

  isRead:
    boolean;

  readAt?:
    string | null;

  createdAt:
    string;

  metadata?:
    NotificationMetadata | null;
}


/*
 * ============================================================
 * AUDIT
 * ============================================================
 */

export interface AuditLogEntry {
  id:
    string;

  actorId?:
    string | null;

  actor?:
    User | null;

  entityType:
    string;

  entityId:
    string;

  action:
    string;

  oldValue?:
    Record<
      string,
      unknown
    > | null;

  newValue?:
    Record<
      string,
      unknown
    > | null;

  reason?:
    string | null;

  ipAddress?:
    string | null;

  createdAt:
    string;
}


export interface DictionaryEntry {
  id?: string;
  key: string;
  textEn: string;
  textAr: string;
}


/*
 * ============================================================
 * PAGINATION
 * ============================================================
 */

export interface Paginated<
  T
> {
  items:
    T[];

  total:
    number;

  page:
    number;

  limit:
    number;
}


/*
 * ============================================================
 * WORKFLOW
 * ============================================================
 */

export type TaskWorkflowMode =
  | 'all_available'
  | 'guided';


export type TaskWorkflowActionKey =
  | 'start'
  | 'submit_approval'
  | 'complete'
  | 'finish'
  | 'archive';


export interface TaskWorkflowAction {
  key:
    TaskWorkflowActionKey;

  targetStatus:
    string;

  labelEn:
    string;

  labelAr:
    string;

  descriptionEn:
    string;

  descriptionAr:
    string;

  enabled:
    boolean;

  order:
    number;
}


export interface TaskWorkflowConfig {
  id:
    string;

  mode:
    TaskWorkflowMode;

  actions:
    TaskWorkflowAction[];

  updatedAt:
    string;
}
