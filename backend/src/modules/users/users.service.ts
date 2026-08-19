import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import * as bcrypt
  from 'bcryptjs';

import {
  ConfigService,
} from '@nestjs/config';

import {
  unlink,
} from 'fs/promises';

import {
  UserEntity,
} from './entities/user.entity';

import {
  AdminUpdateUserDto,
  ChangeOwnPasswordDto,
  RegisterUserDto,
  UpdateOwnProfileDto,
} from './dto/user.dto';

import {
  QueryUsersDto,
} from './dto/query-users.dto';

import {
  AuditLogsService,
} from '../audit-logs/audit-logs.service';

import {
  RolesService,
} from '../roles/roles.service';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';

import {
  RoleName,
} from '../../shared/enums/role.enum';

import {
  storedFileUrl,
  storagePathFromUrl,
} from '../../common/storage/storage.util';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(
      UserEntity,
    )
    private readonly userRepo:
      Repository<UserEntity>,

    private readonly rolesService:
      RolesService,

    private readonly auditLogsService:
      AuditLogsService,

    private readonly configService:
      ConfigService,
  ) {}


  /*
   * ==========================================================
   * LIST USERS
   * ==========================================================
   */

  async findAll(
    query:
      QueryUsersDto,
  ) {
    const page =
      query.page ??
      1;


    const limit =
      query.limit ??
      20;


    if (
      query.joinDateFrom &&
      query.joinDateTo &&
      query.joinDateTo <
        query.joinDateFrom
    ) {
      throw new BadRequestException(
        appError('JOIN_DATE_CANNOT_BEFORE_FROM_DATE', 'Join date "to" cannot be before the "from" date'),
      );
    }


    const qb =
      this.userRepo
        .createQueryBuilder(
          'user',
        )
        .leftJoinAndSelect(
          'user.role',
          'role',
        );


    if (
      query.branchId
    ) {
      qb.andWhere(
        'user.branchId = :branchId',
        {
          branchId:
            query.branchId,
        },
      );
    }


    if (
      query.departmentId
    ) {
      qb.andWhere(
        'user.departmentId = :departmentId',
        {
          departmentId:
            query.departmentId,
        },
      );
    }


    if (
      query.roleId
    ) {
      qb.andWhere(
        'user.roleId = :roleId',
        {
          roleId:
            query.roleId,
        },
      );
    }


    if (
      query.isActive !==
      undefined
    ) {
      qb.andWhere(
        'user.isActive = :isActive',
        {
          isActive:
            query.isActive ===
            'true',
        },
      );
    }


    if (
      query.search?.trim()
    ) {
      const search =
        `%${query.search.trim()}%`;


      qb.andWhere(
        `(
          user.fullName LIKE :search
          OR user.email LIKE :search
          OR user.phone LIKE :search
        )`,
        {
          search,
        },
      );
    }


    if (
      query.joinDateFrom
    ) {
      qb.andWhere(
        'user.createdAt >= :joinDateFrom',
        {
          joinDateFrom:
            query.joinDateFrom,
        },
      );
    }


    if (
      query.joinDateTo
    ) {
      qb.andWhere(
        `
          user.createdAt <
          DATE_ADD(
            CAST(
              :joinDateTo
              AS DATE
            ),
            INTERVAL 1 DAY
          )
        `,
        {
          joinDateTo:
            query.joinDateTo,
        },
      );
    }


    const sortColumns:
      Record<
        string,
        string
      > = {
      fullName:
        'user.fullName',

      email:
        'user.email',

      createdAt:
        'user.createdAt',

      role:
        'role.name',

      isActive:
        'user.isActive',
    };


    const sortColumn =
      sortColumns[
        query.sortBy ??
          'fullName'
      ] ??
      'user.fullName';


    const sortDirection =
      query.sortDir ===
      'desc'
        ? 'DESC'
        : 'ASC';


    qb.orderBy(
      sortColumn,
      sortDirection,
    );


    if (
      sortColumn !==
      'user.fullName'
    ) {
      qb.addOrderBy(
        'user.fullName',
        sortDirection,
      );
    }

    qb.addOrderBy(
      'user.id',
      sortDirection,
    );

    qb
      .skip(
        (
          page -
          1
        ) *
          limit,
      )
      .take(
        limit,
      );


    const [
      items,
      total,
    ] =
      await qb.getManyAndCount();


    return {
      items,
      total,
      page,
      limit,
    };
  }


  /*
   * ==========================================================
   * FIND USER
   * ==========================================================
   */

  async findById(
    id:
      string,
  ): Promise<UserEntity> {
    const user =
      await this.userRepo.findOne({
        where: {
          id,
        },
      });


    if (
      !user
    ) {
      throw new NotFoundException(
        appError('USER_NOT_FOUND', 'User not found'),
      );
    }


    return user;
  }


  findByIdWithRelations(
    id:
      string,
  ): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: {
        id,
      },
    });
  }


  findByEmail(
    email:
      string,
  ): Promise<UserEntity | null> {
    return this.userRepo
      .createQueryBuilder(
        'user',
      )
      .addSelect(
        'user.passwordHash',
      )
      .leftJoinAndSelect(
        'user.role',
        'role',
      )
      .where(
        'user.email = :email',
        {
          email,
        },
      )
      .getOne();
  }


  /*
   * ==========================================================
   * OWN PROFILE
   * ==========================================================
   */

  async updateOwnProfile(
    id:
      string,

    dto:
      UpdateOwnProfileDto,
  ): Promise<UserEntity> {
    const user =
      await this.findById(
        id,
      );


    const oldValue = {
      ...user,
    };


    Object.assign(
      user,
      dto,
    );


    const saved =
      await this.userRepo.save(
        user,
      );


    await this.auditLogsService.record({
      actorId:
        id,

      entityType:
        'User',

      entityId:
        id,

      action:
        AuditAction.UPDATE,

      oldValue: {
        fullName:
          oldValue.fullName,

        phone:
          oldValue.phone,
      },

      newValue: {
        fullName:
          saved.fullName,

        phone:
          saved.phone,
      },
    });


    return this.findById(
      saved.id,
    );
  }


  /*
   * ==========================================================
   * ADMIN UPDATE
   * ==========================================================
   */

  async adminUpdate(
    id:
      string,

    dto:
      AdminUpdateUserDto,

    actor:
      UserEntity,
  ): Promise<UserEntity> {
    const user =
      await this.findById(
        id,
      );


    const oldValue = {
      ...user,
    };


    if (
      dto.email &&
      dto.email !==
        user.email
    ) {
      const emailTaken =
        await this.userRepo.findOne({
          where: {
            email:
              dto.email,
          },
        });


      if (
        emailTaken
      ) {
        throw new ConflictException(
          appError('EMAIL_ALREADY_IN_USE', 'Email already in use'),
        );
      }
    }


    if (
      dto.isActive ===
      false
    ) {
      await this.assertNotLastActiveAdmin(
        user,
      );
    }


    await this.applyDepartmentRule(
      user,
      dto,
    );


    Object.assign(
      user,
      dto,
    );


    const saved =
      await this.userRepo.save(
        user,
      );


    /*
     * Resolve Role names for the Audit Log. `user.role` is an eager
     * relation loaded once at the top of this method, so it goes stale
     * the moment roleId changes — fetch fresh names by id instead.
     */
    const [
      oldRole,
      newRole,
    ] =
      oldValue.roleId !==
      saved.roleId
        ? await Promise.all([
            this.rolesService.findById(
              oldValue.roleId,
            ),

            this.rolesService.findById(
              saved.roleId,
            ),
          ])
        : [
            undefined,
            undefined,
          ];


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'User',

      entityId:
        saved.id,

      action:
        dto.isActive !== undefined &&
        dto.isActive !== oldValue.isActive
          ? saved.isActive
            ? AuditAction.ACTIVATE
            : AuditAction.DEACTIVATE
          : AuditAction.UPDATE,

      oldValue: {
        ...oldValue,

        passwordHash:
          undefined,

        role:
          undefined,

        roleName:
          oldRole?.name,
      },

      newValue: {
        ...saved,

        passwordHash:
          undefined,

        role:
          undefined,

        roleName:
          newRole?.name,
      },

      reason:
        dto.departmentId &&
        dto.departmentId !==
          oldValue.departmentId
          ? 'Department reassignment by Admin (BR-010)'
          : undefined,
    });


    return this.findById(
      saved.id,
    );
  }


  /*
   * ==========================================================
   * DEPARTMENT RULE
   * ==========================================================
   */

  private async applyDepartmentRule(
    user:
      UserEntity,

    dto:
      AdminUpdateUserDto,
  ): Promise<void> {
    let finalRoleName =
      user.role?.name;


    if (
      dto.roleId &&
      dto.roleId !==
        user.roleId
    ) {
      const newRole =
        await this.rolesService.findById(
          dto.roleId,
        );


      if (
        !newRole
      ) {
        throw new BadRequestException(
          appError('SELECTED_ROLE_DOES_NOT_EXIST', 'Selected role does not exist'),
        );
      }


      finalRoleName =
        newRole.name;


      /*
       * Keep the eager relation and its scalar foreign key in sync.
       *
       * `findById` loads `user.role` eagerly. If only `roleId` is changed,
       * TypeORM can persist the still-attached old relation and effectively
       * undo the requested role change. Updating both values makes the admin
       * edit deterministic and also makes the response show the new role.
       */
      user.role =
        newRole;

      user.roleId =
        newRole.id;
    }


    if (
      finalRoleName ===
      RoleName.ADMIN
    ) {
      dto.departmentId =
        null;

      return;
    }


    const finalDepartmentId =
      dto.departmentId !==
      undefined
        ? dto.departmentId
        : user.departmentId;


    if (
      !finalDepartmentId
    ) {
      throw new BadRequestException(
        appError('DEPARTMENT_REQUIRED_NON_ADMIN_USERS', 'Department is required for non-Admin Users'),
      );
    }
  }


  /*
   * ==========================================================
   * DEACTIVATE
   * ==========================================================
   */

  async deactivate(
    id:
      string,

    actor:
      UserEntity,
  ): Promise<void> {
    const user =
      await this.findById(
        id,
      );


    if (
      actor.id ===
      id
    ) {
      throw new BadRequestException(
        appError('YOU_CANNOT_DEACTIVATE_OWN_ACCOUNT', 'You cannot deactivate your own account'),
      );
    }


    await this.assertNotLastActiveAdmin(
      user,
    );


    if (
      !user.isActive
    ) {
      throw new ConflictException(
        appError('USER_ALREADY_DEACTIVATED', 'User is already deactivated'),
      );
    }


    user.isActive =
      false;


    user.archivedAt =
      new Date();


    await this.userRepo.save(
      user,
    );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'User',

      entityId:
        user.id,

      action:
        AuditAction.DEACTIVATE,

      oldValue: {
        fullName:
          user.fullName,
        email:
          user.email,
        isActive:
          true,
      },

      newValue: {
        fullName:
          user.fullName,
        email:
          user.email,
        isActive:
          false,
      },

      reason:
        'Account deactivated by Admin',
    });
  }


  /*
   * ==========================================================
   * HARD DELETE
   * ==========================================================
   */

  async hardDelete(
    id:
      string,

    actor:
      UserEntity,
  ): Promise<void> {
    const user =
      await this.findById(
        id,
      );


    await this.assertNotLastActiveAdmin(
      user,
    );


    if (
      actor.id ===
      id
    ) {
      throw new BadRequestException(
        appError('YOU_CANNOT_PERMANENTLY_DELETE_OWN_ACCOUNT', 'You cannot permanently delete your own account'),
      );
    }


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'User',

      entityId:
        user.id,

      action:
        AuditAction.DELETE,

      oldValue: {
        fullName:
          user.fullName,

        email:
          user.email,

        isActive:
          user.isActive,
      },

      reason:
        'Permanent deletion by Admin',
    });


    try {
      await this.userRepo.delete(
        id,
      );
    } catch (
      error:
        any
    ) {
      /*
       * PostgreSQL used 23503.
       * MySQL/MariaDB FK violation is commonly ER_ROW_IS_REFERENCED_2
       * / errno 1451.
       */
      if (
        error?.code ===
          'ER_ROW_IS_REFERENCED_2' ||
        error?.errno ===
          1451 ||
        error?.code ===
          '23503'
      ) {
        throw new BadRequestException(
          appError('USERS_BUSINESS_RULE_VIOLATION', 'This user has related records (tasks, comments, audit history, etc.) and cannot be permanently deleted. Deactivate the account instead.'),
        );
      }


      throw error;
    }
  }


  /*
   * ==========================================================
   * LAST ADMIN GUARD
   * ==========================================================
   */

  private async assertNotLastActiveAdmin(
    user:
      UserEntity,
  ) {
    if (
      user.role?.name !==
        RoleName.ADMIN ||
      !user.isActive
    ) {
      return;
    }


    const activeAdminCount =
      await this.userRepo
        .createQueryBuilder(
          'user',
        )
        .innerJoin(
          'user.role',
          'role',
        )
        .where(
          'role.name = :roleName',
          {
            roleName:
              RoleName.ADMIN,
          },
        )
        .andWhere(
          'user.isActive = :active',
          {
            active:
              true,
          },
        )
        .getCount();


    if (
      activeAdminCount <=
      1
    ) {
      throw new BadRequestException(
        appError('CANNOT_DEACTIVATE_LAST_REMAINING_ACTIVE_ADMIN_ACCOUNT', 'Cannot deactivate the last remaining active Admin account'),
      );
    }
  }


  /*
   * ==========================================================
   * UNLOCK
   * ==========================================================
   */

  async unlock(
    id:
      string,

    actor:
      UserEntity,
  ): Promise<UserEntity> {
    const user =
      await this.findById(
        id,
      );


    user.failedLoginAttempts =
      0;


    user.lockedUntil =
      undefined;


    const saved =
      await this.userRepo.save(
        user,
      );


    await this.auditLogsService.record({
      actorId:
        actor.id,

      entityType:
        'User',

      entityId:
        user.id,

      action:
        AuditAction.ACCOUNT_UNLOCKED,
    });


    return saved;
  }


  /*
   * ==========================================================
   * CHANGE PASSWORD
   * ==========================================================
   */

  async changeOwnPassword(
    id:
      string,

    dto:
      ChangeOwnPasswordDto,
  ): Promise<void> {
    const user =
      await this.userRepo
        .createQueryBuilder(
          'user',
        )
        .addSelect(
          'user.passwordHash',
        )
        .where(
          'user.id = :id',
          {
            id,
          },
        )
        .getOne();


    if (
      !user
    ) {
      throw new NotFoundException(
        appError('USER_NOT_FOUND', 'User not found'),
      );
    }


    const matches =
      await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );


    if (
      !matches
    ) {
      throw new ForbiddenException(
        appError('CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect'),
      );
    }


    const saltRounds =
      this.configService.get<number>(
        'security.bcryptSaltRounds',
      ) ??
      12;


    user.passwordHash =
      await bcrypt.hash(
        dto.newPassword,
        saltRounds,
      );


    await this.userRepo.save(
      user,
    );


    await this.auditLogsService.record({
      actorId:
        id,

      entityType:
        'User',

      entityId:
        id,

      action:
        AuditAction.UPDATE,

      newValue: {
        fullName:
          user.fullName,
      },

      reason:
        'Password changed by user',
    });
  }


  /*
   * ==========================================================
   * REGISTER
   * ==========================================================
   */

  async registerSelf(
    dto:
      RegisterUserDto,
  ): Promise<UserEntity> {
    const existing =
      await this.userRepo.findOne({
        where: {
          email:
            dto.email,
        },
      });


    if (
      existing
    ) {
      throw new ConflictException(
        appError('USER_WITH_EMAIL_ALREADY_EXISTS', 'A User with this email already exists'),
      );
    }


    const role =
      await this.rolesService.findByName(
        RoleName.USER,
      );


    if (
      !role
    ) {
      throw new BadRequestException(
        appError('DEFAULT_USER_ROLE_NOT_CONFIGURED', 'Default USER role is not configured'),
      );
    }


    const saltRounds =
      this.configService.get<number>(
        'security.bcryptSaltRounds',
      ) ??
      12;


    const passwordHash =
      await bcrypt.hash(
        dto.password,
        saltRounds,
      );


    const user =
      await this.userRepo.save(
        this.userRepo.create({
          fullName:
            dto.fullName,

          email:
            dto.email,

          passwordHash,

          phone:
            dto.phone,

          roleId:
            role.id,

          departmentId:
            dto.departmentId,

          branchId:
            dto.branchId,

          isActive:
            true,
        }),
      );


    await this.auditLogsService.record({
      entityType:
        'User',

      entityId:
        user.id,

      action:
        AuditAction.CREATE,

      newValue: {
        ...user,

        passwordHash:
          undefined,
      },

      reason:
        'Self-service registration',
    });


    return this.findById(
      user.id,
    );
  }


  /*
   * ==========================================================
   * INTERNAL SAVE
   * ==========================================================
   */

  async saveEntity(
    user:
      UserEntity,
  ): Promise<UserEntity> {
    return this.userRepo.save(
      user,
    );
  }


  /*
   * ==========================================================
   * AVATAR UPLOAD
   * ==========================================================
   *
   * Physical:
   *
   * backend/storage/avatars/YYYY/MM/file.jpg
   *
   * MySQL:
   *
   * /storage/avatars/YYYY/MM/file.jpg
   * ==========================================================
   */

  async uploadAvatar(
    id:
      string,

    file:
      Express.Multer.File,
  ): Promise<UserEntity> {
    if (
      !file
    ) {
      throw new BadRequestException(
        appError('NO_FILE_UPLOADED', 'No file uploaded'),
      );
    }


    const user =
      await this.findById(
        id,
      );


    const previousUrl =
      user.avatarUrl;


    user.avatarUrl =
      storedFileUrl(
        file.path,
      );


    const saved =
      await this.userRepo.save(
        user,
      );


    /*
     * Only delete old application-owned storage files.
     */
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
        id,

      entityType:
        'User',

      entityId:
        id,

      action:
        AuditAction.UPDATE,

      newValue: {
        fullName:
          saved.fullName,

        avatarUrl:
          saved.avatarUrl,
      },

      reason:
        'Avatar updated',
    });


    return this.findById(
      saved.id,
    );
  }


  /*
   * ==========================================================
   * AVATAR REMOVE
   * ==========================================================
   */

  async removeAvatar(
    id:
      string,
  ): Promise<UserEntity> {
    const user =
      await this.findById(
        id,
      );


    const previousUrl =
      user.avatarUrl;


    user.avatarUrl =
      null;


    const saved =
      await this.userRepo.save(
        user,
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
        id,

      entityType:
        'User',

      entityId:
        id,

      action:
        AuditAction.UPDATE,

      oldValue: {
        fullName:
          saved.fullName,

        avatarUrl:
          previousUrl,
      },

      newValue: {
        fullName:
          saved.fullName,

        avatarUrl:
          null,
      },

      reason:
        'Avatar removed',
    });


    return this.findById(
      saved.id,
    );
  }
}
