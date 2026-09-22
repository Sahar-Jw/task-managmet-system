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
  async listAll(): Promise<TeamWithMembers[]> {
    const teams = await this.teamRepo.find({ order: { createdAt: 'DESC' } });

    if (teams.length === 0) {
      return [];
    }

    const teamIds = teams.map((team) => team.id);
    const leaderIds = teams.map((team) => team.leaderId);

    const [members, leaders] = await Promise.all([
      this.userRepo.find({
        where: { teamId: In(teamIds) },
        relations: ['role'],
        order: { fullName: 'ASC' },
      }),
      this.userRepo.find({ where: { id: In(leaderIds) } }),
    ]);

    const leaderById = new Map(leaders.map((leader) => [leader.id, leader]));

    return teams.map((team) => ({
      ...team,
      leaderName: leaderById.get(team.leaderId)?.fullName,
      leaderEmail: leaderById.get(team.leaderId)?.email,
      members: members.filter(
        (member) => member.teamId === team.id && member.id !== team.leaderId,
      ),
    }));
  }
}
