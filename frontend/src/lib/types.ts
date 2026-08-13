export interface Role {
  id: string;
  name: 'ADMIN' | 'USER';
}

export type SettingType = 'department' | 'branch' | 'project_setting';
export type SettingValueType = 'string' | 'number';

// Setting is the single polymorphic lookup table that replaced the old
// standalone Branch and Department tables (and also carries generic
// Project Settings). Every row is exactly one `type`; only the value pair
// matching `valueType` is populated (string pair OR number).
export interface Setting {
  id: string;
  type: SettingType;
  codeAr: string;
  codeEn: string;
  valueType: SettingValueType;
  valueAr?: string;
  valueEn?: string;
  valueNumber?: string;
  address?: string; // branch-only
  isAdminDepartment?: boolean; // department-only
  isActive: boolean;
}

// Thin aliases kept so Task.branch / Task.department (below) read naturally
// — both are just Setting rows filtered by type.
export type Branch = Setting;
export type Department = Setting;

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  role: Role;
  roleId?: string;
  // Kept as plain reference ids (not relations) for org membership.
  departmentId?: string;
  branchId?: string;
  isActive: boolean;
  locale?: string;
  timezone?: string;
}

// Project is a standalone lookup entity: no relation to Branch or any
// other entity. Only Task references Project.
export type ProjectStatus = 'Planned' | 'Active' | 'Completed' | 'Archived';

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  createdById?: string;
  archivedAt?: string;
}

export type TaskStatus =
  | 'Pending'
  | 'Unassigned'
  | 'InProgress'
  | 'PendingApproval'
  | 'Completed'
  | 'Reopened'
  | 'Finished'
  | 'Archived';

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskType =
  | 'General'
  | 'Administrative'
  | 'Financial'
  | 'Technical'
  | 'Maintenance'
  | 'HR'
  | 'Procurement'
  | 'Other';

export type ApprovalStatus = 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';

/**
 * Task is the central/hub entity of the system: it is the ONLY entity that
 * relates to Branch, Department and Project — each independently, with no
 * relation between those three themselves.
 */
export interface Task {
  id: string;

  // Bilingual title & description
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;

  // Classification
  taskType: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  color?: string;

  // Organizational placement (each independent of the others)
  branchId?: string;
  branch?: Branch;
  departmentId?: string;
  department?: Department;
  projectId?: string;
  project?: Project;

  // People
  assignedToId?: string; // for whom this task is
  assignedTo?: User;
  createdById: string;
  createdBy?: User;

  // Approval
  needsApproval: boolean;
  approverId?: string;
  approver?: User;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;

  // Money range
  needsBudget: boolean;
  budgetMin?: string;
  budgetMax?: string;
  budgetCurrency?: string;

  // Dates
  startDate?: string;
  deadlineDate?: string;
  actualEndDate?: string;

  // Hierarchy
  parentTaskId?: string;
  parentTask?: Task;
  subTasks?: Task[];

  createdAt: string;

  // Children
  assignments?: TaskAssignment[];
  comments?: TaskComment[];
  ratings?: TaskRating[];
  attachments?: TaskAttachment[];
}

export type AssignmentStatus =
  | 'PendingAcceptance'
  | 'Accepted'
  | 'Rejected'
  | 'Reassigned'
  | 'Completed';

export interface TaskAssignment {
  id: string;
  taskId: string;
  assigneeId: string;
  assignee?: User;
  status: AssignmentStatus;
  dueDate?: string;
  rejectionReason?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId: string;
  author?: User;
  content: string;
  isEdited: boolean;
  createdAt: string;
}

// Task evaluation: left by the person who created/assigned the Task once
// it's finished; the doer can see the evaluation left for them.
export interface TaskRating {
  id: string;
  taskId: string;
  ratedById: string;
  ratedBy?: User;
  score: number;
  feedback?: string;
}

// File of any kind attached to a Task.
export interface TaskAttachment {
  id: string;
  taskId?: string;
  fileName: string;
  fileUrl?: string;
  mimeType?: string;
  fileSize?: number;
  uploadedById?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    taskId?: string;
    assignmentId?: string;
    commentId?: string;
    [key: string]: unknown;
  } | null;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actor?: User;
  entityType: string;
  entityId: string;
  action: string;
  reason?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}