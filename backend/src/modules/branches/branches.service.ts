import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchEntity } from './entities/branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { UserEntity } from '../users/entities/user.entity';

type User = UserEntity;

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(BranchEntity)
    private readonly branchRepo: Repository<BranchEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Branch is a standalone lookup entity (no relation to Department/User/
  // Project); it is only ever referenced elsewhere (e.g. by Task) via its
  // plain id, so there is no cascading behavior to worry about here.
  findAll() {
    return this.branchRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<BranchEntity> {
    const branch = await this.branchRepo.findOne({ where: { id } });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(dto: CreateBranchDto, actor: User): Promise<BranchEntity> {
    const existingCode = await this.branchRepo.findOne({ where: { code: dto.code } });
    if (existingCode) throw new ConflictException('Branch code must be unique');

    const branch = await this.branchRepo.save(
      this.branchRepo.create({ ...dto, createdById: actor.id, isActive: true }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Branch',
      entityId: branch.id,
      action: AuditAction.CREATE,
      newValue: branch,
    });

    return branch;
  }

  async update(id: string, dto: UpdateBranchDto, actor: User): Promise<BranchEntity> {
    const branch = await this.findOne(id);
    const oldValue = { ...branch };

    Object.assign(branch, dto);
    const saved = await this.branchRepo.save(branch);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Branch',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: saved,
    });

    return saved;
  }

  async remove(id: string, actor: User): Promise<void> {
    const branch = await this.findOne(id);

    branch.isActive = false;
    branch.archivedAt = new Date();
    await this.branchRepo.save(branch);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Branch',
      entityId: branch.id,
      action: AuditAction.DELETE,
      oldValue: { isActive: true },
      newValue: { isActive: false, archivedAt: branch.archivedAt },
    });
  }
}
