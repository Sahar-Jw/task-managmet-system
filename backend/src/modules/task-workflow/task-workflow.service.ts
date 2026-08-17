import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  TaskWorkflowConfigEntity,
  TaskWorkflowStoredAction,
} from './entities/task-workflow-config.entity';

import {
  UpdateTaskWorkflowDto,
} from './dto/task-workflow.dto';

import {
  TaskWorkflowActionKey,
  TaskWorkflowMode,
} from '../../shared/enums/task-workflow.enum';

import {
  TaskStatus,
} from '../../shared/enums/task-status.enum';

import {
  ApprovalStatus,
} from '../../shared/enums/approval-status.enum';

import {
  TaskEntity,
} from '../tasks/entities/task.entity';

import {
  UserEntity,
} from '../users/entities/user.entity';


export interface TaskWorkflowActionDefinition {
  key:
    TaskWorkflowActionKey;

  targetStatus:
    TaskStatus;

  labelEn:
    string;

  labelAr:
    string;

  descriptionEn:
    string;

  descriptionAr:
    string;
}


export interface TaskWorkflowConfigResponse {
  id:
    string;

  mode:
    TaskWorkflowMode;

  actions:
    Array<
      TaskWorkflowActionDefinition &
      TaskWorkflowStoredAction
    >;

  updatedAt:
    Date;
}


/*
 * ============================================================
 * SYSTEM ACTION DEFINITIONS
 * ============================================================
 *
 * Admin can:
 *
 * - enable / disable
 * - reorder
 *
 * Admin CANNOT change the target status itself.
 *
 * That keeps the workflow configuration safe.
 * ============================================================
 */

export const TASK_WORKFLOW_ACTIONS:
  TaskWorkflowActionDefinition[] = [
  {
    key:
      TaskWorkflowActionKey.START,

    targetStatus:
      TaskStatus.IN_PROGRESS,

    labelEn:
      'Start task',

    labelAr:
      'بدء المهمة',

    descriptionEn:
      'Move the task into active work.',

    descriptionAr:
      'نقل المهمة إلى حالة العمل النشط.',
  },

  {
    key:
      TaskWorkflowActionKey.SUBMIT_APPROVAL,

    targetStatus:
      TaskStatus.PENDING_APPROVAL,

    labelEn:
      'Submit for approval',

    labelAr:
      'إرسال للموافقة',

    descriptionEn:
      'Send work to the configured approver.',

    descriptionAr:
      'إرسال العمل إلى المستخدم المسؤول عن الموافقة.',
  },

  {
    key:
      TaskWorkflowActionKey.COMPLETE,

    targetStatus:
      TaskStatus.COMPLETED,

    labelEn:
      'Complete task',

    labelAr:
      'إكمال المهمة',

    descriptionEn:
      'Mark successfully completed work as complete.',

    descriptionAr:
      'تحديد العمل المنجز بنجاح كمكتمل.',
  },

  {
    key:
      TaskWorkflowActionKey.FINISH,

    targetStatus:
      TaskStatus.FINISHED,

    labelEn:
      'Finish task',

    labelAr:
      'إنهاء المهمة',

    descriptionEn:
      'Close the task with a mandatory reason.',

    descriptionAr:
      'إغلاق المهمة مع توضيح سبب الإنهاء.',
  },

  {
    key:
      TaskWorkflowActionKey.ARCHIVE,

    targetStatus:
      TaskStatus.ARCHIVED,

    labelEn:
      'Archive task',

    labelAr:
      'أرشفة المهمة',

    descriptionEn:
      'Move closed work into the archive.',

    descriptionAr:
      'نقل العمل المغلق إلى الأرشيف.',
  },
];


const DEFAULT_ACTIONS:
  TaskWorkflowStoredAction[] =
  TASK_WORKFLOW_ACTIONS.map(
    (
      action,
      index,
    ) => ({
      key:
        action.key,

      enabled:
        true,

      order:
        index +
        1,
    }),
  );


@Injectable()
export class TaskWorkflowService {
  constructor(
    @InjectRepository(
      TaskWorkflowConfigEntity,
    )
    private readonly repo:
      Repository<TaskWorkflowConfigEntity>,
  ) {}


  /*
   * ==========================================================
   * GET / CREATE SINGLETON
   * ==========================================================
   */

