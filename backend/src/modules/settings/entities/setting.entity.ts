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
  @Column({
    type: 'enum',
    enum: SettingType,
    enumName: 'setting_type_enum',
  })
  type!: SettingType;

  @Column({ name: 'code_ar', type: 'varchar', length: 100 })
  codeAr!: string;

  @Column({ name: 'code_en', type: 'varchar', length: 100 })
  codeEn!: string;

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

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt?: Date;
}
