import { api } from './api';
import type {
  AuditLogEntry,
  BrandingSettings,
  Notification,
  Paginated,
  Project,
  Setting,
  SettingType,
  SettingValueType,
  Task,
  TaskAttachment,
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
  forgotPassword: (email: string) =>
    api<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  resetPassword: (token: string, newPassword: string) =>
    api<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, newPassword },
    }),
};

// ---------- Public directory (unauthenticated; powers the sign-up form) ----------
// Branch and Department are independent, filtered slices of the polymorphic
// Setting list, so there is no cascading branchId filter here.
export const PublicApi = {
  branches: () =>
    api<{ id: string; codeAr: string; codeEn: string; valueAr?: string; valueEn?: string }[]>(
      '/public/branches',
    ),
  departments: () =>
    api<{ id: string; codeAr: string; codeEn: string; valueAr?: string; valueEn?: string }[]>(
      '/public/departments',
    ),
};

// ---------- Settings ----------
// Setting is the single polymorphic table behind Departments, Branches and
// Project Settings — pass `type` to work with just one "table" at a time.
export interface CreateSettingPayload {
  type: SettingType;
  // Required together for department/branch/project_setting. For the four
  // list types (task_status/task_type/task_priority/project_status), only
  // one is required — whichever language was active when the entry was
  // added; the other stays blank until edited later from that language.
  codeAr?: string;
  codeEn?: string;
  // Optional/ignored for the four list types (task_status/task_type/
  // task_priority/project_status) — the backend derives these from
  // codeAr/codeEn automatically. Required for department/branch/
  // project_setting.
  valueType?: SettingValueType;
  valueAr?: string;
  valueEn?: string;
  valueNumber?: number;
  address?: string;
  isAdminDepartment?: boolean;
}

export const SettingsApi = {
  list: (type?: SettingType, activeOnly?: boolean) =>
    api<Setting[]>(
      `/settings${type ? `?type=${type}${activeOnly ? '&isActive=true' : ''}` : activeOnly ? '?isActive=true' : ''}`,
    ),
  get: (id: string) => api<Setting>(`/settings/${id}`),
  create: (data: CreateSettingPayload) =>
    api<Setting>('/settings', { method: 'POST', body: data }),
  update: (id: string, data: Partial<CreateSettingPayload> & { isActive?: boolean }) =>
    api<Setting>(`/settings/${id}`, { method: 'PATCH', body: data }),
  remove: (id: string) => api(`/settings/${id}`, { method: 'DELETE' }),
};

// Thin, type-pinned wrappers kept so existing Branch/Department call sites
// (task forms, user forms, etc.) don't need to pass `type` everywhere.
export const BranchesApi = {
  list: () => SettingsApi.list('branch'),
  create: (data: Omit<CreateSettingPayload, 'type'>) =>
    SettingsApi.create({ ...data, type: 'branch' }),
  update: (id: string, data: Partial<CreateSettingPayload>) => SettingsApi.update(id, data),
  remove: (id: string) => SettingsApi.remove(id),
};

export const DepartmentsApi = {
  list: () => SettingsApi.list('department'),
  create: (data: Omit<CreateSettingPayload, 'type'>) =>
    SettingsApi.create({ ...data, type: 'department' }),
  update: (id: string, data: Partial<CreateSettingPayload>) => SettingsApi.update(id, data),
  remove: (id: string) => SettingsApi.remove(id),
};

// ---------- Branding ----------
export interface UpdateBrandingPayload {
  siteName?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export const BrandingApi = {
  get: () => api<BrandingSettings>('/branding'),
  update: (data: UpdateBrandingPayload) =>
    api<BrandingSettings>('/branding', { method: 'PATCH', body: data }),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<BrandingSettings>('/branding/logo', { method: 'POST', body: form, isForm: true });
  },
  removeLogo: () => api<BrandingSettings>('/branding/logo', { method: 'DELETE' }),
  uploadFavicon: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<BrandingSettings>('/branding/favicon', {
      method: 'POST',
      body: form,
      isForm: true,
    });
  },
  removeFavicon: () => api<BrandingSettings>('/branding/favicon', { method: 'DELETE' }),
};

