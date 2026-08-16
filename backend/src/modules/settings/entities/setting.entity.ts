import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { SettingType } from '../../../shared/enums/setting-type.enum';
import { SettingValueType } from '../../../shared/enums/setting-value-type.enum';

/**
 * Setting is a single polymorphic lookup table that replaces the old
 * standalone Department and Branch tables, and also carries generic
 * Project Settings (config key/value pairs). Every row is one of
 * SettingType (department / branch / project_setting), never mixed.
 *
 * Every row has a bilingual code (codeAr/codeEn). The row's value can be
 * EITHER a bilingual string pair (valueAr/valueEn) OR a plain number
 * (valueNumber) — `valueType` says which one is in use; only that pair of
 * columns should be populated, the other stays null.
 *
 * `address` and `isAdminDepartment` are the two extra fields the old
 * Branch/Department tables had; they only apply when type is BRANCH /
 * DEPARTMENT respectively and are ignored otherwise.
 *
 * Per project decision, Setting does NOT declare relations to any other
 * entity (mirroring the old Department/Branch design). Task references a
 * Setting row via a plain branchId/departmentId FK.
 */
@Entity('settings')
@Index(['type'])
export class SettingEntity extends BaseEntity {
  // Plain varchar rather than a Postgres native enum, on purpose: new
  // SettingType categories (like the TASK_STATUS/TASK_TYPE/TASK_PRIORITY/
  // PROJECT_STATUS list types) can be introduced without an
  // `ALTER TYPE ... ADD VALUE` migration.
  @Column({ type: 'varchar', length: 50 })
  type!: SettingType;

  @Column({ name: 'code_ar', type: 'varchar', length: 100 })
  codeAr!: string;

  @Column({ name: 'code_en', type: 'varchar', length: 100 })
  codeEn!: string;

  // Stable machine key, only used by the four LIST_SETTING_TYPES categories.
  // This is what actually gets stored on task.status/taskType/priority and
  // project.status — NOT the row's id — so relabeling AR/EN text never
  // touches existing Task/Project data. Set once at creation, immutable
  // after that. Null for department/branch/project_setting rows.
  @Column({ type: 'varchar', length: 150, nullable: true })
  key?: string;

  // True for the rows seeded from the original TaskStatus/TaskType/
  // TaskPriority/ProjectStatus enums — they drive real workflow logic
  // (approval routing, completion rules, archiving) elsewhere in the app,
  // so they can be relabeled but never deleted. Admin-added custom rows
  // are isSystem=false and fully deletable.
  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({
    name: 'value_type',
    type: 'enum',
    enum: SettingValueType,
    enumName: 'setting_value_type_enum',
    default: SettingValueType.STRING,
  })
  valueType!: SettingValueType;

  // Populated when valueType = STRING; null otherwise.
  @Column({ name: 'value_ar', type: 'varchar', length: 255, nullable: true })
  valueAr?: string;

  @Column({ name: 'value_en', type: 'varchar', length: 255, nullable: true })
  valueEn?: string;

  // Populated when valueType = NUMBER; null otherwise.
  @Column({ name: 'value_number', type: 'numeric', precision: 14, scale: 2, nullable: true })
  valueNumber?: string;

  // Branch-only extra field (kept from the old BranchEntity).
  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  // Department-only extra field (kept from the old DepartmentEntity).
  @Column({ name: 'is_admin_department', type: 'boolean', default: false })
  isAdminDepartment!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;
}
