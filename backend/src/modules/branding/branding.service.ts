import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  unlink,
} from 'fs/promises';

import {
  BrandingSettingsEntity,
} from './entities/branding-settings.entity';

import {
  UpdateBrandingDto,
} from './dto/branding.dto';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';

import {
  storedFileUrl,
  storagePathFromUrl,
} from '../../common/storage/storage.util';


@Injectable()
export class BrandingService {
  constructor(
    @InjectRepository(
      BrandingSettingsEntity,
    )
    private readonly brandingRepo:
      Repository<BrandingSettingsEntity>,

    private readonly auditLogsService:
      AuditLogsService,
  ) {}


  /*
   * ==========================================================
   * GET
   * ==========================================================
   */

  async getOrCreate():
    Promise<BrandingSettingsEntity> {
    const existing =
      await this.brandingRepo.find({
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
      return existing[
        0
      ];
    }


    return this.brandingRepo.save(
      this.brandingRepo.create(
        {},
      ),
    );
  }


  /*
   * ==========================================================
   * TEXT SETTINGS
   * ==========================================================
   */

  async update(
    dto:
      UpdateBrandingDto,

    user:
      UserEntity,
  ): Promise<BrandingSettingsEntity> {
    const settings =
      await this.getOrCreate();


    const oldValue = {
      ...settings,
    };


    Object.assign(
      settings,
      dto,
    );


    settings.updatedById =
      user.id;


    const saved =
      await this.brandingRepo.save(
        settings,
      );


    await this.auditLogsService.record({
      actorId:
        user.id,

      entityType:
        'BrandingSettings',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      oldValue,

      newValue:
        saved,

      reason:
        'Site branding updated',
    });


    return saved;
  }


  /*
   * ==========================================================
   * LOGO
   * ==========================================================
   */

  async uploadLogo(
    file:
      Express.Multer.File,

    user:
      UserEntity,
  ): Promise<BrandingSettingsEntity> {
    if (
      !file
    ) {
      throw new BadRequestException(
        'No file uploaded',
      );
    }


    return this.replaceAsset(
      'logoUrl',
      file,
      user,
      'Logo updated',
    );
  }


  async removeLogo(
    user:
      UserEntity,
  ): Promise<BrandingSettingsEntity> {
    return this.clearAsset(
      'logoUrl',
      user,
      'Logo removed',
    );
  }


  /*
   * ==========================================================
   * FAVICON
   * ==========================================================
   */

  async uploadFavicon(
    file:
      Express.Multer.File,

    user:
      UserEntity,
  ): Promise<BrandingSettingsEntity> {
    if (
      !file
    ) {
      throw new BadRequestException(
        'No file uploaded',
      );
    }


    return this.replaceAsset(
      'faviconUrl',
      file,
      user,
      'Favicon updated',
    );
  }


  async removeFavicon(
    user:
      UserEntity,
  ): Promise<BrandingSettingsEntity> {
    return this.clearAsset(
      'faviconUrl',
      user,
      'Favicon removed',
    );
  }


  /*
   * ==========================================================
   * REPLACE ASSET
   * ==========================================================
   */

  private async replaceAsset(
    field:
      'logoUrl' |
      'faviconUrl',

    file:
      Express.Multer.File,

    user:
      UserEntity,

    reason:
      string,
  ): Promise<BrandingSettingsEntity> {
    const settings =
      await this.getOrCreate();


    const previousUrl =
      settings[
        field
      ];


    /*
     * Only the URL goes to MySQL.
     */
    settings[
      field
    ] =
      storedFileUrl(
        file.path,
      );


    settings.updatedById =
      user.id;


    const saved =
      await this.brandingRepo.save(
        settings,
      );


    if (
      previousUrl
    ) {
      const previousPath =
        storagePathFromUrl(
          previousUrl,
        );


      if (
        previousPath
      ) {
        await unlink(
          previousPath,
        ).catch(
          () =>
            undefined,
        );
      }
    }


    await this.auditLogsService.record({
      actorId:
        user.id,

      entityType:
        'BrandingSettings',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      newValue: {
        [
          field
        ]:
          saved[
            field
          ],
      },

      reason,
    });


    return saved;
  }


  /*
   * ==========================================================
   * CLEAR ASSET
   * ==========================================================
   */

  private async clearAsset(
    field:
      'logoUrl' |
      'faviconUrl',

    user:
      UserEntity,

    reason:
      string,
  ): Promise<BrandingSettingsEntity> {
    const settings =
      await this.getOrCreate();


    const previousUrl =
      settings[
        field
      ];


    /*
     * TypeORM must receive NULL, not undefined.
     */
    (
      settings as any
    )[
      field
    ] =
      null;


    settings.updatedById =
      user.id;


    const saved =
      await this.brandingRepo.save(
        settings,
      );


    if (
      previousUrl
    ) {
      const previousPath =
        storagePathFromUrl(
          previousUrl,
        );


      if (
        previousPath
      ) {
        await unlink(
          previousPath,
        ).catch(
          () =>
            undefined,
        );
      }
    }


    await this.auditLogsService.record({
      actorId:
        user.id,

      entityType:
        'BrandingSettings',

      entityId:
        saved.id,

      action:
        AuditAction.UPDATE,

      oldValue: {
        [
          field
        ]:
          previousUrl,
      },

      newValue: {
        [
          field
        ]:
          null,
      },

      reason,
    });


    return saved;
  }
}