// ---------- Users ----------
export const UsersApi = {
  list: (params: Record<string, string> = {}) =>
    api<Paginated<User>>(`/users?${new URLSearchParams(params)}`),
  get: (id: string) => api<User>(`/users/${id}`),
  adminUpdate: (id: string, data: Partial<User> & { password?: string }) =>
    api<User>(`/users/${id}`, { method: 'PATCH', body: data }),
  updateOwnProfile: (data: { fullName?: string; phone?: string }) =>
    api<User>('/users/me', { method: 'PATCH', body: data }),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<User>('/users/me/avatar', { method: 'POST', body: form, isForm: true });
  },
  removeAvatar: () => api<User>('/users/me/avatar', { method: 'DELETE' }),
  deactivate: (id: string) => api(`/users/${id}`, { method: 'DELETE' }),
  remove: (id: string) => api(`/users/${id}/permanent`, { method: 'DELETE' }),
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
  unarchive: (id: string) => api<Project>(`/projects/${id}/unarchive`, { method: 'POST' }),
  remove: (id: string) => api(`/projects/${id}`, { method: 'DELETE' }),
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
  // "My Tasks": assigned to me (single assignee or multi-assignee),
  // filterable by importance (priority), rating, and upcoming deadline.
  mine: (params: Record<string, string> = {}) =>
    api<Paginated<Task>>(`/tasks/mine?${new URLSearchParams(params)}`),
  // "Assigned by me": Tasks the current user created for someone else.
  assignedByMe: (params: Record<string, string> = {}) =>
    api<Paginated<Task>>(`/tasks/assigned-by-me?${new URLSearchParams(params)}`),
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
  unarchive: (id: string) => api<Task>(`/tasks/${id}/unarchive`, { method: 'POST' }),
  remove: (id: string) => api(`/tasks/${id}`, { method: 'DELETE' }),
  // Creator/Admin-only: whether assignee(s) may download this Task's attachments.
  updateAttachmentPermissions: (id: string, assigneeCanDownloadAttachments: boolean) =>
    api<Task>(`/tasks/${id}/attachment-permissions`, {
      method: 'PATCH',
      body: { assigneeCanDownloadAttachments },
    }),
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
  reassign: (id: string, newAssigneeId: string, dueDate?: string) =>
    api(`/assignments/${id}/reassign`, { method: 'POST', body: { newAssigneeId, dueDate } }),
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
  // Accepts one or more files at once; the backend saves each as its own attachment.
  uploadToTask: (taskId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return api<TaskAttachment[]>(`/tasks/${taskId}/attachments`, {
      method: 'POST',
      body: form,
      isForm: true,
    });
  },
  remove: (id: string) => api(`/attachments/${id}`, { method: 'DELETE' }),
  // Same file-bytes endpoint powers both preview and download; the backend
  // only enforces the per-Task download toggle when `intent=download` is
  // present, so preview stays unaffected by that setting.
  previewPath: (id: string) => `/attachments/${id}`,
  downloadPath: (id: string) => `/attachments/${id}?intent=download`,
};

// ---------- Notifications ----------
export const NotificationsApi = {
  list: (params: Record<string, string> = {}) =>
    api<Paginated<Notification>>(`/notifications?${new URLSearchParams(params)}`),
  unreadCount: () =>
    NotificationsApi.list({ unreadOnly: 'true', limit: '1' }).then((res) => res.total),
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
  taskSummary: (params: Record<string, string> = {}) =>
    api(`/reports/task-summary?${new URLSearchParams(params)}`),
  monthlySummary: (params: Record<string, string> = {}) =>
    api<{ month: string; done: number; notDone: number }[]>(
      `/reports/monthly-summary?${new URLSearchParams(params)}`,
    ),
  userPerformance: () => api('/reports/user-performance'),
  branchOverview: () =>
    api<
      { branchId: string; branchName: string; totalTasks: string; completedTasks: string; overdueTasks: string }[]
    >('/reports/branch-overview'),
  departmentOverview: () =>
    api<
      {
        departmentId: string;
        departmentName: string;
        totalTasks: string;
        completedTasks: string;
        overdueTasks: string;
      }[]
    >('/reports/department-overview'),
};