import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { RoleEntity } from '../../roles/entities/role.entity';
import { VersionedEntity } from '../../../shared/entities/versioned-base.entity';

@Entity('users')
@Index(['departmentId'])
@Index(['branchId'])
@Index(['roleId'])
export class UserEntity extends VersionedEntity {
  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone?: string;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @ManyToOne(() => RoleEntity, (role) => role.users, { eager: true })
  @JoinColumn({ name: 'role_id' })
  role!: RoleEntity;

  // NOTE: Department and Branch are just rows in the polymorphic Setting
  // entity (see SettingType.DEPARTMENT / SettingType.BRANCH), which has no
  // relations declared on its side. These are kept here as plain reference
  // IDs (not TypeORM relations) so a User can still record which
  // Department/Branch it organizationally belongs to, without Setting
  // having to know about Users.
  //
  // department_id is nullable: Admins don't belong to a Department at all
  // (enforced/cleared in UsersService, see assertDepartmentRule). Every
  // non-Admin User is still required to have one — that rule lives in the
  // service layer rather than a DB constraint, since it depends on role.
  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string | null;

  @Column({ name: 'branch_id', type: 'uuid' })
  branchId!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'failed_login_attempts', type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'varchar', length: 10, default: 'ar' })
  locale!: string;

  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;
}
