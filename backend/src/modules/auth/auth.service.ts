import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { PasswordResetTokenEntity } from './entities/password-reset-token.entity';
import { LoginDto, ResetPasswordDto } from './dto/auth.dto';
import { RegisterUserDto } from '../users/dto/user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { MailService } from '../mail/mail.service';
import { UserEntity } from '../users/entities/user.entity';
import { AuditAction } from '../../shared/enums/audit-action.enum';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: Partial<UserEntity>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokenRepo: Repository<RefreshTokenEntity>,
    @InjectRepository(PasswordResetTokenEntity)
    private readonly passwordResetTokenRepo: Repository<PasswordResetTokenEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly mailService: MailService,
  ) {}

  // BR-019, BR-020: password policy enforced at signup; account locks after
  // repeated failures.
  async login(dto: LoginDto, ipAddress?: string): Promise<LoginResult> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account is locked until ${user.lockedUntil.toISOString()}. Contact your Admin or wait for the cool-down.`,
      );
    }

    if (!user.isActive) {
      // BR-017: a deactivated User cannot authenticate.
      throw new ForbiddenException('This account has been deactivated');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      await this.registerFailedLogin(user, ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Successful login resets the failure counter.
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await this.usersService.saveEntity(user);

    await this.auditLogsService.record({
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.LOGIN,
      ipAddress,
    });

    return this.issueTokens(user);
  }

  // POST /auth/register — public sign-up; issues tokens immediately so the
  // new User lands straight in the app, same as a successful login.
  async register(dto: RegisterUserDto): Promise<LoginResult> {
    const user = await this.usersService.registerSelf(dto);
    return this.issueTokens(user);
  }

  // BR-020: lock after N consecutive failed attempts (default 5).
  private async registerFailedLogin(user: UserEntity, ipAddress?: string) {
    const threshold = this.configService.get<number>('security.failedLoginLockThreshold') ?? 5;
    const lockMinutes = this.configService.get<number>('security.failedLoginLockMinutes') ?? 15;

    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= threshold) {
      user.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
      await this.auditLogsService.record({
        actorId: user.id,
        entityType: 'User',
        entityId: user.id,
        action: AuditAction.ACCOUNT_LOCKED,
        reason: `Locked after ${user.failedLoginAttempts} consecutive failed login attempts`,
        ipAddress,
      });
    }
    await this.usersService.saveEntity(user);

    await this.auditLogsService.record({
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.LOGIN_FAILED,
      ipAddress,
    });
  }

  private async issueTokens(user: UserEntity): Promise<LoginResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      departmentId: user.departmentId,
      branchId: user.branchId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: this.configService.get<string>('jwt.accessExpiresIn'),
    });

    const rawRefreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') ?? '7d';

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt: this.addDuration(new Date(), refreshExpiresIn),
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        departmentId: user.departmentId,
        branchId: user.branchId,
      },
    };
  }

  // POST /auth/refresh: rotates the refresh token (revokes old, issues new).
  async refresh(rawRefreshToken: string): Promise<LoginResult> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const existing = await this.refreshTokenRepo.findOne({
      where: { tokenHash, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
      relations: ['user'],
    });

    if (!existing) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    existing.revokedAt = new Date();
    await this.refreshTokenRepo.save(existing);

    const user = await this.usersService.findByIdWithRelations(existing.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }

    return this.issueTokens(user);
  }

  async logout(rawRefreshToken: string, userId: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });

    await this.auditLogsService.record({
      actorId: userId,
      entityType: 'User',
      entityId: userId,
      action: AuditAction.LOGOUT,
    });
  }

  // Same 30-minute window used to build the copy in the reset email.
  private static readonly RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

  /**
   * Generic confirmation regardless of whether the email exists, to avoid
   * leaking account existence (Section 8.1.4). If the account exists, a
   * single-use, 30-minute reset token is generated, hashed, stored, and
   * emailed as a link to the frontend's reset-password page.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);

      await this.passwordResetTokenRepo.save(
        this.passwordResetTokenRepo.create({
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + AuthService.RESET_TOKEN_TTL_MS),
        }),
      );

      const frontendUrl = this.configService.get<string>('frontendUrl');
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;
      await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
    }

    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.passwordResetTokenRepo.findOne({
      where: { tokenHash, usedAt: IsNull(), expiresAt: MoreThan(new Date()) },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.usersService.findById(resetToken.userId);

    const saltRounds = this.configService.get<number>('security.bcryptSaltRounds') ?? 12;
    user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    await this.usersService.saveEntity(user);

    resetToken.usedAt = new Date();
    await this.passwordResetTokenRepo.save(resetToken);

    // A password reset invalidates any refresh tokens issued before it, so
    // a device that had the old password can't stay signed in past a reset
    // the account owner didn't perform themselves.
    await this.refreshTokenRepo.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    await this.auditLogsService.record({
      actorId: user.id,
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.UPDATE,
      reason: 'Password reset via forgot-password flow',
    });

    return { message: 'Password has been reset. You can now sign in.' };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private addDuration(base: Date, duration: string): Date {
    const match = /^(\d+)([smhd])$/.exec(duration);
    if (!match) return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multiplier = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] ?? 86400000;
    return new Date(base.getTime() + value * multiplier);
  }
}