import {
  Column,
  Entity,
} from 'typeorm';

import {
  BaseEntity,
} from '../../../shared/entities/base.entity';

import {
  TaskWorkflowActionKey,
  TaskWorkflowMode,
} from '../../../shared/enums/task-workflow.enum';


export interface TaskWorkflowStoredAction {
  key:
    TaskWorkflowActionKey;

  enabled:
    boolean;

  order:
    number;
}


@Entity('task_workflow_config')
export class TaskWorkflowConfigEntity
  extends BaseEntity {
  @Column({
    type:
      'varchar',

    length:
      30,

    default:
      TaskWorkflowMode.ALL_AVAILABLE,
  })
  mode!:
    TaskWorkflowMode;


  @Column({
    type:
      'jsonb',
  })
  actions!:
    TaskWorkflowStoredAction[];


  @Column({
    name:
      'updated_by',

    type:
      'uuid',

    nullable:
      true,
  })
  updatedById?:
    string;
}