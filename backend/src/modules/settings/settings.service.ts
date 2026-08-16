import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from './entities/setting.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import { SettingType, LIST_SETTING_TYPES } from '../../shared/enums/setting-type.enum';
import { SettingValueType } from '../../shared/enums/setting-value-type.enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settingRepo: Repository<SettingEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Setting is a standalone polymorphic lookup entity (no relation to
  // Branch/Department/User); it is only ever referenced elsewhere (e.g. by
  // Task) via its plain id. `type` narrows down to one "table" at a time
  // (department / branch / project_setting).
  findAll(type?: SettingType, isActive?: string) {
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (isActive === 'true') where.isActive = true;
    else if (isActive === 'false') where.isActive = false;

    return this.settingRepo.find({
      where,
      order: { type: 'ASC', codeEn: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SettingEntity> {
    const setting = await this.settingRepo.findOne({ where: { id } });
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async create(dto: CreateSettingDto, actor: UserEntity): Promise<SettingEntity> {
    const isListType = LIST_SETTING_TYPES.includes(dto.type);
    const codeAr = dto.codeAr?.trim() || '';
    const codeEn = dto.codeEn?.trim() || '';

    let entityLike: Partial<SettingEntity>;

    if (isListType) {
      // Only one language is required here — whichever language the admin
      // was using when they hit "Add". The row simply doesn't have a label
      // in the other language yet, so it won't be shown while the app is
      // in that language, until someone edits it later to fill it in.
      if (!codeAr && !codeEn) {
        throw new BadRequestException('Provide a label in at least one language');
      }
      entityLike = {
        type: dto.type,
        codeAr,
        codeEn,
        key: await this.generateUniqueKey(dto.type, codeEn || codeAr),
        isSystem: false,
        createdById: actor.id,
        isActive: true,
        valueType: SettingValueType.STRING,
        valueAr: codeAr,
        valueEn: codeEn,
        valueNumber: null as unknown as undefined,
      };
    } else {
      if (!codeAr || !codeEn) {
        throw new BadRequestException('Both Arabic and English text are required');
      }
      entityLike = {
        type: dto.type,
        codeAr,
        codeEn,
        address: dto.address,
        isAdminDepartment: dto.isAdminDepartment ?? false,
        createdById: actor.id,
        isActive: true,
        ...this.buildValueFields(dto.valueType!, dto.valueAr, dto.valueEn, dto.valueNumber),
      };
    }

    const setting = await this.settingRepo.save(this.settingRepo.create(entityLike));

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Setting',
      entityId: setting.id,
      action: AuditAction.CREATE,
      newValue: setting,
    });

    return setting;
  }

  async update(id: string, dto: UpdateSettingDto, actor: UserEntity): Promise<SettingEntity> {
    const setting = await this.findOne(id);
    const oldValue = { ...setting };
    const isListType = LIST_SETTING_TYPES.includes(setting.type);

    if (dto.codeAr !== undefined) setting.codeAr = dto.codeAr.trim();
    if (dto.codeEn !== undefined) setting.codeEn = dto.codeEn.trim();
    if (dto.isActive !== undefined) setting.isActive = dto.isActive;

    if (isListType) {
      // List rows: the code fields ARE the label; keep the legacy value_ar/
      // value_en columns mirrored for consistency, and never touch `key`
      // (it's the stable reference Task/Project rows point to).
      setting.valueType = SettingValueType.STRING;
      setting.valueAr = setting.codeAr;
      setting.valueEn = setting.codeEn;
      setting.valueNumber = null as unknown as undefined;
    } else {
      if (dto.address !== undefined) setting.address = dto.address;
      if (dto.isAdminDepartment !== undefined) setting.isAdminDepartment = dto.isAdminDepartment;
      const valueType = dto.valueType ?? setting.valueType;
      Object.assign(
        setting,
        this.buildValueFields(valueType, dto.valueAr, dto.valueEn, dto.valueNumber, setting),
      );
    }

    const saved = await this.settingRepo.save(setting);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Setting',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: saved,
    });

    return saved;
  }

  async remove(id: string, actor: UserEntity): Promise<void> {
    const setting = await this.findOne(id);

    if (setting.isSystem) {
      throw new BadRequestException(
        'This is a built-in status/type used by the app\'s workflow and cannot be deleted — you can still edit its Arabic/English text.',
      );
    }

    setting.isActive = false;
    setting.archivedAt = new Date();
    await this.settingRepo.save(setting);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Setting',
      entityId: setting.id,
      action: AuditAction.DELETE,
      newValue: { isActive: false, archivedAt: setting.archivedAt },
    });
  }

  // Derives a stable, unique machine key for a new custom list entry from
  // its English label (e.g. "Awaiting Vendor" -> "AwaitingVendor"), adding
  // a numeric suffix on collision. Generated once at creation and never
  // changes afterwards, even if the label is later edited.
  private async generateUniqueKey(type: SettingType, codeEn: string): Promise<string> {
    const base = codeEn
      .trim()
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Custom';

    let candidate = base;
    let suffix = 1;
    // Small table (a handful of statuses/types per category) — a loop of
    // existence checks is simpler and safe here.
    while (await this.settingRepo.findOne({ where: { type, key: candidate } })) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    return candidate;
  }

  // Only the value column matching valueType is ever populated; the other
  // is explicitly nulled out so a row never ends up with both a string and
  // a number value set. `existing` supplies fallback values on update when
  // the caller only sent a subset of fields.
  private buildValueFields(
    valueType: SettingValueType,
    valueAr?: string,
    valueEn?: string,
    valueNumber?: number,
    existing?: SettingEntity,
  ): Partial<SettingEntity> {
    if (valueType === SettingValueType.NUMBER) {
      const num = valueNumber !== undefined ? valueNumber : existing ? Number(existing.valueNumber) : undefined;
      return {
        valueType: SettingValueType.NUMBER,
        valueNumber: num !== undefined ? num.toString() : undefined,
        valueAr: null as unknown as undefined,
        valueEn: null as unknown as undefined,
      };
    }
    return {
      valueType: SettingValueType.STRING,
      valueAr: valueAr ?? existing?.valueAr,
      valueEn: valueEn ?? existing?.valueEn,
      valueNumber: null as unknown as undefined,
    };
  }
}