 private async getEntity():
  Promise<TaskWorkflowConfigEntity> {
  /*
   * TypeORM findOne() requires a WHERE condition.
   *
   * Since this table is designed as a singleton configuration,
   * use find() with take: 1 instead.
   */
  const existing =
    await this.repo.find({
      order: {
        createdAt:
          'ASC',
      },

      take:
        1,
    });


  if (
    existing.length >
    0
  ) {
    return existing[0];
  }


  /*
   * Defensive fallback.
   *
   * The migration already inserts the default configuration,
   * but if the row was ever manually deleted, recreate it.
   */
  const config =
    this.repo.create({
      mode:
        TaskWorkflowMode.ALL_AVAILABLE,

      actions:
        DEFAULT_ACTIONS.map(
          (
            action,
          ) => ({
            ...action,
          }),
        ),
    });


  return this.repo.save(
    config,
  );
}


  /*
   * ==========================================================
   * NORMALIZE
   * ==========================================================
   */

  private normalize(
    stored:
      TaskWorkflowStoredAction[],
  ):
    TaskWorkflowStoredAction[] {
    const byKey =
      new Map(
        (
          stored ||
          []
        ).map(
          (
            item,
          ) => [
            item.key,
            item,
          ],
        ),
      );


    return TASK_WORKFLOW_ACTIONS
      .map(
        (
          definition,
          index,
        ) => {
          const existing =
            byKey.get(
              definition.key,
            );


          return {
            key:
              definition.key,

            enabled:
              existing?.enabled ??
              true,

            order:
              existing?.order ??
              index +
                1,
          };
        },
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.order -
          b.order,
      )
      .map(
        (
          item,
          index,
        ) => ({
          ...item,

          order:
            index +
            1,
        }),
      );
  }


  /*
   * ==========================================================
   * RESPONSE
   * ==========================================================
   */

  private toResponse(
    entity:
      TaskWorkflowConfigEntity,
  ):
    TaskWorkflowConfigResponse {
    const normalized =
      this.normalize(
        entity.actions,
      );


    const definitions =
      new Map(
        TASK_WORKFLOW_ACTIONS.map(
          (
            item,
          ) => [
            item.key,
            item,
          ],
        ),
      );


    return {
      id:
        entity.id,

      mode:
        entity.mode,

      actions:
        normalized.map(
          (
            stored,
          ) => ({
            ...definitions.get(
              stored.key,
            )!,

            ...stored,
          }),
        ),

      updatedAt:
        entity.updatedAt,
    };
  }


  /*
   * ==========================================================
   * GET CONFIG
   * ==========================================================
   */

  async getConfig():
    Promise<TaskWorkflowConfigResponse> {
    const entity =
      await this.getEntity();


    return this.toResponse(
      entity,
    );
  }


  /*
   * ==========================================================
   * UPDATE CONFIG
   * ==========================================================
   */

  async update(
    dto:
      UpdateTaskWorkflowDto,

    actor:
      UserEntity,
  ):
    Promise<TaskWorkflowConfigResponse> {
    const entity =
      await this.getEntity();


    const expectedKeys =
      TASK_WORKFLOW_ACTIONS.map(
        (
          item,
        ) =>
          item.key,
      );


    const incomingKeys =
      dto.actions.map(
        (
          item,
        ) =>
          item.key,
      );


    /*
     * No duplicate action rows.
     */
    if (
      new Set(
        incomingKeys,
      ).size !==
      incomingKeys.length
    ) {
      throw new BadRequestException(
        appError('WORKFLOW_ACTIONS_CANNOT_CONTAIN_DUPLICATE_ENTRIES', 'Workflow actions cannot contain duplicate entries'),
      );
    }


    /*
     * Require all built-in actions.
     */
    for (
      const key
      of expectedKeys
    ) {
      if (
        !incomingKeys.includes(
          key,
        )
      ) {
        throw new BadRequestException(
          appError('WORKFLOW_ACTION_VALUE_MISSING', `Workflow action "${key}" is missing`),
        );
      }
    }


    /*
     * Prevent unknown values.
     */
    for (
      const key
      of incomingKeys
    ) {
      if (
        !expectedKeys.includes(
          key,
        )
      ) {
        throw new BadRequestException(
          appError('UNKNOWN_WORKFLOW_ACTION_VALUE', `Unknown Workflow action "${key}"`),
        );
      }
    }


    const sorted =
      [
        ...dto.actions,
      ]
        .sort(
          (
            a,
            b,
          ) =>
            a.order -
            b.order,
        )
        .map(
          (
            action,
            index,
          ) => ({
            key:
              action.key,

            enabled:
              action.enabled,

            order:
              index +
              1,
          }),
        );


    /*
     * Start should always remain available.
     *
     * Without it, Pending Tasks could become impossible to work on.
     */
    const startAction =
      sorted.find(
        (
          item,
        ) =>
          item.key ===
          TaskWorkflowActionKey.START,
      );


    if (
      !startAction?.enabled
    ) {
      throw new BadRequestException(
        appError('START_TASK_CANNOT_DISABLED', 'Start Task cannot be disabled'),
      );
    }


    entity.mode =
      dto.mode;


    entity.actions =
      sorted;


    entity.updatedById =
      actor.id;


    const saved =
      await this.repo.save(
        entity,
      );


    return this.toResponse(
      saved,
    );
  }


