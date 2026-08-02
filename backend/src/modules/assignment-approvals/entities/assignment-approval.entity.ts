import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TaskAssignmentEntity } from '../../task-assignments/entities/task-assignment.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { ApprovalDecision } from '../../../shared/enums/approval-decision.enum';

@Entity('assignment_approvals')
@Index(['assignmentId'])
export class AssignmentApprovalEntity extends BaseEntity {
  @Column({ name: 'assignment_id', type: 'uuid' })
  assignmentId!: string;

  @ManyToOne(() => TaskAssignmentEntity, (a) => a.approvals)
  @JoinColumn({ name: 'assignment_id' })
  assignment!: TaskAssignmentEntity;

  @Column({ name: 'approver_id', type: 'uuid' })
  approverId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'approver_id' })
  approver!: UserEntity;

  @Column({
    type: 'enum',
    enum: ApprovalDecision,
    enumName: 'approval_decision_enum',
  })
  decision!: ApprovalDecision;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'decided_at', type: 'timestamptz' })
  decidedAt!: Date;
}
