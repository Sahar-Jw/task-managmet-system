import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { SettingEntity } from '../../settings/entities/setting.entity';
import { ProjectEntity } from '../../projects/entities/project.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { TaskAssignmentEntity } from '../../task-assignments/entities/task-assignment.entity';
import { TaskCommentEntity } from '../../task-comments/entities/task-comment.entity';
import { TaskAttachmentEntity } from '../../task-attachments/entities/task-attachment.entity';
import { TaskRatingEntity } from '../../task-ratings/entities/task-rating.entity';
import { VersionedEntity } from '../../../shared/entities/versioned-base.entity';
import { TaskStatus } from '../../../shared/enums/task-status.enum';
import { TaskPriority } from '../../../shared/enums/task-priority.enum';
import { TaskType } from '../../../shared/enums/task-type.enum';
import { ApprovalStatus } from '../../../shared/enums/approval-status.enum';

/**
 * Task is the central/hub entity of the system. Branch and Department are
 * now just rows in the polymorphic `settings` table (SettingType.BRANCH /
 * SettingType.DEPARTMENT); Project remains its own standalone lookup table.
 * Task is the ONLY entity that relates to all three, each independently
 * (a Task can have a Branch, a Department and a Project all set at once,
 * without any of the three needing to reference one another).
 */
@Entity('tasks')
@Check(`"parent_task_id" IS NULL OR "parent_task_id" <> "id"`) // no self-parenting
@Index(['branchId'])
@Index(['departmentId'])
@Index(['projectId'])
@Index(['parentTaskId'])
@Index(['status'])
@Index(['assignedToId'])
@Index(['deadlineDate'])
export class TaskEntity extends VersionedEntity {
  // ---------- Bilingual title & description ----------
  @Column({ name: 'title_ar', type: 'varchar', length: 255 })
  titleAr!: string;

  @Column({ name: 'title_en', type: 'varchar', length: 255 })
  titleEn!: string;

  @Column({ name: 'description_ar', type: 'text', nullable: true })
  descriptionAr?: string;

  @Column({ name: 'description_en', type: 'text', nullable: true })
  descriptionEn?: string;

  // ---------- Classification ----------
  // These three are plain varchar (not a Postgres enum) storing the `key`
  // of a Settings row (type=TASK_TYPE/TASK_PRIORITY/TASK_STATUS) — see
  // Settings > "Statuses & Types". The original enum members (General,
  // Medium, Pending, ...) are still valid values, seeded as isSystem
  // rows; admins can add further custom values on top. Kept typed as
  // `string` here (not TaskType/TaskPriority/TaskStatus) since the set is
  // no longer closed, but TaskType/TaskPriority/TaskStatus constants
  // remain valid string values to compare/assign against everywhere else
  // in the codebase.
  @Column({ name: 'task_type', type: 'varchar', length: 50, default: TaskType.GENERAL })
  taskType!: string;

  @Column({ type: 'varchar', length: 50, default: TaskPriority.MEDIUM })
  priority!: string; // level of importance

  @Column({ type: 'varchar', length: 50, default: TaskStatus.PENDING })
  status!: string; // current status

  @Column({ type: 'varchar', length: 20, nullable: true })
  color?: string; // e.g. '#22C55E' or a named color, for calendar/board display

  // ---------- Organizational placement (independent of one another) ----------
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId?: string;

  @ManyToOne(() => SettingEntity, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: SettingEntity;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId?: string;

  @ManyToOne(() => SettingEntity, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department?: SettingEntity;

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId?: string;

  @ManyToOne(() => ProjectEntity, { nullable: true })
  @JoinColumn({ name: 'project_id' })
  project?: ProjectEntity;

  // ---------- People ----------
  // Who this Task is for (the doer / "for whom this task").
  @Column({ name: 'assigned_to_id', type: 'uuid', nullable: true })
  assignedToId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo?: UserEntity;

  // Who created the Task.
  @Column({ name: 'created_by', type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  createdBy!: UserEntity;

  // ---------- Approval workflow (optional, only if the Task needs one) ----------
  @Column({ name: 'needs_approval', type: 'boolean', default: false })
  needsApproval!: boolean;

  @Column({ name: 'approver_id', type: 'uuid', nullable: true })
  approverId?: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'approver_id' })
  approver?: UserEntity;

  @Column({
    name: 'approval_status',
    type: 'enum',
    enum: ApprovalStatus,
    enumName: 'approval_status_enum',
    default: ApprovalStatus.NOT_REQUIRED,
  })
  approvalStatus!: ApprovalStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string; // cause, in case it did not get approved

  // ---------- Money range (optional, only if the Task needs a budget) ----------
  @Column({ name: 'needs_budget', type: 'boolean', default: false })
  needsBudget!: boolean;

  @Column({ name: 'budget_min', type: 'numeric', precision: 14, scale: 2, nullable: true })
  budgetMin?: string;

  @Column({ name: 'budget_max', type: 'numeric', precision: 14, scale: 2, nullable: true })
  budgetMax?: string;

  @Column({ name: 'budget_currency', type: 'varchar', length: 10, nullable: true, default: 'SAR' })
  budgetCurrency?: string;

  // ---------- Dates ----------
  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'deadline_date', type: 'date', nullable: true })
  deadlineDate?: string; // deadline

  @Column({ name: 'actual_end_date', type: 'timestamp', nullable: true })
  actualEndDate?: Date; // when it really ends

  // ---------- Hierarchy: father task / sub-tasks ----------
  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId?: string;

  @ManyToOne(() => TaskEntity, (task) => task.subTasks, { nullable: true })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask?: TaskEntity;

  @OneToMany(() => TaskEntity, (task) => task.parentTask)
  subTasks!: TaskEntity[];

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;

  // BR-070: only the Task creator (or Admin) decides whether the assigned
  // User(s) may download attachments. Preview is always allowed for them
  // regardless of this flag — this only gates the download action.
  @Column({ name: 'assignee_can_download_attachments', type: 'boolean', default: true })
  assigneeCanDownloadAttachments!: boolean;

  // The status this Task held right before it was archived, so it can be
  // restored to something meaningful instead of a hardcoded default.
  @Column({ name: 'status_before_archive', type: 'varchar', length: 50, nullable: true })
  statusBeforeArchive?: string;

  // ---------- Children owned by the Task ----------
  @OneToMany(() => TaskAssignmentEntity, (a) => a.task)
  assignments!: TaskAssignmentEntity[];

  @OneToMany(() => TaskCommentEntity, (c) => c.task)
  comments!: TaskCommentEntity[];

  // Files of any kind attached to the Task.
  @OneToMany(() => TaskAttachmentEntity, (a) => a.task)
  attachments!: TaskAttachmentEntity[];

  // Task evaluation: the person who assigned/created the Task can rate the
  // work once it's done; the doer can then see the evaluation left for them.
  @OneToMany(() => TaskRatingEntity, (r) => r.task)
  ratings!: TaskRatingEntity[];
}
