import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { BrandingSettingsEntity } from './entities/branding-settings.entity';
import { UpdateBrandingDto } from './dto/branding.dto';
import { UserEntity } from '../users/entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';

@Injectable()
export class BrandingService {
  constructor(
    @InjectRepository(BrandingSettingsEntity)
    private readonly brandingRepo: Repository<BrandingSettingsEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * There is always exactly one row. Lazily creates it with defaults on
   * first access instead of relying on a seed/migration-time insert.
   */
  async getOrCreate(): Promise<BrandingSettingsEntity> {
    const existing = await this.brandingRepo.find({ order: { createdAt: 'ASC' }, take: 1 });
    if (existing.length > 0) return existing[0];
    return this.brandingRepo.save(this.brandingRepo.create({}));
  }

  async update(dto: UpdateBrandingDto, user: UserEntity): Promise<BrandingSettingsEntity> {
    const settings = await this.getOrCreate();
    const oldValue = { ...settings };

    Object.assign(settings, dto);
    settings.updatedById = user.id;
    const saved = await this.brandingRepo.save(settings);

    await this.auditLogsService.record({
      actorId: user.id,
      entityType: 'BrandingSettings',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: saved,
      reason: 'Site branding updated',
    });

    return saved;
  }

  async uploadLogo(file: Express.Multer.File, user: UserEntity): Promise<BrandingSettingsEntity> {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.replaceAsset('logoUrl', '/branding-assets/', file, user, 'Logo updated');
  }

  async removeLogo(user: UserEntity): Promise<BrandingSettingsEntity> {
    return this.clearAsset('logoUrl', user, 'Logo removed');
  }

  async uploadFavicon(file: Express.Multer.File, user: UserEntity): Promise<BrandingSettingsEntity> {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.replaceAsset('faviconUrl', '/branding-assets/', file, user, 'Favicon updated');
  }

  async removeFavicon(user: UserEntity): Promise<BrandingSettingsEntity> {
    return this.clearAsset('faviconUrl', user, 'Favicon removed');
  }

  private async replaceAsset(
    field: 'logoUrl' | 'faviconUrl',
    urlPrefix: string,
    file: Express.Multer.File,
    user: UserEntity,
    reason: string,
  ): Promise<BrandingSettingsEntity> {
    const settings = await this.getOrCreate();
    const previousUrl = settings[field];

    settings[field] = `${urlPrefix}${file.filename}`;
    settings.updatedById = user.id;
    const saved = await this.brandingRepo.save(settings);

    // Best-effort cleanup of the old file — don't fail the request over it.
    if (previousUrl && previousUrl.startsWith(urlPrefix)) {
      await unlink(join('.', 'uploads', 'branding', previousUrl.replace(urlPrefix, ''))).catch(
        () => undefined,
      );
    }

    await this.auditLogsService.record({
      actorId: user.id,
      entityType: 'BrandingSettings',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      reason,
    });

    return saved;
  }

  private async clearAsset(
    field: 'logoUrl' | 'faviconUrl',
    user: UserEntity,
    reason: string,
  ): Promise<BrandingSettingsEntity> {
    const settings = await this.getOrCreate();
    const previousUrl = settings[field];

    // IMPORTANT: must be `null`, not `undefined`. TypeORM's save() treats
    // `undefined` properties as "leave unchanged" and omits them from the
    // UPDATE statement entirely, so the old URL would silently stay in the
    // DB even though this looks like it worked (response/audit log still
    // succeed). `null` is what actually clears the nullable column.
    settings[field] = null as unknown as undefined;
    settings.updatedById = user.id;
    const saved = await this.brandingRepo.save(settings);

    if (previousUrl && previousUrl.startsWith('/branding-assets/')) {
      await unlink(
        join('.', 'uploads', 'branding', previousUrl.replace('/branding-assets/', '')),
      ).catch(() => undefined);
    }

    await this.auditLogsService.record({
      actorId: user.id,
      entityType: 'BrandingSettings',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      reason,
    });

    return saved;
  }
}
