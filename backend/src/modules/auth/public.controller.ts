import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from '../settings/settings.service';
import { Public } from '../../common/decorators/public.decorator';
import { SettingType } from '../../shared/enums/setting-type.enum';

/**
 * Unauthenticated directory data needed by the public sign-up form
 * (POST /auth/register): a new visitor picks a Branch and a Department
 * (two independent flat lists, each just a filtered slice of the
 * polymorphic `settings` table) before they have a token. Only minimal,
 * non-sensitive fields are returned.
 */
@ApiTags('public')
@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('branches')
  async branches() {
    const branches = await this.settingsService.findAll(SettingType.BRANCH);
    return branches
      .filter((b) => b.isActive)
      .map((b) => ({ id: b.id, codeAr: b.codeAr, codeEn: b.codeEn, valueAr: b.valueAr, valueEn: b.valueEn }));
  }

  @Get('departments')
  async departments() {
    const departments = await this.settingsService.findAll(SettingType.DEPARTMENT);
    return departments
      .filter((d) => d.isActive)
      .map((d) => ({ id: d.id, codeAr: d.codeAr, codeEn: d.codeEn, valueAr: d.valueAr, valueEn: d.valueEn }));
  }
}
