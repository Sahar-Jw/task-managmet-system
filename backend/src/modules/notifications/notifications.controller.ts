import { Controller, Delete, Get, MessageEvent, Param, Patch, Query, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/utils/pagination.dto';

// Extends the shared pagination DTO with a real, decorated `unreadOnly`
// property. The global ValidationPipe runs with `forbidNonWhitelisted:
// true`, so any query param not explicitly declared on the DTO class gets
// the whole request rejected with a 400 — a plain TS intersection type
// (e.g. `PaginationQueryDto & { unreadOnly?: string }`) is invisible to it
// at runtime and was silently breaking every `?unreadOnly=true` request.
class FindNotificationsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean = false;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: UserEntity, @Query() query: FindNotificationsQueryDto) {
    return this.notificationsService.findForUser(user.id, query);
  }

  // GET /notifications/stream — Server-Sent Events. Push, not poll: fires a
  // `notification` event the instant one is dispatched to this User. Native
  // browser EventSource can't set an Authorization header, so the token is
  // additionally accepted as a `?token=` query param for this route (see
  // JwtStrategy) — the frontend passes the same access token it already
  // holds. Kept open with a `ping` heartbeat; the client reconnects (with a
  // fresh token) if the access token expires and the connection drops.
  @Sse('stream')
  stream(@CurrentUser() user: UserEntity): Observable<MessageEvent> {
    return this.notificationsService.stream(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: UserEntity) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.notificationsService.remove(id, user.id);
  }
}