  /*
   * ==========================================================
   * TARGET -> ACTION
   * ==========================================================
   */

  private getActionForStatus(
    status:
      string,
  ):
    TaskWorkflowActionDefinition | undefined {
    return TASK_WORKFLOW_ACTIONS.find(
      (
        item,
      ) =>
        item.targetStatus ===
        status,
    );
  }


  /*
   * ==========================================================
   * APPLICABLE ACTION
   * ==========================================================
   */

  private isApplicable(
    task:
      TaskEntity,

    action:
      TaskWorkflowActionDefinition,
  ) {
    /*
     * Approval is only relevant on Tasks that need approval.
     */
    if (
      action.key ===
        TaskWorkflowActionKey.SUBMIT_APPROVAL
    ) {
      return Boolean(
        task.needsApproval &&
        task.approverId,
      );
    }


    /*
     * A Task requiring approval cannot directly Complete until
     * its approval is already Approved.
     */
    if (
      action.key ===
        TaskWorkflowActionKey.COMPLETE &&
      task.needsApproval &&
      task.approvalStatus !==
        ApprovalStatus.APPROVED
    ) {
      return false;
    }


    return true;
  }


  /*
   * ==========================================================
   * BACKEND ENFORCEMENT
   * ==========================================================
   *
   * allowedTargets comes from TasksService's existing transition map.
   *
   * This means Workflow Settings cannot bypass the real Task business
   * rules already enforced by TasksService.
   * ==========================================================
   */

  async assertActionAllowed(
    task:
      TaskEntity,

    requestedStatus:
      string,

    allowedTargets:
      string[],
  ):
    Promise<void> {
    const requestedAction =
      this.getActionForStatus(
        requestedStatus,
      );


    /*
     * Reopen/custom statuses are handled by existing Task logic.
     */
    if (
      !requestedAction
    ) {
      return;
    }


    const config =
      await this.getConfig();


    const requestedConfig =
      config.actions.find(
        (
          item,
        ) =>
          item.key ===
          requestedAction.key,
      );


    if (
      !requestedConfig ||
      !requestedConfig.enabled
    ) {
      throw new ConflictException(
        appError('VALUE_DISABLED_IN_TASK_WORKFLOW_SETTINGS', `"${requestedAction.labelEn}" is disabled in Task Workflow settings`),
      );
    }


    /*
     * ALL AVAILABLE:
     *
     * Existing backend transition rules decide what is legal.
     */
    if (
      config.mode ===
      TaskWorkflowMode.ALL_AVAILABLE
    ) {
      return;
    }


    /*
     * GUIDED:
     *
     * Find the first enabled + applicable action that is legal from the
     * current Task status.
     */
    const nextAction =
      config.actions
        .filter(
          (
            configured,
          ) =>
            configured.enabled,
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.order -
            b.order,
        )
        .find(
          (
            configured,
          ) => {
            const definition =
              TASK_WORKFLOW_ACTIONS.find(
                (
                  item,
                ) =>
                  item.key ===
                  configured.key,
              );


            if (
              !definition
            ) {
              return false;
            }


            if (
              !allowedTargets.includes(
                definition.targetStatus,
              )
            ) {
              return false;
            }


            return this.isApplicable(
              task,
              definition,
            );
          },
        );


    if (
      !nextAction
    ) {
      return;
    }


    if (
      nextAction.key !==
      requestedAction.key
    ) {
      const definition =
        TASK_WORKFLOW_ACTIONS.find(
          (
            item,
          ) =>
            item.key ===
            nextAction.key,
        );


      throw new ConflictException(
        appError('TASK_WORKFLOW_BUSINESS_RULE_VIOLATION', definition
          ? `The next configured Workflow action is "${definition.labelEn}"`
          : 'This Workflow action is not currently available'),
      );
    }
  }
}