import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from './entities/role.entity';
import { RoleName } from '../../shared/enums/role.enum';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
  ) {}

  /** Ensures the two launch roles (ADMIN, USER) always exist. */
  async onModuleInit() {
    await this.ensureRole(RoleName.ADMIN, 'Full administrative privileges');
    await this.ensureRole(RoleName.USER, 'Standard authenticated user');
  }

  private async ensureRole(name: RoleName, description: string) {
    const existing = await this.roleRepo.findOne({ where: { name } });
    if (!existing) {
      await this.roleRepo.save(this.roleRepo.create({ name, description, permissions: {} }));
    }
  }

  findAll(): Promise<RoleEntity[]> {
    return this.roleRepo.find();
  }

  findByName(name: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOne({ where: { name } });
  }

  findById(id: string): Promise<RoleEntity | null> {
    return this.roleRepo.findOne({ where: { id } });
  }
}
