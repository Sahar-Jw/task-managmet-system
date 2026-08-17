import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { appError } from '../../common/errors/app-error';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './entities/department.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepo: Repository<DepartmentEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Department is a standalone lookup entity (no relation to Branch/User);
  // it is only ever referenced elsewhere (e.g. by Task) via its plain id.
  findAll() {
    return this.departmentRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<DepartmentEntity> {
    const department = await this.departmentRepo.findOne({ where: { id } });
    if (!department) throw new NotFoundException(appError('DEPARTMENT_NOT_FOUND', 'Department not found'));
    return department;
  }

  async create(dto: CreateDepartmentDto, actor: UserEntity): Promise<DepartmentEntity> {
    const existing = await this.departmentRepo.findOne({ where: { code: dto.code } });
    if (existing) throw new ConflictException(appError('DEPARTMENT_CODE_MUST_UNIQUE', 'Department code must be unique'));

    const department = await this.departmentRepo.save(
      this.departmentRepo.create({ ...dto, createdById: actor.id, isActive: true }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Department',
      entityId: department.id,
      action: AuditAction.CREATE,
      newValue: department,
    });

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto, actor: UserEntity): Promise<DepartmentEntity> {
    const department = await this.findOne(id);
    const oldValue = { ...department };
    Object.assign(department, dto);
    const saved = await this.departmentRepo.save(department);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Department',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: saved,
    });

    return saved;
  }

  async remove(id: string, actor: UserEntity): Promise<void> {
    const department = await this.findOne(id);

    department.isActive = false;
    department.archivedAt = new Date();
    await this.departmentRepo.save(department);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Department',
      entityId: department.id,
      action: AuditAction.DELETE,
      newValue: { isActive: false, archivedAt: department.archivedAt },
    });
  }
}
