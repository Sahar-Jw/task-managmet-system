import {
  Controller,
  Delete,
  Get,
  MessageEvent,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import {
  Transform,
} from 'class-transformer';

import {
  IsBoolean,
  IsOptional,
} from 'class-validator';

import {
  Observable,
} from 'rxjs';

import {
  NotificationsService,
} from './notifications.service';

import {
  UserEntity,
} from '../users/entities/user.entity';

import {
  JwtAuthGuard,
} from '../../common/guards/jwt-auth.guard';

import {
  CurrentUser,
} from '../../common/decorators/current-user.decorator';

import {
  PaginationQueryDto,
} from '../../common/utils/pagination.dto';

import {
  SkipTransform,
} from '../../common/decorators/skip-transform.decorator';


/*
 * ============================================================
 * QUERY DTO
 * ============================================================
 */

class FindNotificationsQueryDto
  extends PaginationQueryDto {
  @IsOptional()
  @Transform(
    ({
      value,
    }) =>
      value ===
        'true' ||
      value ===
        true,
  )
  @IsBoolean()
  unreadOnly?:
    boolean = false;
}


/*
 * ============================================================
 * CONTROLLER
 * ============================================================
 */

@ApiTags(
  'notifications',
)
@ApiBearerAuth()
@UseGuards(
  JwtAuthGuard,
)
@Controller(
  'notifications',
)
export class NotificationsController {
  constructor(
    private readonly notificationsService:
      NotificationsService,
  ) {}


  /*
   * ==========================================================
   * LIST
   * ==========================================================
   */

  @Get()
  findAll(
    @CurrentUser()
    user:
      UserEntity,

    @Query()
    query:
      FindNotificationsQueryDto,
  ) {
    return this.notificationsService.findForUser(
      user.id,
      query,
    );
  }


  /*
   * ==========================================================
   * UNREAD COUNT
   * ==========================================================
   *
   * This is cheaper than requesting a paginated unread list
   * only to obtain its total.
   * ==========================================================
   */

  @Get(
    'unread-count',
  )
  unreadCount(
    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.notificationsService.getUnreadCount(
      user.id,
    );
  }


  /*
   * ==========================================================
   * REAL-TIME STREAM
   * ==========================================================
   */

  @Sse(
    'stream',
  )
  @SkipTransform()
  stream(
    @CurrentUser()
    user:
      UserEntity,
  ): Observable<MessageEvent> {
    return this.notificationsService.stream(
      user.id,
    );
  }


  /*
   * ==========================================================
   * MARK ALL READ
   * ==========================================================
   *
   * IMPORTANT:
   *
   * Keep static routes ABOVE :id routes.
   * ==========================================================
   */

  @Patch(
    'read-all',
  )
  markAllRead(
    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.notificationsService.markAllRead(
      user.id,
    );
  }


  /*
   * ==========================================================
   * CLEAR READ
   * ==========================================================
   */

  @Delete(
    'read',
  )
  clearRead(
    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.notificationsService.clearRead(
      user.id,
    );
  }


  /*
   * ==========================================================
   * MARK ONE READ
   * ==========================================================
   */

  @Patch(
    ':id/read',
  )
  markRead(
    @Param(
      'id',
      ParseUUIDPipe,
    )
    id:
      string,

    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.notificationsService.markRead(
      id,
      user.id,
    );
  }


  /*
   * ==========================================================
   * DELETE ONE
   * ==========================================================
   */

  @Delete(
    ':id',
  )
  remove(
    @Param(
      'id',
      ParseUUIDPipe,
    )
    id:
      string,

    @CurrentUser()
    user:
      UserEntity,
  ) {
    return this.notificationsService.remove(
      id,
      user.id,
    );
  }
}