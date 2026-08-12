// The polymorphic "kind" a settings row represents. Every row in the
// `settings` table is one of these types; Department and Branch are no
// longer their own tables — they are just rows here filtered by type.
export enum SettingType {
  DEPARTMENT = 'department',
  BRANCH = 'branch',
  PROJECT_SETTING = 'project_setting',
}
