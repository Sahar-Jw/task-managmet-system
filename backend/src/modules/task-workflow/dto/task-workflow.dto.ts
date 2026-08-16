import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';

import {
  Type,
} from 'class-transformer';

import {
  TaskWorkflowActionKey,
  TaskWorkflowMode,
} from '../../../shared/enums/task-workflow.enum';


export class TaskWorkflowActionDto {
  @IsEnum(
    TaskWorkflowActionKey,
  )
  key!:
    TaskWorkflowActionKey;


  @IsBoolean()
  enabled!:
    boolean;


  @IsInt()
  @Min(
    1,
  )
  order!:
    number;
}


export class UpdateTaskWorkflowDto {
  @IsEnum(
    TaskWorkflowMode,
  )
  mode!:
    TaskWorkflowMode;


  @IsArray()
  @ValidateNested({
    each:
      true,
  })
  @Type(
    () =>
      TaskWorkflowActionDto,
  )
  actions!:
    TaskWorkflowActionDto[];
}