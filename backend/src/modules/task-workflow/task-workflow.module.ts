import {
  Module,
} from '@nestjs/common';

import {
  TypeOrmModule,
} from '@nestjs/typeorm';

import {
  TaskWorkflowConfigEntity,
} from './entities/task-workflow-config.entity';

import {
  TaskWorkflowService,
} from './task-workflow.service';

import {
  TaskWorkflowController,
} from './task-workflow.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      TaskWorkflowConfigEntity,
    ]),
  ],

  providers: [
    TaskWorkflowService,
  ],

  controllers: [
    TaskWorkflowController,
  ],

  exports: [
    TaskWorkflowService,
  ],
})
export class TaskWorkflowModule {}