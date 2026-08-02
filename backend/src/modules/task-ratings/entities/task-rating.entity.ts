import { Check, Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { TaskEntity } from '../../tasks/entities/task.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { BaseEntity } from '../../../shared/entities/base.entity';

@Entity('task_ratings')
@Unique(['taskId', 'ratedById']) // BR-056: one rating per rater per task
@Check(`"score" BETWEEN 1 AND 5`) // BR-057
export class TaskRatingEntity extends BaseEntity {
  @Column({ name: 'task_id', type: 'uuid' })
  taskId!: string;

  @ManyToOne(() => TaskEntity, (task) => task.ratings)
  @JoinColumn({ name: 'task_id' })
  task!: TaskEntity;

  @Column({ name: 'rated_by', type: 'uuid' })
  ratedById!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'rated_by' })
  ratedBy!: UserEntity;

  @Column({ type: 'int' })
  score!: number;

  @Column({ type: 'text', nullable: true })
  feedback?: string;
}
