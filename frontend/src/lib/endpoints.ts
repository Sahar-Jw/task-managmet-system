import { api } from './api';
import type {
  AuditLogEntry,
  Branch,
  Department,
  Notification,
  Paginated,
  Project,
  Task,
  TaskComment,
  TaskRating,
  User,
} from './types';

// ---------- Auth ----------
export const AuthApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  register: (data: {
    fullName: string;
    email: string;
    password: string;
    branchId: string;
    departmentId: string;
    phone?: string;
  }) =>
    api<{ accessToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: data,
    }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => api<User>('/users/me'),
};

// ---------- Public directory (unauthenticated; powers the sign-up form) ----------
// Branch and Department are independent, standalone lists (neither
// references the other), so there is no cascading branchId filter here.
export const PublicApi = {
  branches: () => api<{ id: string; name: string; code: string }[]>('/public/branches'),
  departments: () =>
    api<{ id: string; name: string; code: string }[]>('/public/departments'),
};

// ---------- Branches ----------
// Branch is a standalone lookup entity: no relation to any other entity.
export const BranchesApi = {
  list: () => api<Branch[]>('/branches'),
  create: (data: { name: string; code: string; address?: string }) =>
    api<Branch>('/branches', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Branch>) =>
    api<Branch>(`/branches/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api(`/branches/${id}`, { method: 'DELETE' }),
};

// ---------- Departments ----------
// Department is a standalone lookup entity: no relation to Branch or any
// other entity — only Task references it.
export const DepartmentsApi = {
  list: () => api<Department[]>('/departments'),
  create: (data: { name: string; code: string }) =>
    api<Department>('/departments', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Department>) =>
    api<Department>(`/departments/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api(`/departments/${id}`, { method: 'DELETE' }),
};

// ---------- Users ----------
export const UsersApi = {
  list: (params: Record<string, string> = {}) =>
    api<Paginated<User>>(`/users?${new URLSearchParams(params)}`),
  get: (id: string) => api<User>(`/users/${id}`),
  create: (data: {
    fullName: string;
    email: string;
    password: string;
    roleId: string;
    departmentId: string;
    branchId: string;
  }) => api<User>('/users', { method: 'POST', body: data }),
  adminUpdate: (id: string, data: Partial<User> & { password?: string }) =>
    api<User>(`/users/${id}`, { method: 'PATCH', body: data }),
  updateOwnProfile: (data: { fullName?: string; phone?: string }) =>
    api<User>('/users/me', { method: 'PATCH', body: data }),
  deactivate: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
  unlock: (id: string) => api<User>(`/users/${id}/unlock`, { method: 'PATCH' }),
  roles: () => api<{ id: string; name: string }[]>('/roles'),
};

// ---------- Projects ----------
// Project is a standalone lookup entity: no relation to Branch or any
// other entity — only Task references it.
export const ProjectsApi = {
  list: (params: Record<string, string> = {}) =>
    api<Paginated<Project>>(`/projects?${new URLSearchParams(params)}`),
  get: (id: string) => api<Project>(`/projects/${id}`),
  create: (data: { name: string; description?: string; startDate?: string; endDate?: string }) =>
    api<Project>('/projects', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Project>) =>
    api<Project>(`/projects/${id}`, { method: 'PATCH', body: data }),
  archive: (id: string) => api<Project>(`/projects/${id}/archive`, { method: 'POST' }),
};

// ---------- Tasks ----------
// Task is the central/hub entity: the only one that relates to Branch,
// Department and Project — each independently.
export interface CreateTaskPayload {
  titleAr: string;
  titleEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  taskType?: string;
  priority: string;
  color?: string;
  branchId?: string;
  departmentId: string;
  projectId?: string;
  parentTaskId?: string;
  assignedToId?: string;
  needsApproval?: boolean;
  approverId?: string;
  needsBudget?: boolean;
  budgetMin?: string;
  budgetMax?: string;
  budgetCurrency?: string;
  startDate?: string;
  deadlineDate?: string;
}

export const TasksApi = {
  list: (params: Record<string, string> = {}) =>
    api<Paginated<Task>>(`/tasks?${new URLSearchParams(params)}`),
  get: (id: string) => api<Task>(`/tasks/${id}`),
  create: (data: CreateTaskPayload) => api<Task>('/tasks', { method: 'POST', body: data }),
  update: (id: string, data: Partial<CreateTaskPayload>) =>
    api<Task>(`/tasks/${id}`, { method: 'PATCH', body: data }),
  changeStatus: (id: string, status: string, reason?: string) =>
    api<Task>(`/tasks/${id}/status`, { method: 'PATCH', body: { status, reason } }),
  decideApproval: (id: string, approve: boolean, rejectionReason?: string) =>
    api<Task>(`/tasks/${id}/approval`, { method: 'PATCH', body: { approve, rejectionReason } }),
  reopen: (id: string, reason: string) =>
    api<Task>(`/tasks/${id}/reopen`, { method: 'POST', body: { status: 'Reopened', reason } }),
  remove: (id: string) => api(`/tasks/${id}`, { method: 'DELETE' }),
};

// ---------- Task Assignments ----------
export const AssignmentsApi = {
  list: (taskId: string) => api(`/tasks/${taskId}/assignments`),
  assign: (taskId: string, assigneeId: string, dueDate?: string) =>
    api(`/tasks/${taskId}/assignments`, {
      method: 'POST',
      body: { assigneeId, dueDate },
    }),
  accept: (id: string) => api(`/assignments/${id}/accept`, { method: 'PATCH' }),
  reject: (id: string, reason: string) =>
    api(`/assignments/${id}/reject`, { method: 'PATCH', body: { reason } }),
  reassign: (id: string, assigneeId: string) =>
    api(`/assignments/${id}/reassign`, { method: 'POST', body: { assigneeId } }),
};

// ---------- Ratings ----------
export const RatingsApi = {
  list: (taskId: string) => api<TaskRating[]>(`/tasks/${taskId}/ratings`),
  rate: (taskId: string, score: number, feedback?: string) =>
    api<TaskRating>(`/tasks/${taskId}/ratings`, {
      method: 'POST',
      body: { score, feedback },
    }),
};

// ---------- Comments ----------
export const CommentsApi = {
  list: (taskId: string) => api<TaskComment[]>(`/tasks/${taskId}/comments`),
  add: (taskId: string, content: string) =>
    api<TaskComment>(`/tasks/${taskId}/comments`, { method: 'POST', body: { content } }),
  remove: (id: string) => api(`/comments/${id}`, { method: 'DELETE' }),
};

// ---------- Attachments ----------
export const AttachmentsApi = {
  uploadToTask: (taskId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api(`/tasks/${taskId}/attachments`, { method: 'POST', body: form, isForm: true });
  },
  remove: (id: string) => api(`/attachments/${id}`, { method: 'DELETE' }),
};

// ---------- Notifications ----------
export const NotificationsApi = {
  list: () => api<Paginated<Notification>>('/notifications'),
  markRead: (id: string) => api(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => api('/notifications/read-all', { method: 'PATCH' }),
  remove: (id: string) => api(`/notifications/${id}`, { method: 'DELETE' }),
};

// ---------- Audit Logs ----------
export const AuditLogsApi = {
  search: (params: Record<string, string> = {}) =>
    api<Paginated<AuditLogEntry>>(`/audit-logs?${new URLSearchParams(params)}`),
};

// ---------- Reports ----------
export const ReportsApi = {
  taskSummary: () => api('/reports/task-summary'),
  userPerformance: () => api('/reports/user-performance'),
  branchOverview: () => api('/reports/branch-overview'),
};
