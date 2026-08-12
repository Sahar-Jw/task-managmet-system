import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import {
  AdminUpdateUserDto,
  ChangeOwnPasswordDto,
  CreateUserDto,
  UpdateOwnProfileDto,
} from './dto/user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserEntity } from './entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../shared/enums/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me — must be declared before /:id to avoid route collision
  @Get('me')
  getOwnProfile(@CurrentUser() user: UserEntity) {
    return this.usersService.findById(user.id);
  }

  @Patch('me')
  updateOwnProfile(@CurrentUser() user: UserEntity, @Body() dto: UpdateOwnProfileDto) {
    return this.usersService.updateOwnProfile(user.id, dto);
  }

  @Patch('me/password')
  changeOwnPassword(@CurrentUser() user: UserEntity, @Body() dto: ChangeOwnPasswordDto) {
    return this.usersService.changeOwnPassword(user.id, dto);
  }

  // POST /users/me/avatar
  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadOwnAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: UserEntity,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  // DELETE /users/me/avatar
  @Delete('me/avatar')
  removeOwnAvatar(@CurrentUser() user: UserEntity) {
    return this.usersService.removeAvatar(user.id);
  }

  // GET /users — Admin only 
  @Get()
  // @Roles(RoleName.ADMIN)
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  // GET /users/:id — Admin,
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    if (user.role.name !== RoleName.ADMIN && user.id !== id) {
      return this.usersService.findById(user.id); 
    }
    return this.usersService.findById(id);
  }

  // POST /users 
  // @Post()
  // @Roles(RoleName.ADMIN)
  // create(@Body() dto: CreateUserDto, @CurrentUser() user: UserEntity) {
  //   return this.usersService.create(dto, user);
  // }

  // PATCH /users/:id 
  @Patch(':id')
  @Roles(RoleName.ADMIN)
  adminUpdate(@Param('id') id: string, @Body() dto: AdminUpdateUserDto, @CurrentUser() user: UserEntity) {
    return this.usersService.adminUpdate(id, dto, user);
  }

  // DELETE /users/:id 
  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.usersService.deactivate(id, user);
  }

  // PATCH /users/:id/unlock
  @Patch(':id/unlock')
  @Roles(RoleName.ADMIN)
  unlock(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.usersService.unlock(id, user);
  }

  // DELETE /users/:id/permanent — hard delete, Admin only
  @Delete(':id/permanent')
  @Roles(RoleName.ADMIN)
  hardDelete(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    return this.usersService.hardDelete(id, user);
  }
}
