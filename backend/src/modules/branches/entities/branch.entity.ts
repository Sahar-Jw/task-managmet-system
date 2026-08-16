import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';

/**
 * Branch is a standalone lookup entity. Per project decision, Branch does
 * NOT declare any relation (ManyToOne/OneToMany) to any other entity.
 * Only the Task entity references Branch (via a plain `branchId` FK).
 */
@Entity('branches')
export class BranchEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById?: string;

  @Column({ name: 'archived_at', type: 'timestamp', nullable: true })
  archivedAt?: Date;
}
