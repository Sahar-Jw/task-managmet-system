import { Column, Entity, OneToMany } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { BaseEntity } from '../../../shared/entities/base.entity';

@Entity('roles')
export class RoleEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string; // e.g. ADMIN, USER

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

 @Column({
  type:
    'json',

  nullable:
    false,
})
permissions!:
  Record<
    string,
    boolean
  >;

  @OneToMany(() => UserEntity, (user) => user.role)
  users!: UserEntity[];
}
