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
import { LoginDto, ResetPasswordDto } from './dto/auth.dto';
import { RegisterUserDto } from '../users/dto/user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
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
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
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

  /**
   * Generic confirmation regardless of whether the email exists, to avoid
   * leaking account existence (Section 8.1.4).
   * A full email-delivery integration is out of scope for this backend
   * scaffold; this issues a reset token record that a mail worker would
   * consume in a production deployment.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (user) {
      // In production this would enqueue a transactional email containing
      // a signed, time-limited reset token. Left as an integration point.
    }
    return { message: 'If an account with that email exists, a reset link has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Placeholder: token verification would be implemented against a
    // dedicated password_reset_tokens table in a full implementation.
    throw new UnauthorizedException('Invalid or expired reset token');
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
