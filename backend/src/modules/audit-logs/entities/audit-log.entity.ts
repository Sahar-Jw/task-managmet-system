import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { AuditAction } from '../../../shared/enums/audit-action.enum';

/**
 * Audit logs are append-only (BR-076, NFR-AUD-02). No UPDATE or DELETE
 * repository methods are exposed anywhere in the codebase for this entity;
 * additionally, the `database/seeds/audit-immutability.sql` script revokes
 * UPDATE/DELETE grants at the database role level for the app user.
 */
@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['actorId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'actor_id' })
  actor?: UserEntity;

  @Column({ name: 'entity_type', type: 'varchar', length: 50 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'uuid' })
  entityId!: string;

  @Column({ type: 'enum', enum: AuditAction, enumName: 'audit_action_enum' })
  action!: AuditAction;

  @Column({ name: 'old_value', type: 'json', nullable: true })
  oldValue?: Record<string, any>;

  @Column({ name: 'new_value', type: 'json', nullable: true })
  newValue?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
