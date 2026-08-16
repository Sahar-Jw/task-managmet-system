import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  SettingEntity,
} from './entities/setting.entity';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  CreateSettingDto,
  UpdateSettingDto,
} from './dto/setting.dto';

import {
  SettingType,
  LIST_SETTING_TYPES,
} from '../../shared/enums/setting-type.enum';

import {
  SettingValueType,
} from '../../shared/enums/setting-value-type.enum';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(
      SettingEntity,
    )
    private readonly settingRepo:
      Repository<SettingEntity>,

    private readonly auditLogsService:
      AuditLogsService,
  ) {}

  /*
   * -----------------------------------------------------
   * LIST
   * -----------------------------------------------------
   */

  findAll(
    type?: SettingType,
    isActive?: string,
  ) {
    const where:
      Record<
        string,
        unknown
      > = {};

    if (type) {
      where.type =
        type;
    }

    if (
      isActive ===
      'true'
    ) {
      where.isActive =
        true;
    } else if (
      isActive ===
      'false'
    ) {
      where.isActive =
        false;
    }

    return this.settingRepo.find(
      {
        where,

        order: {
          type: 'ASC',
          codeEn: 'ASC',
          codeAr: 'ASC',
        },
      },
    );
  }

  /*
   * -----------------------------------------------------
   * GET ONE
   * -----------------------------------------------------
   */

  async findOne(
    id: string,
  ): Promise<SettingEntity> {
    const setting =
      await this.settingRepo.findOne(
        {
          where: {
            id,
          },
        },
      );

    if (!setting) {
      throw new NotFoundException(
        'Setting not found',
      );
    }

    return setting;
  }

  /*
   * -----------------------------------------------------
   * CREATE
   * -----------------------------------------------------
   */

  async create(
    dto: CreateSettingDto,
    actor: UserEntity,
  ): Promise<SettingEntity> {
    const isListType =
      LIST_SETTING_TYPES.includes(
        dto.type,
      );

    const codeAr =
      dto.codeAr?.trim() ??
      '';

    const codeEn =
      dto.codeEn?.trim() ??
      '';

    const valueAr =
      dto.valueAr?.trim() ??
      '';

    const valueEn =
      dto.valueEn?.trim() ??
      '';

    /*
     * At least one language must be supplied.
     */
    if (
      !codeAr &&
      !codeEn
    ) {
      throw new BadRequestException(
        'Provide text in at least one language',
      );
    }

    let entityLike:
      Partial<SettingEntity>;

    /*
     * ---------------------------------------------------
     * STATUS / TYPE LIST SETTINGS
     * ---------------------------------------------------
     */

    if (isListType) {
      entityLike = {
        type:
          dto.type,

        codeAr,
        codeEn,

        key:
          await this.generateUniqueKey(
            dto.type,
            codeEn ||
              codeAr,
          ),

        isSystem:
          false,

        createdById:
          actor.id,

        isActive:
          true,

        valueType:
          SettingValueType.STRING,

        valueAr:
          codeAr,

        valueEn:
          codeEn,

        valueNumber:
          null as unknown as undefined,
      };
    } else {
      /*
       * -------------------------------------------------
       * DEPARTMENT / BRANCH
       * -------------------------------------------------
       *
       * These previously required BOTH Arabic and English.
       *
       * They now support:
       *
       * Arabic only
       * English only
       * Arabic + English
       */

      const valueType =
        dto.valueType ??
        SettingValueType.STRING;

      if (
        valueType ===
        SettingValueType.STRING
      ) {
        /*
         * Whichever code language exists must also have
         * its matching value.
         */

        if (
          codeAr &&
          !valueAr
        ) {
          throw new BadRequestException(
            'Arabic value is required when Arabic code is provided',
          );
        }

        if (
          codeEn &&
          !valueEn
        ) {
          throw new BadRequestException(
            'English value is required when English code is provided',
          );
        }

        if (
          !valueAr &&
          !valueEn
        ) {
          throw new BadRequestException(
            'Provide a value in at least one language',
          );
        }
      }

      entityLike = {
        type:
          dto.type,

        /*
         * The database columns are non-null varchar columns,
         * so the missing language is represented by ''.
         */
        codeAr,
        codeEn,

        address:
          dto.address,

        isAdminDepartment:
          dto.isAdminDepartment ??
          false,

        createdById:
          actor.id,

        isActive:
          true,

        ...this.buildValueFields(
          valueType,
          valueAr,
          valueEn,
          dto.valueNumber,
        ),
      };
    }

    const setting =
      await this.settingRepo.save(
        this.settingRepo.create(
          entityLike,
        ),
      );

    await this.auditLogsService.record(
      {
        actorId:
          actor.id,

        entityType:
          'Setting',

        entityId:
          setting.id,

        action:
          AuditAction.CREATE,

        newValue:
          setting,
      },
    );

    return setting;
  }

  /*
   * -----------------------------------------------------
   * UPDATE
   * -----------------------------------------------------
   */

  async update(
    id: string,
    dto: UpdateSettingDto,
    actor: UserEntity,
  ): Promise<SettingEntity> {
    const setting =
      await this.findOne(
        id,
      );

    const oldValue = {
      ...setting,
    };

    const isListType =
      LIST_SETTING_TYPES.includes(
        setting.type,
      );

    /*
     * Update only fields actually supplied.
     *
     * This is important for language editing:
     *
     * English edit sends codeEn/valueEn only.
     * Arabic edit sends codeAr/valueAr only.
     *
     * The other language remains untouched.
     */

    if (
      dto.codeAr !==
      undefined
    ) {
      setting.codeAr =
        dto.codeAr.trim();
    }

    if (
      dto.codeEn !==
      undefined
    ) {
      setting.codeEn =
        dto.codeEn.trim();
    }

    if (
      dto.isActive !==
      undefined
    ) {
      setting.isActive =
        dto.isActive;
    }

    if (isListType) {
      setting.valueType =
        SettingValueType.STRING;

      setting.valueAr =
        setting.codeAr;

      setting.valueEn =
        setting.codeEn;

      setting.valueNumber =
        null as unknown as undefined;
    } else {
      if (
        dto.address !==
        undefined
      ) {
        setting.address =
          dto.address;
      }

      if (
        dto.isAdminDepartment !==
        undefined
      ) {
        setting.isAdminDepartment =
          dto.isAdminDepartment;
      }

      const valueType =
        dto.valueType ??
        setting.valueType;

      /*
       * For normal Department / Branch strings, update only
       * the language value that was supplied.
       */
      if (
        valueType ===
        SettingValueType.STRING
      ) {
        if (
          dto.valueAr !==
          undefined
        ) {
          setting.valueAr =
            dto.valueAr.trim();
        }

        if (
          dto.valueEn !==
          undefined
        ) {
          setting.valueEn =
            dto.valueEn.trim();
        }

        setting.valueType =
          SettingValueType.STRING;

        setting.valueNumber =
          null as unknown as undefined;
      } else {
        const fields =
          this.buildValueFields(
            valueType,
            dto.valueAr,
            dto.valueEn,
            dto.valueNumber,
            setting,
          );

        Object.assign(
          setting,
          fields,
        );
      }
    }

    /*
     * A row is allowed to have only one language,
     * but not zero languages.
     */
    const finalCodeAr =
      setting.codeAr?.trim() ??
      '';

    const finalCodeEn =
      setting.codeEn?.trim() ??
      '';

    if (
      !finalCodeAr &&
      !finalCodeEn
    ) {
      throw new BadRequestException(
        'A setting must have text in at least one language',
      );
    }

    if (
      !isListType &&
      setting.valueType ===
        SettingValueType.STRING
    ) {
      const finalValueAr =
        setting.valueAr?.trim() ??
        '';

      const finalValueEn =
        setting.valueEn?.trim() ??
        '';

      if (
        finalCodeAr &&
        !finalValueAr
      ) {
        throw new BadRequestException(
          'Arabic value is required when Arabic code is provided',
        );
      }

      if (
        finalCodeEn &&
        !finalValueEn
      ) {
        throw new BadRequestException(
          'English value is required when English code is provided',
        );
      }
    }

    const saved =
      await this.settingRepo.save(
        setting,
      );

    await this.auditLogsService.record(
      {
        actorId:
          actor.id,

        entityType:
          'Setting',

        entityId:
          saved.id,

        action:
          AuditAction.UPDATE,

        oldValue,

        newValue:
          saved,
      },
    );

    return saved;
  }

  /*
   * -----------------------------------------------------
   * REMOVE
   * -----------------------------------------------------
   */

  async remove(
    id: string,
    actor: UserEntity,
  ): Promise<void> {
    const setting =
      await this.findOne(
        id,
      );

    if (
      setting.isSystem
    ) {
      throw new BadRequestException(
        'This is a built-in status/type used by the app\'s workflow and cannot be deleted — you can still edit its Arabic/English text.',
      );
    }

    setting.isActive =
      false;

    setting.archivedAt =
      new Date();

    await this.settingRepo.save(
      setting,
    );

    await this.auditLogsService.record(
      {
        actorId:
          actor.id,

        entityType:
          'Setting',

        entityId:
          setting.id,

        action:
          AuditAction.DELETE,

        newValue: {
          isActive:
            false,

          archivedAt:
            setting.archivedAt,
        },
      },
    );
  }

  /*
   * -----------------------------------------------------
   * UNIQUE MACHINE KEY
   * -----------------------------------------------------
   *
   * Used only by Task Status / Type / Priority /
   * Project Status list settings.
   */

  private async generateUniqueKey(
    type: SettingType,
    sourceText: string,
  ): Promise<string> {
    const base =
      sourceText
        .trim()
        .split(
          /[^a-zA-Z0-9]+/,
        )
        .filter(Boolean)
        .map(
          (word) =>
            word
              .charAt(0)
              .toUpperCase() +
            word.slice(1),
        )
        .join('') ||
      'Custom';

    let candidate =
      base;

    let suffix = 1;

    while (
      await this.settingRepo.findOne(
        {
          where: {
            type,
            key:
              candidate,
          },
        },
      )
    ) {
      suffix += 1;

      candidate =
        `${base}${suffix}`;
    }

    return candidate;
  }

  /*
   * -----------------------------------------------------
   * VALUE FIELD BUILDER
   * -----------------------------------------------------
   */

  private buildValueFields(
    valueType:
      SettingValueType,

    valueAr?: string,

    valueEn?: string,

    valueNumber?: number,

    existing?: SettingEntity,
  ): Partial<SettingEntity> {
    if (
      valueType ===
      SettingValueType.NUMBER
    ) {
      const num =
        valueNumber !==
        undefined
          ? valueNumber
          : existing
            ? Number(
                existing.valueNumber,
              )
            : undefined;

      return {
        valueType:
          SettingValueType.NUMBER,

        valueNumber:
          num !== undefined
            ? num.toString()
            : undefined,

        valueAr:
          null as unknown as undefined,

        valueEn:
          null as unknown as undefined,
      };
    }

    return {
      valueType:
        SettingValueType.STRING,

      valueAr:
        valueAr !==
        undefined
          ? valueAr
          : existing?.valueAr,

      valueEn:
        valueEn !==
        undefined
          ? valueEn
          : existing?.valueEn,

      valueNumber:
        null as unknown as undefined,
    };
  }
}