// The polymorphic "kind" a settings row represents. Every row in the
// `settings` table is one of these types; Department and Branch are no
// longer their own tables — they are just rows here filtered by type.
export enum SettingType {
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  PROJECT_SETTING = 'project_setting',
  // Admin-managed, bilingual lookup lists that back the Task/Project
  // classification dropdowns (Settings > "Statuses & Types" tab). The
  // built-in members of TaskStatus/TaskType/TaskPriority/ProjectStatus are
  // seeded here as isSystem=true rows (relabelable, not deletable); admins
  // can freely add/edit/delete additional custom entries on top.
  TASK_STATUS = 'task_status',
  TASK_TYPE = 'task_type',
  TASK_PRIORITY = 'task_priority',
  PROJECT_STATUS = 'project_status',
}

// The four "list" types edited from the Statuses & Types tab, as opposed to
// department/branch/project_setting which keep their existing dedicated UI.
export const LIST_SETTING_TYPES = [
  SettingType.TASK_STATUS,
  SettingType.TASK_TYPE,
  SettingType.TASK_PRIORITY,
  SettingType.PROJECT_STATUS,
];
