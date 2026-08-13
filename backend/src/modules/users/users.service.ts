import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { UserEntity } from './entities/user.entity';
import {
  AdminUpdateUserDto,
  ChangeOwnPasswordDto,
  RegisterUserDto,
  UpdateOwnProfileDto,
} from './dto/user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { RolesService } from '../roles/roles.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { RoleName } from '../../shared/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly rolesService: RolesService,
    private readonly auditLogsService: AuditLogsService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: QueryUsersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy('user.fullName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.branchId) qb.andWhere('user.branchId = :branchId', { branchId: query.branchId });
    if (query.departmentId) qb.andWhere('user.departmentId = :departmentId', { departmentId: query.departmentId });
    if (query.roleId) qb.andWhere('user.roleId = :roleId', { roleId: query.roleId });
    if (query.isActive !== undefined) qb.andWhere('user.isActive = :isActive', { isActive: query.isActive === 'true' });
    if (query.search) {
      qb.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Used by JwtStrategy on every authenticated request. */
  findByIdWithRelations(id: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.email = :email', { email })
      .getOne();
  }

  // Account creation is self-service only (POST /auth/register) — there is
  // intentionally no admin "create user" endpoint. See UsersController.

  // Self edit — only non-sensitive fields (enforced by DTO shape itself)
  async updateOwnProfile(id: string, dto: UpdateOwnProfileDto): Promise<UserEntity> {
    const user = await this.findById(id);
    const oldValue = { ...user };
    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);

    await this.auditLogsService.record({
      actorId: id,
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      oldValue: { fullName: oldValue.fullName, phone: oldValue.phone },
      newValue: { fullName: saved.fullName, phone: saved.phone },
    });

    return this.findById(saved.id);
  }

  // Admin may modify any field; role changes are Admin-exclusive.
  // the last active Admin cannot be deactivated.
  async adminUpdate(id: string, dto: AdminUpdateUserDto, actor: UserEntity): Promise<UserEntity> {
    const user = await this.findById(id);
    const oldValue = { ...user };

    if (dto.email && dto.email !== user.email) {
      const emailTaken = await this.userRepo.findOne({ where: { email: dto.email } });
      if (emailTaken) throw new ConflictException('Email already in use'); 
    }

    if (dto.isActive === false) {
      await this.assertNotLastActiveAdmin(user); 
    }

    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'User',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue: { ...oldValue, passwordHash: undefined },
      newValue: { ...saved, passwordHash: undefined },
      reason: dto.departmentId && dto.departmentId !== oldValue.departmentId
        ? 'Department reassignment by Admin (BR-010)'
        : undefined,
    });

    return this.findById(saved.id);
  }

  // only Admin deactivates; last active Admin cannot be removed.
  async deactivate(id: string, actor: UserEntity): Promise<void> {
    const user = await this.findById(id);
    await this.assertNotLastActiveAdmin(user);

    user.isActive = false;
    user.archivedAt = new Date();
    await this.userRepo.save(user);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.DELETE,
      newValue: { isActive: false },
    });
  }

  // Permanently removes the row from the database. Only Admin; last active
  // Admin cannot be removed and an Admin cannot delete their own account.
  // If the user still has related records (tasks, comments, audit history,
  // etc.) the DB's foreign-key constraints will reject the delete — in that
  // case we surface a friendly error suggesting deactivation instead.
  async hardDelete(id: string, actor: UserEntity): Promise<void> {
    const user = await this.findById(id);
    await this.assertNotLastActiveAdmin(user);

    if (actor.id === id) {
      throw new BadRequestException('You cannot permanently delete your own account');
    }

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.DELETE,
      oldValue: { fullName: user.fullName, email: user.email, isActive: user.isActive },
      reason: 'Permanent deletion by Admin',
    });

    try {
      await this.userRepo.delete(id);
    } catch (err: any) {
      if (err?.code === '23503') {
        throw new BadRequestException(
          'This user has related records (tasks, comments, audit history, etc.) and cannot be permanently deleted. Deactivate the account instead.',
        );
      }
      throw err;
    }
  }

  private async assertNotLastActiveAdmin(user: UserEntity) {
    if (user.role?.name !== RoleName.ADMIN || !user.isActive) return;
    const activeAdminCount = await this.userRepo
      .createQueryBuilder('u')
      .innerJoin('u.role', 'role')
      .where('role.name = :roleName', { roleName: RoleName.ADMIN })
      .andWhere('u.isActive = true')
      .getCount();
    if (activeAdminCount <= 1) {
      throw new BadRequestException('Cannot deactivate the last remaining active Admin account');
    }
  }

  // unlock a locked account
  async unlock(id: string, actor: UserEntity): Promise<UserEntity> {
    const user = await this.findById(id);
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    const saved = await this.userRepo.save(user);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.ACCOUNT_UNLOCKED,
    });

    return saved;
  }

  async changeOwnPassword(id: string, dto: ChangeOwnPasswordDto): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException('User not found');

    const matches = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!matches) throw new ForbiddenException('Current password is incorrect');

    const saltRounds = this.configService.get<number>('security.bcryptSaltRounds') ?? 12;
    user.passwordHash = await bcrypt.hash(dto.newPassword, saltRounds);
    await this.userRepo.save(user);

    await this.auditLogsService.record({
      actorId: id,
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Password changed by user',
    });
  }

  // Public self-service sign-up (POST /auth/register). Always assigns the
  // standard USER role; there is no actor since the account doesn't exist yet.
  async registerSelf(dto: RegisterUserDto): Promise<UserEntity> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('A User with this email already exists');

    const role = await this.rolesService.findByName(RoleName.USER);
    if (!role) throw new BadRequestException('Default USER role is not configured');

    const saltRounds = this.configService.get<number>('security.bcryptSaltRounds') ?? 12;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.userRepo.save(
      this.userRepo.create({
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        phone: dto.phone,
        roleId: role.id,
        departmentId: dto.departmentId,
        branchId: dto.branchId,
        isActive: true,
      }),
    );

    await this.auditLogsService.record({
      entityType: 'User',
      entityId: user.id,
      action: AuditAction.CREATE,
      newValue: { ...user, passwordHash: undefined },
      reason: 'Self-service registration',
    });

    return this.findById(user.id);
  }

  /** Internal helper used by AuthService for login-attempt tracking */
  async saveEntity(user: UserEntity): Promise<UserEntity> {
    return this.userRepo.save(user);
  }

  async uploadAvatar(id: string, file: Express.Multer.File): Promise<UserEntity> {
    if (!file) throw new BadRequestException('No file uploaded');

    const user = await this.findById(id);
    const previousUrl = user.avatarUrl;

    user.avatarUrl = `/avatars/${file.filename}`;
    const saved = await this.userRepo.save(user);

    // Best-effort cleanup of the old file — don't fail the request over it.
    if (previousUrl && previousUrl.startsWith('/avatars/')) {
      await unlink(join('.', 'uploads', 'avatars', previousUrl.replace('/avatars/', ''))).catch(
        () => undefined,
      );
    }

    await this.auditLogsService.record({
      actorId: id,
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Avatar updated',
    });

    return this.findById(saved.id);
  }

  async removeAvatar(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    const previousUrl = user.avatarUrl;

    user.avatarUrl = undefined;
    const saved = await this.userRepo.save(user);

    if (previousUrl && previousUrl.startsWith('/avatars/')) {
      await unlink(join('.', 'uploads', 'avatars', previousUrl.replace('/avatars/', ''))).catch(
        () => undefined,
      );
    }

    await this.auditLogsService.record({
      actorId: id,
      entityType: 'User',
      entityId: id,
      action: AuditAction.UPDATE,
      reason: 'Avatar removed',
    });

    return this.findById(saved.id);
  }
}