import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingEntity } from './entities/setting.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateSettingDto, UpdateSettingDto } from './dto/setting.dto';
import { SettingType } from '../../shared/enums/setting-type.enum';
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
  findAll(type?: SettingType) {
    return this.settingRepo.find({
      where: type ? { type } : {},
      order: { type: 'ASC', codeEn: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SettingEntity> {
    const setting = await this.settingRepo.findOne({ where: { id } });
    if (!setting) throw new NotFoundException('Setting not found');
    return setting;
  }

  async create(dto: CreateSettingDto, actor: UserEntity): Promise<SettingEntity> {
    const entityLike: Partial<SettingEntity> = {
      type: dto.type,
      codeAr: dto.codeAr,
      codeEn: dto.codeEn,
      address: dto.address,
      isAdminDepartment: dto.isAdminDepartment ?? false,
      createdById: actor.id,
      isActive: true,
      ...this.buildValueFields(dto.valueType, dto.valueAr, dto.valueEn, dto.valueNumber),
    };

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

    if (dto.codeAr !== undefined) setting.codeAr = dto.codeAr;
    if (dto.codeEn !== undefined) setting.codeEn = dto.codeEn;
    if (dto.address !== undefined) setting.address = dto.address;
    if (dto.isAdminDepartment !== undefined) setting.isAdminDepartment = dto.isAdminDepartment;
    if (dto.isActive !== undefined) setting.isActive = dto.isActive;

    const valueType = dto.valueType ?? setting.valueType;
    Object.assign(
      setting,
      this.buildValueFields(valueType, dto.valueAr, dto.valueEn, dto.valueNumber, setting),
    );

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
