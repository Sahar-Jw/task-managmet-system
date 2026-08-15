import {
  IsBoolean,
  IsBooleanString,
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TaskPriority } from '../../../shared/enums/task-priority.enum';
import { TaskStatus } from '../../../shared/enums/task-status.enum';
import { TaskType } from '../../../shared/enums/task-type.enum';
import { PaginationQueryDto } from '../../../common/utils/pagination.dto';

export class CreateTaskDto {
  // ---- Bilingual title & description ----
  @IsString() @IsNotEmpty() @MaxLength(255)
  titleAr!: string;

  @IsString() @IsNotEmpty() @MaxLength(255)
  titleEn!: string;

  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsString() descriptionEn?: string;

  // ---- Classification ----
  @IsOptional() @IsEnum(TaskType) taskType?: TaskType;
  @IsEnum(TaskPriority) priority!: TaskPriority;
  @IsOptional() @IsString() @MaxLength(20) color?: string;

  // ---- Organizational placement (each independent, all optional except Department) ----
  @IsOptional() @IsUUID() branchId?: string;
  @IsUUID() departmentId!: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() parentTaskId?: string;

  // ---- People ----
  @IsOptional() @IsUUID() assignedToId?: string; // for whom this task is

  // ---- Approval ----
  @IsOptional() @IsBoolean() needsApproval?: boolean;
  @ValidateIf((o) => o.needsApproval === true)
  @IsUUID() approverId?: string;

  // ---- Money range ----
  @IsOptional() @IsBoolean() needsBudget?: boolean;
  @ValidateIf((o) => o.needsBudget === true)
  @IsNumberString() budgetMin?: string;
  @ValidateIf((o) => o.needsBudget === true)
  @IsNumberString() budgetMax?: string;
  @IsOptional() @IsString() @MaxLength(10) budgetCurrency?: string;

  // ---- Dates ----
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() deadlineDate?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() @MaxLength(255) titleAr?: string;
  @IsOptional() @IsString() @MaxLength(255) titleEn?: string;
  @IsOptional() @IsString() descriptionAr?: string;
  @IsOptional() @IsString() descriptionEn?: string;

  @IsOptional() @IsEnum(TaskType) taskType?: TaskType;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsString() @MaxLength(20) color?: string;

  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() parentTaskId?: string;
  @IsOptional() @IsUUID() assignedToId?: string;

  @IsOptional() @IsBoolean() needsApproval?: boolean;
  @IsOptional() @IsUUID() approverId?: string;

  @IsOptional() @IsBoolean() needsBudget?: boolean;
  @IsOptional() @IsNumberString() budgetMin?: string;
  @IsOptional() @IsNumberString() budgetMax?: string;
  @IsOptional() @IsString() @MaxLength(10) budgetCurrency?: string;

  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() deadlineDate?: string;
}

/** Creator/Admin toggles whether the assigned User(s) may download attachments. */
export class UpdateAttachmentPermissionsDto {
  @IsBoolean()
  assigneeCanDownloadAttachments!: boolean;
}

/** Reason required for FINISHED/Reopened transitions. */
export class UpdateTaskStatusDto {
  @IsEnum(TaskStatus) status!: TaskStatus;

  @ValidateIf((o) => [TaskStatus.FINISHED, TaskStatus.REOPENED].includes(o.status))
  @IsString() @MinLength(10)
  reason?: string;
}

/** Admin/approver decides on a Task that needs approval. */
export class DecideTaskApprovalDto {
  @IsBoolean() approve!: boolean;

  @ValidateIf((o) => o.approve === false)
  @IsString() @MinLength(5)
  rejectionReason?: string;
}

export class QueryTasksDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
  @IsOptional() @IsBooleanString() excludeArchived?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() createdById?: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsUUID() assigneeId?: string; // legacy multi-assignee filter (task-assignments)
  @IsOptional() @IsEnum(TaskType) taskType?: TaskType;
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;
  @IsOptional() @IsDateString() dueDateFrom?: string;
  @IsOptional() @IsDateString() dueDateTo?: string;

  // Free-text match against title/description (both languages) — same
  // behavior as the "My Tasks" search filter.
  @IsOptional() @IsString() @MaxLength(200) search?: string;
}

/**
 * "My Tasks" — everything assigned to the current user, either via the
 * single `assignedTo` field or a `task_assignments` row, with filters for
 * importance (priority), rating (average score left on the task) and
 * upcoming deadline.
 */
export class QueryMyTasksDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;

  @IsOptional() @IsEnum(TaskType) taskType?: TaskType;

  // Importance
  @IsOptional() @IsEnum(TaskPriority) priority?: TaskPriority;

  // Optional project scope (e.g. viewing "my tasks" within one Project)
  @IsOptional() @IsUUID() projectId?: string;

  // Free-text match against title/description (both languages)
  @IsOptional() @IsString() @MaxLength(200) search?: string;

  // Rating: only tasks whose average rating is >= this value (1-5)
  @IsOptional() @IsNumberString() minRating?: string;

  // Upcoming deadline
  @IsOptional() @IsBooleanString() upcomingOnly?: string; // deadline >= today & not done
  @IsOptional() @IsDateString() deadlineFrom?: string;
  @IsOptional() @IsDateString() deadlineTo?: string;

  @IsOptional() @IsIn(['deadline', 'priority', 'rating', 'createdAt']) sortBy?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sortDir?: string;
}
