import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { randomBytes } from 'crypto';

import { TeamEntity } from './entities/team.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RoleName } from '../../shared/enums/role.enum';
import { QueryTeamsDto } from './dto/query-teams.dto';
import { Paginated } from '../../common/utils/pagination.dto';

export type TeamWithMembers = TeamEntity & {
  leaderName?: string;
  leaderEmail?: string;
  members: UserEntity[];
};

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(TeamEntity)
    private readonly teamRepo: Repository<TeamEntity>,

    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  private generateInviteToken(): string {
    return randomBytes(24).toString('hex');
  }

  /*
   * ==========================================================
   * GET OR CREATE (lazy provisioning)
   * ==========================================================
   *
   * A Team Leader's Team row (and invite link) is created the first
   * time they touch anything Team-related, rather than at account
   * creation — this keeps Admin's "create a User" flow untouched.
   * Mutates and saves `leader.teamId` in place so the caller's
   * in-memory user object stays correct for the rest of the request.
   */
  async getOrCreateForLeader(leader: UserEntity): Promise<TeamEntity> {
    if (leader.role?.name !== RoleName.TEAM_LEADER) {
      throw new ForbiddenException(
        appError('ONLY_TEAM_LEADERS_HAVE_A_TEAM', 'Only Team Leaders have a Team'),
      );
    }

    let team = await this.teamRepo.findOne({ where: { leaderId: leader.id } });

    if (!team) {
      team = await this.teamRepo.save(
        this.teamRepo.create({
          name: `${leader.fullName}'s Team`,
          leaderId: leader.id,
          inviteToken: this.generateInviteToken(),
        }),
      );
    }

    if (leader.teamId !== team.id) {
      leader.teamId = team.id;
      await this.userRepo.save(leader);
    }

    return team;
  }

  async getMyTeam(leader: UserEntity): Promise<TeamWithMembers> {
    const team = await this.getOrCreateForLeader(leader);
    const members = await this.userRepo.find({
      where: { teamId: team.id },
      relations: ['role'],
      order: { fullName: 'ASC' },
    });

    return {
      ...team,
      leaderName: leader.fullName,
      leaderEmail: leader.email,
      members: members.filter((member) => member.id !== leader.id),
    };
  }

  async regenerateInviteLink(leader: UserEntity): Promise<TeamEntity> {
    const team = await this.getOrCreateForLeader(leader);
    team.inviteToken = this.generateInviteToken();
    return this.teamRepo.save(team);
  }

  async findByInviteToken(token: string): Promise<TeamEntity> {
    const team = await this.teamRepo.findOne({
      where: { inviteToken: token, isActive: true },
    });

    if (!team) {
      throw new NotFoundException(
        appError('INVITE_LINK_INVALID_OR_EXPIRED', 'This invite link is invalid or has expired'),
      );
    }

    return team;
  }

  // GET /teams/invite/:token (public) — lets the registration page show
  // "You're joining <leader>'s team" before the employee submits the form.
  async getInvitePreview(token: string): Promise<{ teamName: string; leaderName?: string }> {
    const team = await this.findByInviteToken(token);
    const leader = await this.userRepo.findOne({ where: { id: team.leaderId } });

    if (!leader) {
      throw new BadRequestException(
        appError('TEAM_LEADER_NO_LONGER_AVAILABLE', "This team's leader account is no longer available"),
      );
    }

    return { teamName: team.name, leaderName: leader.fullName };
  }

  // GET /teams (Admin only) — the "Groups" page: every Team, its leader,
  // and its members, all in one place.
  async listAll(query: QueryTeamsDto = {}): Promise<Paginated<TeamWithMembers>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const allTeams = await this.teamRepo.find({ order: { createdAt: 'DESC' } });

    if (allTeams.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const allTeamIds = allTeams.map((team) => team.id);
    const allLeaderIds = allTeams.map((team) => team.leaderId);
    const [allMembers, allLeaders] = await Promise.all([
      this.userRepo.find({
        where: { teamId: In(allTeamIds) },
        relations: ['role'],
        order: { fullName: 'ASC' },
      }),
      this.userRepo.find({ where: { id: In(allLeaderIds) } }),
    ]);

    const leaderById = new Map(allLeaders.map((leader) => [leader.id, leader]));
    const membersByTeam = new Map<string, UserEntity[]>();
    for (const member of allMembers) {
      const members = membersByTeam.get(member.teamId ?? '') ?? [];
      members.push(member);
      membersByTeam.set(member.teamId ?? '', members);
    }

    const search = query.search?.trim().toLowerCase();
    const filteredTeams = allTeams.filter((team) => {
      if (query.isActive !== undefined && team.isActive !== query.isActive) {
        return false;
      }

      const leader = leaderById.get(team.leaderId);
      if (search && !`${team.name} ${leader?.fullName ?? ''} ${leader?.email ?? ''}`.toLowerCase().includes(search)) {
        return false;
      }

      return true;
    });

    const total = filteredTeams.length;
    const teams = filteredTeams.slice((page - 1) * limit, page * limit);

    if (teams.length === 0) {
      return { items: [], total, page, limit };
    }

    return {
      items: teams.map((team) => ({
        ...team,
        leaderName: leaderById.get(team.leaderId)?.fullName,
        leaderEmail: leaderById.get(team.leaderId)?.email,
        members: (membersByTeam.get(team.id) ?? []).filter(
          (member) => member.teamId === team.id && member.id !== team.leaderId,
        ),
      })),
      total,
      page,
      limit,
    };
  }
}
