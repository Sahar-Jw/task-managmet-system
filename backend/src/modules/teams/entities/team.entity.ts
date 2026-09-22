import { Column, Entity, Index, Unique } from 'typeorm';
import { VersionedEntity } from '../../../shared/entities/versioned-base.entity';

/**
 * A Team is a Team Leader's group: the leader plus every employee who
 * registered through their invite link or was added by them directly.
 * Team does NOT declare a relation to UserEntity (same "no relations"
 * convention as ProjectEntity) — leader_id is a plain reference id, and
 * membership is looked up the other way, via UserEntity.teamId.
 *
 * One Team per leader (leader_id is unique); a User can belong to at
 * most one Team at a time (UserEntity.teamId).
 */
@Entity('teams')
@Unique(['leaderId'])
@Unique(['inviteToken'])
@Index(['leaderId'])
export class TeamEntity extends VersionedEntity {
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'leader_id', type: 'uuid' })
  leaderId!: string;

  // Random token embedded in the invite link the Team Leader shares.
  // Anyone who registers through it is linked to this Team automatically.
  @Column({ name: 'invite_token', type: 'varchar', length: 64 })
  inviteToken!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date | null;
}
