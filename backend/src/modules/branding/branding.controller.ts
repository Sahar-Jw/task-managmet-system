import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { BrandingService } from './branding.service';
import { UpdateBrandingDto } from './dto/branding.dto';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleName } from '../../shared/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

/**
 * Site-wide white-label config: name, logo, favicon, SEO metadata.
 * GET is public — the login page, the browser tab (title/favicon), and
 * the Next.js <head> all need it before a user has signed in. Every write
 * is Admin-only.
 */
@ApiTags('branding')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branding')
export class BrandingController {
  constructor(private readonly brandingService: BrandingService) {}

  @Public()
  @Get()
  get() {
    return this.brandingService.getOrCreate();
  }

  @ApiBearerAuth()
  @Patch()
  @Roles(RoleName.ADMIN)
  update(@Body() dto: UpdateBrandingDto, @CurrentUser() user: UserEntity) {
    return this.brandingService.update(dto, user);
  }

  @ApiBearerAuth()
  @Post('logo')
  @Roles(RoleName.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: UserEntity) {
    return this.brandingService.uploadLogo(file, user);
  }

  @ApiBearerAuth()
  @Delete('logo')
  @Roles(RoleName.ADMIN)
  removeLogo(@CurrentUser() user: UserEntity) {
    return this.brandingService.removeLogo(user);
  }

  @ApiBearerAuth()
  @Post('favicon')
  @Roles(RoleName.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadFavicon(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: UserEntity) {
    return this.brandingService.uploadFavicon(file, user);
  }

  @ApiBearerAuth()
  @Delete('favicon')
  @Roles(RoleName.ADMIN)
  removeFavicon(@CurrentUser() user: UserEntity) {
    return this.brandingService.removeFavicon(user);
  }
}
