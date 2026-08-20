import { api } from './api';

import type {
  AuditLogEntry,
  BrandingSettings,
  Notification,
  Paginated,
  Project,
  Role,
  Setting,
  SettingType,
  SettingValueType,
  Task,
  TaskAssignment,
  TaskAttachment,
  TaskComment,
  TaskRating,
  TaskWorkflowActionKey,
  TaskWorkflowConfig,
  TaskWorkflowMode,
  User,
} from './types';

/*
 * ============================================================
 * AUTH
 * ============================================================
 */

export const AuthApi = {
  login: (
    email: string,
    password: string,
  ) =>
    api<{
      accessToken: string;
      user: User;
    }>(
      '/auth/login',
      {
        method: 'POST',

        body: {
          email,
          password,
        },
      },
    ),

  register: (
    data: {
      fullName: string;
      email: string;
      password: string;
      branchId: string;
      departmentId: string;
      phone?: string;
    },
  ) =>
    api<{
      accessToken: string;
      user: User;
    }>(
      '/auth/register',
      {
        method: 'POST',
        body: data,
      },
    ),

  logout: () =>
    api(
      '/auth/logout',
      {
        method: 'POST',
      },
    ),

  me: () =>
    api<User>(
      '/users/me',
    ),

  forgotPassword: (
    email: string,
  ) =>
    api<{
      message: string;
    }>(
      '/auth/forgot-password',
      {
        method: 'POST',

        body: {
          email,
        },
      },
    ),

  resetPassword: (
    token: string,
    newPassword: string,
  ) =>
    api<{
      message: string;
    }>(
      '/auth/reset-password',
      {
        method: 'POST',

        body: {
          token,
          newPassword,
        },
      },
    ),
};

/*
 * ============================================================
 * PUBLIC DIRECTORY
 * ============================================================
 */

export const PublicApi = {
  branches: () =>
    api<
      {
        id: string;
        codeAr: string;
        codeEn: string;
        valueAr?: string;
        valueEn?: string;
      }[]
    >(
      '/public/branches',
    ),

  departments: () =>
    api<
      {
        id: string;
        codeAr: string;
        codeEn: string;
        valueAr?: string;
        valueEn?: string;
      }[]
    >(
      '/public/departments',
    ),
};

/*
 * ============================================================
 * SETTINGS
 * ============================================================
 */

export interface CreateSettingPayload {
  type: SettingType;

  codeAr?: string;
  codeEn?: string;

  valueType?: SettingValueType;

  valueAr?: string;
  valueEn?: string;

  valueNumber?: number;

  address?: string;

  isAdminDepartment?: boolean;
}

