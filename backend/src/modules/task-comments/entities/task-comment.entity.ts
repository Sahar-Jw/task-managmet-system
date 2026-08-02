import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('task_comments')
@Index(['taskId', 'createdAt'])
export class TaskCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => TaskEntity, (task) => task.comments)
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'author_id' })
  author!: UserEntity;

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'is_edited', type: 'boolean', default: false })
  isEdited!: boolean;

  @Column({ name: 'edited_at', type: 'timestamptz', nullable: true })
  editedAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;
}
