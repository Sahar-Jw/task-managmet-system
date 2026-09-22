import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { TeamsService } from './teams.service';
import { CreateTeamEmployeeDto } from './dto/team.dto';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RoleName } from '../../shared/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('teams')
@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  // GET /teams/my — the Team Leader's own group: team name, invite link,
  // and the employees currently in it. Creates the Team row on first use.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.TEAM_LEADER)
  @Get('my')
  async getMyTeam(@CurrentUser() user: UserEntity) {
    const team = await this.teamsService.getMyTeam(user);
    return {
      ...team,
      inviteLink: this.buildInviteLink(team.inviteToken),
    };
  }

  // POST /teams/my/invite-link/regenerate — invalidates the old link.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.TEAM_LEADER)
  @Post('my/invite-link/regenerate')
  async regenerateInviteLink(@CurrentUser() user: UserEntity) {
    const team = await this.teamsService.regenerateInviteLink(user);
    return { inviteToken: team.inviteToken, inviteLink: this.buildInviteLink(team.inviteToken) };
  }

  // POST /teams/my/employees — Team Leader adds an employee directly,
  // as an alternative to sharing the invite link.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.TEAM_LEADER)
  @Post('my/employees')
  async addEmployee(@Body() dto: CreateTeamEmployeeDto, @CurrentUser() user: UserEntity) {
    await this.teamsService.getOrCreateForLeader(user);
    return this.usersService.createTeamEmployee(dto, user);
  }

  // GET /teams — Admin only: the "Groups" page, every Team Leader's group
  // in one place.
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  listAll() {
    return this.teamsService.listAll();
  }

  // GET /teams/invite/:token — public: lets the registration page show
  // which team/leader the person is about to join before they sign up.
  @Public()
  @Get('invite/:token')
  getInvitePreview(@Param('token') token: string) {
    return this.teamsService.getInvitePreview(token);
  }

  private buildInviteLink(inviteToken: string): string {
    const frontendUrl = this.configService.get<string>('frontendUrl') || 'http://localhost:3001';
    return `${frontendUrl.replace(/\/+$/, '')}/register?inviteToken=${inviteToken}`;
  }
}