export const SettingsApi = {
  list: (
    type?: SettingType,
    activeOnly?: boolean,
  ) =>
    api<Setting[]>(
      `/settings${
        type
          ? `?type=${type}${
              activeOnly
                ? '&isActive=true'
                : ''
            }`
          : activeOnly
            ? '?isActive=true'
            : ''
      }`,
    ),

  get: (
    id: string,
  ) =>
    api<Setting>(
      `/settings/${id}`,
    ),

  create: (
    data:
      CreateSettingPayload,
  ) =>
    api<Setting>(
      '/settings',
      {
        method: 'POST',
        body: data,
      },
    ),

  update: (
    id: string,
    data:
      Partial<CreateSettingPayload> & {
        isActive?: boolean;
      },
  ) =>
    api<Setting>(
      `/settings/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),

  remove: (
    id: string,
  ) =>
    api(
      `/settings/${id}`,
      {
        method: 'DELETE',
      },
    ),
};

export const BranchesApi = {
  list: () =>
    SettingsApi.list(
      'branch',
    ),

  create: (
    data:
      Omit<
        CreateSettingPayload,
        'type'
      >,
  ) =>
    SettingsApi.create({
      ...data,
      type: 'branch',
    }),

  update: (
    id: string,
    data:
      Partial<CreateSettingPayload>,
  ) =>
    SettingsApi.update(
      id,
      data,
    ),

  remove: (
    id: string,
  ) =>
    SettingsApi.remove(
      id,
    ),
};

export const DepartmentsApi = {
  list: () =>
    SettingsApi.list(
      'department',
    ),

  create: (
    data:
      Omit<
        CreateSettingPayload,
        'type'
      >,
  ) =>
    SettingsApi.create({
      ...data,
      type: 'department',
    }),

  update: (
    id: string,
    data:
      Partial<CreateSettingPayload>,
  ) =>
    SettingsApi.update(
      id,
      data,
    ),

  remove: (
    id: string,
  ) =>
    SettingsApi.remove(
      id,
    ),
};

/*
 * ============================================================
 * BRANDING
 * ============================================================
 */

export interface UpdateBrandingPayload {
  siteName?: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
}

export const BrandingApi = {
  get: () =>
    api<BrandingSettings>(
      '/branding',
    ),

  update: (
    data:
      UpdateBrandingPayload,
  ) =>
    api<BrandingSettings>(
      '/branding',
      {
        method: 'PATCH',
        body: data,
      },
    ),

  uploadLogo: (
    file: File,
  ) => {
    const form =
      new FormData();

    form.append(
      'file',
      file,
    );

    return api<BrandingSettings>(
      '/branding/logo',
      {
        method: 'POST',
        body: form,
        isForm: true,
      },
    );
  },

  removeLogo: () =>
    api<BrandingSettings>(
      '/branding/logo',
      {
        method: 'DELETE',
      },
    ),

  uploadFavicon: (
    file: File,
  ) => {
    const form =
      new FormData();

    form.append(
      'file',
      file,
    );

    return api<BrandingSettings>(
      '/branding/favicon',
      {
        method: 'POST',
        body: form,
        isForm: true,
      },
    );
  },

  removeFavicon: () =>
    api<BrandingSettings>(
      '/branding/favicon',
      {
        method: 'DELETE',
      },
    ),
};

/*
 * ============================================================
 * USERS
 * ============================================================
 */

export const UsersApi = {
  list: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<Paginated<User>>(
      `/users?${new URLSearchParams(
        params,
      )}`,
    ),


  /*
   * ADMIN role selector/filter.
   *
   * RolesController is mounted at /roles,
   * NOT /users/roles.
   */
  roles: () =>
    api<Role[]>(
      '/roles',
    ),


  get: (
    id:
      string,
  ) =>
    api<User>(
      `/users/${id}`,
    ),


  adminUpdate: (
    id:
      string,

    data:
      Partial<User> & {
        password?:
          string;
      },
  ) =>
    api<User>(
      `/users/${id}`,
      {
        method:
          'PATCH',

        body:
          data,
      },
    ),


  updateOwnProfile: (
    data: {
      fullName?:
        string;

      phone?:
        string;

      locale?:
        string;

      timezone?:
        string;
    },
  ) =>
    api<User>(
      '/users/me',
      {
        method:
          'PATCH',

        body:
          data,
      },
    ),


  changeOwnPassword: (
    data: {
      currentPassword:
        string;

      newPassword:
        string;
    },
  ) =>
    api<{
      message?:
        string;
    }>(
      '/users/me/password',
      {
        method:
          'PATCH',

        body:
          data,
      },
    ),


  uploadAvatar: (
    file:
      File,
  ) => {
    const form =
      new FormData();


    form.append(
      'file',
      file,
    );


    return api<User>(
      '/users/me/avatar',
      {
        method:
          'POST',

        body:
          form,

        isForm:
          true,
      },
    );
  },


  removeAvatar: () =>
    api<User>(
      '/users/me/avatar',
      {
        method:
          'DELETE',
      },
    ),


  deactivate: (
    id:
      string,
  ) =>
    api(
      `/users/${id}`,
      {
        method:
          'DELETE',
      },
    ),


  remove: (
    id:
      string,
  ) =>
    api(
      `/users/${id}/permanent`,
      {
        method:
          'DELETE',
      },
    ),


  unlock: (
    id:
      string,
  ) =>
    api<User>(
      `/users/${id}/unlock`,
      {
        method:
          'PATCH',
      },
    ),
};
/*
 * ============================================================
 * PROJECTS
 * ============================================================
 */

export const ProjectsApi = {
  list: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<Paginated<Project>>(
      `/projects?${new URLSearchParams(
        params,
      )}`,
    ),

  get: (
    id: string,
  ) =>
    api<Project>(
      `/projects/${id}`,
    ),

  create: (
    data: {
      name: string;
      description?: string;
      startDate?: string;
      endDate?: string;
    },
  ) =>
    api<Project>(
      '/projects',
      {
        method: 'POST',
        body: data,
      },
    ),

  update: (
    id: string,
    data:
      Partial<Project>,
  ) =>
    api<Project>(
      `/projects/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),

  archive: (
    id: string,
  ) =>
    api<Project>(
      `/projects/${id}/archive`,
      {
        method: 'POST',
      },
    ),

  unarchive: (
    id: string,
  ) =>
    api<Project>(
      `/projects/${id}/unarchive`,
      {
        method: 'POST',
      },
    ),

  remove: (
    id: string,
  ) =>
    api(
      `/projects/${id}`,
      {
        method: 'DELETE',
      },
    ),
};

