import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { AssignmentApprovalEntity } from '../../assignment-approvals/entities/assignment-approval.entity';
import { TaskAttachmentEntity } from '../../task-attachments/entities/task-attachment.entity';
import { VersionedEntity } from '../../../shared/entities/versioned-base.entity';
import { AssignmentStatus } from '../../../shared/enums/assignment-status.enum';

@Entity('task_assignments')
@Index(['taskId'])
@Index(['assigneeId'])
@Index(['status'])
export class TaskAssignmentEntity extends VersionedEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => TaskEntity, (task) => task.assignments)
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @Column({ name: 'assignee_id', type: 'uuid' })
  assigneeId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'assignee_id' })
  assignee!: UserEntity;

  @Column({ name: 'assigned_by', type: 'uuid' })
  assignedById!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'assigned_by' })
  assignedBy!: UserEntity;

  @Column({
    type: 'enum',
    enum: AssignmentStatus,
    enumName: 'assignment_status_enum',
    default: AssignmentStatus.PENDING_ACCEPTANCE,
  })
  status!: AssignmentStatus;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt?: Date;

  @OneToMany(() => AssignmentApprovalEntity, (a) => a.assignment)
  approvals!: AssignmentApprovalEntity[];

  @OneToMany(() => TaskAttachmentEntity, (a) => a.assignment)
  attachments!: TaskAttachmentEntity[];
}
