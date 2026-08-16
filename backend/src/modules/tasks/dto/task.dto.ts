import {
  IsBoolean,
  IsBooleanString,
  IsDateString,
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

import { TaskStatus } from '../../../shared/enums/task-status.enum';
import { PaginationQueryDto } from '../../../common/utils/pagination.dto';

/*
 * ============================================================
 * CREATE TASK
 * ============================================================
 */

export class CreateTaskDto {
  // ---------- Bilingual content ----------

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleAr!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  titleEn!: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  // ---------- Classification ----------

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsString()
  @IsNotEmpty()
  priority!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;

  // ---------- Organization ----------

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsUUID()
  departmentId!: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string;

  // ---------- People ----------

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  // ---------- Approval ----------

  @IsOptional()
  @IsBoolean()
  needsApproval?: boolean;

  @ValidateIf((object) => object.needsApproval === true)
  @IsUUID()
  approverId?: string;

  // ---------- Budget ----------

  @IsOptional()
  @IsBoolean()
  needsBudget?: boolean;

  @ValidateIf(
    (object) =>
      object.needsBudget === true &&
      object.budgetMin !== undefined,
  )
  @IsNumberString()
  budgetMin?: string;

  @ValidateIf(
    (object) =>
      object.needsBudget === true &&
      object.budgetMax !== undefined,
  )
  @IsNumberString()
  budgetMax?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  budgetCurrency?: string;

  // ---------- Dates ----------

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  deadlineDate?: string;
}

/*
 * ============================================================
 * UPDATE TASK
 *
 * undefined = keep existing value
 * null      = explicitly clear value
 * ============================================================
 */

export class UpdateTaskDto {
  // ---------- Content ----------

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleAr?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  titleEn?: string | null;

  @IsOptional()
  @IsString()
  descriptionAr?: string | null;

  @IsOptional()
  @IsString()
  descriptionEn?: string | null;

  // ---------- Classification ----------

  @IsOptional()
  @IsString()
  taskType?: string | null;

  @IsOptional()
  @IsString()
  priority?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string | null;

  // ---------- Organization ----------

  @IsOptional()
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @IsUUID()
  departmentId?: string | null;

  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsUUID()
  parentTaskId?: string | null;

  // ---------- People ----------

  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  // ---------- Approval ----------

  @IsOptional()
  @IsBoolean()
  needsApproval?: boolean;

  @IsOptional()
  @IsUUID()
  approverId?: string | null;

  // ---------- Budget ----------

  @IsOptional()
  @IsBoolean()
  needsBudget?: boolean;

  @IsOptional()
  @IsNumberString()
  budgetMin?: string | null;

  @IsOptional()
  @IsNumberString()
  budgetMax?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  budgetCurrency?: string | null;

  // ---------- Dates ----------

  @IsOptional()
  @IsDateString()
  startDate?: string | null;

  @IsOptional()
  @IsDateString()
  deadlineDate?: string | null;
}

/*
 * ============================================================
 * ATTACHMENT PERMISSIONS
 * ============================================================
 */

export class UpdateAttachmentPermissionsDto {
  @IsBoolean()
  assigneeCanDownloadAttachments!: boolean;
}

/*
 * ============================================================
 * STATUS
 * ============================================================
 */

export class UpdateTaskStatusDto {
  @IsString()
  status!: string;

  @ValidateIf((object) =>
    [
      TaskStatus.FINISHED,
      TaskStatus.REOPENED,
    ].includes(object.status),
  )
  @IsString()
  @MinLength(10)
  reason?: string;
}

/*
 * ============================================================
 * APPROVAL
 * ============================================================
 */

export class DecideTaskApprovalDto {
  @IsBoolean()
  approve!: boolean;

  @ValidateIf((object) => object.approve === false)
  @IsString()
  @MinLength(5)
  rejectionReason?: string;
}

/*
 * ============================================================
 * GENERAL TASK QUERY
 * ============================================================
 */

export class QueryTasksDto extends PaginationQueryDto {
  /*
   * ==========================================================
   * CLASSIFICATION
   * ==========================================================
   */

  @IsOptional()
  @IsString()
  status?: string;


  @IsOptional()
  @IsBooleanString()
  excludeArchived?: string;


  @IsOptional()
  @IsString()
  taskType?: string;


  @IsOptional()
  @IsString()
  priority?: string;


  /*
   * ==========================================================
   * ORGANIZATION
   * ==========================================================
   */

  @IsOptional()
  @IsUUID()
  branchId?: string;


  @IsOptional()
  @IsUUID()
  projectId?: string;


  @IsOptional()
  @IsUUID()
  departmentId?: string;


  /*
   * ==========================================================
   * PEOPLE
   * ==========================================================
   */

  @IsOptional()
  @IsUUID()
  createdById?: string;


  /*
   * Current assignee pointer.
   *
   * This works with the unified Assignment workflow because
   * Task.assignedToId is synchronized by TaskAssignmentsService.
   */
  @IsOptional()
  @IsUUID()
  assignedToId?: string;


  /*
   * Assignment-history assignee.
   *
   * Kept for existing API compatibility.
   */
  @IsOptional()
  @IsUUID()
  assigneeId?: string;


  /*
   * ==========================================================
   * SEARCH
   * ==========================================================
   */

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;


  /*
   * ==========================================================
   * DEADLINE
   * ==========================================================
   */

  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;


  @IsOptional()
  @IsDateString()
  dueDateTo?: string;


  @IsOptional()
  @IsBooleanString()
  hasDeadline?: string;


  @IsOptional()
  @IsBooleanString()
  overdueOnly?: string;


  /*
   * ==========================================================
   * START DATE
   * ==========================================================
   */

  @IsOptional()
  @IsDateString()
  startDateFrom?: string;


  @IsOptional()
  @IsDateString()
  startDateTo?: string;


  /*
   * ==========================================================
   * CREATED DATE
   * ==========================================================
   */

  @IsOptional()
  @IsDateString()
  createdDateFrom?: string;


  @IsOptional()
  @IsDateString()
  createdDateTo?: string;


  /*
   * ==========================================================
   * SORTING
   * ==========================================================
   */

  @IsOptional()
  @IsIn([
    'createdAt',
    'deadline',
    'startDate',
    'title',
    'status',
    'taskType',
  ])
  sortBy?: string;


  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortDir?: string;
}

/*
 * ============================================================
 * MY TASKS / ASSIGNED BY ME QUERY
 * ============================================================
 */

export class QueryMyTasksDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsUUID()
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsNumberString()
  minRating?: string;

  @IsOptional()
  @IsBooleanString()
  upcomingOnly?: string;

  @IsOptional()
  @IsDateString()
  deadlineFrom?: string;

  @IsOptional()
  @IsDateString()
  deadlineTo?: string;

  @IsOptional()
  @IsIn([
    'deadline',
    'priority',
    'rating',
    'createdAt',
  ])
  sortBy?: string;

  @IsOptional()
  @IsIn([
    'asc',
    'desc',
  ])
  sortDir?: string;
}