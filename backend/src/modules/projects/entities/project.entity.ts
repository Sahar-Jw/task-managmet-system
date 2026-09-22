import { Column, Entity, Index, Unique } from 'typeorm';
import { VersionedEntity } from '../../../shared/entities/versioned-base.entity';
import { ProjectStatus } from '../../../shared/enums/project-status.enum';

/**
 * Project is a standalone lookup entity. Per project decision, Project does
 * NOT declare any relation (ManyToOne/OneToMany) to any other entity (not
 * even Branch). Only the Task entity references Project (via a plain
 * `projectId` FK).
 */
@Entity('projects')
@Unique(['name'])
@Index(['teamId'])
export class ProjectEntity extends VersionedEntity {
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Plain varchar storing the `key` of a Settings row (type=PROJECT_STATUS)
  // — see Settings > "Statuses & Types". Same rationale as Task's
  // status/taskType/priority columns.
  @Column({ type: 'varchar', length: 50, default: ProjectStatus.PLANNED })
  status!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  // Which Team this Project belongs to (see TeamEntity), set from the
  // creator's team_id at creation time. Null means it's an Admin-created
  // (organization-wide) Project, visible to everyone, same as before
  // Teams existed. Plain reference id, no relation — same rationale as
  // the rest of this entity.
  @Column({ name: 'team_id', type: 'uuid', nullable: true })
  teamId?: string | null;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date | null;
}