/*
 * ============================================================
 * TASKS
 * ============================================================
 */

export interface CreateTaskPayload {
  title: string;

  description?: string;

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
  deadlineDate: string;
}

/*
 * PATCH:
 *
 * undefined -> unchanged
 * null      -> clear
 */
export interface UpdateTaskPayload {
  title?: string | null;

  description?: string | null;

  taskType?: string | null;
  priority?: string | null;
  color?: string | null;

  branchId?: string | null;
  departmentId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;

  assignedToId?: string | null;

  needsApproval?: boolean;
  approverId?: string | null;

  needsBudget?: boolean;
  budgetMin?: string | null;
  budgetMax?: string | null;
  budgetCurrency?: string | null;

  startDate?: string | null;
  deadlineDate?: string | null;
}

export const TasksApi = {
  list: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<Paginated<Task>>(
      `/tasks?${new URLSearchParams(
        params,
      )}`,
    ),

  mine: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<Paginated<Task>>(
      `/tasks/mine?${new URLSearchParams(
        params,
      )}`,
    ),

  assignedByMe: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<Paginated<Task>>(
      `/tasks/assigned-by-me?${new URLSearchParams(
        params,
      )}`,
    ),

  get: (
    id: string,
  ) =>
    api<Task>(
      `/tasks/${id}`,
    ),

  create: (
    data:
      CreateTaskPayload,
  ) =>
    api<Task>(
      '/tasks',
      {
        method: 'POST',
        body: data,
      },
    ),

  update: (
    id: string,
    data:
      UpdateTaskPayload,
  ) =>
    api<Task>(
      `/tasks/${id}`,
      {
        method: 'PATCH',
        body: data,
      },
    ),

  changeStatus: (
    id: string,
    status: string,
    reason?: string,
  ) =>
    api<Task>(
      `/tasks/${id}/status`,
      {
        method: 'PATCH',

        body: {
          status,
          reason,
        },
      },
    ),

  decideApproval: (
    id: string,
    approve: boolean,
    rejectionReason?: string,
  ) =>
    api<Task>(
      `/tasks/${id}/approval`,
      {
        method: 'PATCH',

        body: {
          approve,
          rejectionReason,
        },
      },
    ),

  reopen: (
    id: string,
    reason: string,
  ) =>
    api<Task>(
      `/tasks/${id}/reopen`,
      {
        method: 'POST',

        body: {
          status:
            'Reopened',

          reason,
        },
      },
    ),

  unarchive: (
    id: string,
  ) =>
    api<Task>(
      `/tasks/${id}/unarchive`,
      {
        method: 'POST',
      },
    ),

  remove: (
    id: string,
  ) =>
    api(
      `/tasks/${id}`,
      {
        method: 'DELETE',
      },
    ),

  updateAttachmentPermissions: (
    id: string,
    assigneeCanDownloadAttachments:
      boolean,
  ) =>
    api<Task>(
      `/tasks/${id}/attachment-permissions`,
      {
        method: 'PATCH',

        body: {
          assigneeCanDownloadAttachments,
        },
      },
    ),
};

