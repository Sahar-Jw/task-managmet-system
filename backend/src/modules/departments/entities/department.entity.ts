import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';

/**
 * Department is a standalone lookup entity. Per project decision, Department
 * does NOT declare any relation (ManyToOne/OneToMany) to any other entity
 * (not even Branch). Only the Task entity references Department (via a
 * plain `departmentId` FK).
 */
@Entity('departments')
export class DepartmentEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt?: Date;

  @Column({ name: 'is_admin_department', type: 'boolean', default: false })
  isAdminDepartment!: boolean;
}
