import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../../task-assignments/entities/task-assignment.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('task_attachments')
// BR-065: an attachment belongs to exactly one of Task / Assignment, never both, never neither.
@Check(
  `("task_id" IS NOT NULL AND "assignment_id" IS NULL) OR ("task_id" IS NULL AND "assignment_id" IS NOT NULL)`,
)
export class TaskAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId?: string;

  @ManyToOne(() => TaskEntity, (task) => task.attachments, { nullable: true })
  @JoinColumn({ name: 'task_id' })
  task?: TaskEntity;

  @Column({ name: 'assignment_id', type: 'uuid', nullable: true })
  assignmentId?: string;

  @ManyToOne(() => TaskAssignmentEntity, (a) => a.attachments, { nullable: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment?: TaskAssignmentEntity;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  uploadedById!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy!: UserEntity;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;
}
