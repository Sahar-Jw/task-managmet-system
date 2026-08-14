import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BrandingSettingsEntity } from './entities/branding-settings.entity';
import { BrandingService } from './branding.service';
import { BrandingController } from './branding.controller';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { brandingMulterConfig } from './branding-multer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([BrandingSettingsEntity]),
    AuditLogsModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        brandingMulterConfig(config.get<number>('uploads.brandingMaxFileSizeMb') ?? 5),
    }),
  ],
  providers: [BrandingService],
  controllers: [BrandingController],
  exports: [BrandingService],
})
export class BrandingModule {}