/*
 * ============================================================
 * TASK ASSIGNMENTS
 * ============================================================
 */

export const AssignmentsApi = {
  list: (
    taskId:
      string,
  ) =>
    api<
      TaskAssignment[]
    >(
      `/tasks/${taskId}/assignments`,
    ),


  assign: (
    taskId:
      string,

    assigneeId:
      string,

    dueDate:
      string,
  ) =>
    api<TaskAssignment>(
      `/tasks/${taskId}/assignments`,
      {
        method:
          'POST',

        body: {
          assigneeId,
          dueDate,
        },
      },
    ),


  accept: (
    id:
      string,
  ) =>
    api<TaskAssignment>(
      `/assignments/${id}/accept`,
      {
        method:
          'PATCH',
      },
    ),


  reject: (
    id:
      string,

    reason:
      string,
  ) =>
    api<TaskAssignment>(
      `/assignments/${id}/reject`,
      {
        method:
          'PATCH',

        body: {
          reason,
        },
      },
    ),


  reassign: (
    id:
      string,

    newAssigneeId:
      string,

    dueDate:
      string,
  ) =>
    api<TaskAssignment>(
      `/assignments/${id}/reassign`,
      {
        method:
          'POST',

        body: {
          newAssigneeId,
          dueDate,
        },
      },
    ),
};

/*
 * ============================================================
 * RATINGS
 * ============================================================
 */

export const RatingsApi = {
  list: (
    taskId: string,
  ) =>
    api<TaskRating[]>(
      `/tasks/${taskId}/ratings`,
    ),

  rate: (
    taskId: string,
    score: number,
    feedback?: string,
  ) =>
    api<TaskRating>(
      `/tasks/${taskId}/ratings`,
      {
        method: 'POST',

        body: {
          score,
          feedback,
        },
      },
    ),
};

/*
 * ============================================================
 * COMMENTS
 * ============================================================
 */

export const CommentsApi = {
  list: (
    taskId: string,
  ) =>
    api<TaskComment[]>(
      `/tasks/${taskId}/comments`,
    ),

  add: (
    taskId: string,
    content: string,
  ) =>
    api<TaskComment>(
      `/tasks/${taskId}/comments`,
      {
        method: 'POST',

        body: {
          content,
        },
      },
    ),

  remove: (
    id: string,
  ) =>
    api(
      `/comments/${id}`,
      {
        method: 'DELETE',
      },
    ),
};

/*
 * ============================================================
 * ATTACHMENTS
 * ============================================================
 */

export const AttachmentsApi = {
  uploadToTask: (
    taskId: string,
    files: File[],
  ) => {
    const form =
      new FormData();

    files.forEach(
      (file) =>
        form.append(
          'files',
          file,
        ),
    );

    return api<
      TaskAttachment[]
    >(
      `/tasks/${taskId}/attachments`,
      {
        method: 'POST',
        body: form,
        isForm: true,
      },
    );
  },

  remove: (
    id: string,
  ) =>
    api(
      `/attachments/${id}`,
      {
        method: 'DELETE',
      },
    ),

  previewPath: (
    id: string,
  ) =>
    `/attachments/${id}`,

  downloadPath: (
    id: string,
  ) =>
    `/attachments/${id}?intent=download`,
};

/* ============================================================
 * NOTIFICATIONS
 * ============================================================ */

