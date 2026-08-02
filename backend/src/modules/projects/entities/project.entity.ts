import { Column, Entity, Unique } from 'typeorm';
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
export class ProjectEntity extends VersionedEntity {
  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    enumName: 'project_status_enum',
    default: ProjectStatus.PLANNED,
  })
  status!: ProjectStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate?: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate?: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'archived_at', type: 'timestamptz', nullable: true })
  archivedAt?: Date;
}
