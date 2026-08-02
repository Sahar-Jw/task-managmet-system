import { VersionColumn } from 'typeorm';
import { BaseEntity } from './base.entity';

export abstract class VersionedEntity extends BaseEntity {
  @VersionColumn({ default: 1 })
  version!: number;
}