export const NotificationsApi = {
  /*
   * ==========================================================
   * LIST
   * ==========================================================
   */

  list: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<
      Paginated<Notification>
    >(
      `/notifications?${new URLSearchParams(
        params,
      )}`,
    ),


  /*
   * ==========================================================
   * UNREAD COUNT
   * ==========================================================
   */

  unreadCount: () =>
    api<{
      count:
        number;
    }>(
      '/notifications/unread-count',
    ).then(
      (
        response,
      ) =>
        response.count,
    ),


  /*
   * ==========================================================
   * MARK ONE READ
   * ==========================================================
   */

  markRead: (
    id:
      string,
  ) =>
    api<Notification>(
      `/notifications/${id}/read`,
      {
        method:
          'PATCH',
      },
    ),


  /*
   * ==========================================================
   * MARK ALL READ
   * ==========================================================
   */

  markAllRead: () =>
    api<{
      updated:
        number;
    }>(
      '/notifications/read-all',
      {
        method:
          'PATCH',
      },
    ),


  /*
   * ==========================================================
   * DELETE ONE
   * ==========================================================
   */

  remove: (
    id:
      string,
  ) =>
    api<{
      deleted:
        boolean;
    }>(
      `/notifications/${id}`,
      {
        method:
          'DELETE',
      },
    ),


  /*
   * ==========================================================
   * CLEAR READ
   * ==========================================================
   */

  clearRead: () =>
    api<{
      deleted:
        number;
    }>(
      '/notifications/read',
      {
        method:
          'DELETE',
      },
    ),
};

/*
 * ============================================================
 * AUDIT LOGS
 * ============================================================
 */

/* ============================================================
 * AUDIT LOGS
 * ============================================================ */

export const AuditLogsApi = {
  /*
   * Search / list.
   */
  search: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<
      Paginated<AuditLogEntry>
    >(
      `/audit-logs?${new URLSearchParams(
        params,
      )}`,
    ),


  /*
   * Dynamic filter values.
   */
  meta: () =>
    api<{
      entityTypes:
        string[];

      actions:
        string[];
    }>(
      '/audit-logs/meta',
    ),


  /*
   * Full single entry.
   */
  get: (
    id: string,
  ) =>
    api<AuditLogEntry>(
      `/audit-logs/${id}`,
    ),
};


export const DictionaryApi = {
  getAll: () =>
    api<import('./types').DictionaryEntry[]>(
      '/dictionary',
      { showLoader: false },
    ),

  replaceAll: (
    entries: import('./types').DictionaryEntry[],
  ) =>
    api<import('./types').DictionaryEntry[]>(
      '/dictionary',
      {
        method: 'PUT',
        body: { entries },
      },
    ),
};

/*
 * ============================================================
 * REPORTS
 * ============================================================
 */

export const ReportsApi = {
  taskSummary: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api(
      `/reports/task-summary?${new URLSearchParams(
        params,
      )}`,
    ),

  monthlySummary: (
    params:
      Record<
        string,
        string
      > = {},
  ) =>
    api<
      {
        month: string;
        done: number;
        notDone: number;
      }[]
    >(
      `/reports/monthly-summary?${new URLSearchParams(
        params,
      )}`,
    ),

  userPerformance:
    () =>
      api(
        '/reports/user-performance',
      ),

  branchOverview:
    () =>
      api<
        {
          branchId: string;
          branchName: string;
          totalTasks: string;
          completedTasks: string;
          overdueTasks: string;
        }[]
      >(
        '/reports/branch-overview',
      ),

  departmentOverview:
    () =>
      api<
        {
          departmentId: string;
          departmentName: string;
          totalTasks: string;
          completedTasks: string;
          overdueTasks: string;
        }[]
      >(
        '/reports/department-overview',
      ),
};

/*
 * ============================================================
 * TASK WORKFLOW
 * ============================================================
 */

export const TaskWorkflowApi = {
  get: () =>
    api<TaskWorkflowConfig>(
      '/task-workflow',
    ),


  update: (
    data: {
      mode:
        TaskWorkflowMode;

      actions:
        {
          key:
            TaskWorkflowActionKey;

          enabled:
            boolean;

          order:
            number;
        }[];
    },
  ) =>
    api<TaskWorkflowConfig>(
      '/task-workflow',
      {
        method:
          'PATCH',

        body:
          data,
      },
    ),
};
