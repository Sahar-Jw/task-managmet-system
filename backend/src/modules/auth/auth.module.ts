import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PublicController } from './public.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RefreshTokenEntity, UserSessionEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiresIn') },
      }),
    }),
    UsersModule,
    SettingsModule,
    AuditLogsModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController, PublicController],
  exports: [AuthService],
})
export class AuthModule {}
