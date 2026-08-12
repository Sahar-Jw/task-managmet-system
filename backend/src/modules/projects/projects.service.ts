import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from './entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { CreateProjectDto, QueryProjectsDto, UpdateProjectDto } from './dto/project.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserEntity } from '../users/entities/user.entity';
import { ProjectStatus } from '../../shared/enums/project-status.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { TaskStatus } from '../../shared/enums/task-status.enum';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: QueryProjectsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const [items, total] = await this.projectRepo.findAndCount({
      where: {
        ...(query.status ? { status: query.status } : {}),
      },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<ProjectEntity> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  // Project is a standalone lookup entity (no relation to Branch); name
  // must be unique organization-wide.
  async create(dto: CreateProjectDto, actor: UserEntity): Promise<ProjectEntity> {
    const existing = await this.projectRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('Project name must be unique');

    const project = await this.projectRepo.save(
      this.projectRepo.create({
        ...dto,
        createdById: actor.id,
        status: ProjectStatus.PLANNED,
      }),
    );

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Project',
      entityId: project.id,
      action: AuditAction.CREATE,
      newValue: project,
    });

    return project;
  }

  async update(id: string, dto: UpdateProjectDto, actor: UserEntity): Promise<ProjectEntity> {
    const project = await this.findOne(id);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Cannot edit an archived Project');
    }
    const oldValue = { ...project };
    Object.assign(project, dto);
    const saved = await this.projectRepo.save(project);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Project',
      entityId: saved.id,
      action: AuditAction.UPDATE,
      oldValue,
      newValue: saved,
    });

    return saved;
  }

  async archive(id: string, actor: UserEntity): Promise<ProjectEntity> {
    const project = await this.findOne(id);
    const oldValue = { ...project };

    project.status = ProjectStatus.ARCHIVED;
    project.archivedAt = new Date();
    const saved = await this.projectRepo.save(project);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Project',
      entityId: saved.id,
      action: AuditAction.ARCHIVE,
      oldValue,
      newValue: saved,
    });

    return saved;
  }

  // Restores an Archived Project. Project doesn't track its pre-archive
  // status (unlike Task), because it's derivable: recomputeStatus() sets
  // Active/Completed from the Project's current Tasks. We land on Planned
  // as a starting point (used as-is when the Project has no relevant
  // Tasks yet), then let recomputeStatus() upgrade it if Tasks exist.
  async unarchive(id: string, actor: UserEntity): Promise<ProjectEntity> {
    const project = await this.findOne(id);
    if (project.status !== ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Only an Archived Project can be unarchived');
    }

    const oldValue = { status: project.status, archivedAt: project.archivedAt };
    project.status = ProjectStatus.PLANNED;
    project.archivedAt = undefined;
    const saved = await this.projectRepo.save(project);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Project',
      entityId: saved.id,
      action: AuditAction.RESTORE,
      oldValue,
      newValue: { status: saved.status },
    });

    await this.recomputeStatus(saved.id);
    return this.findOne(saved.id);
  }

  /**
   * A Project's status automatically becomes Completed only when ALL of its
   * non-finished Tasks are Completed; system-derived, never directly
   * editable via the API. Called by TasksService whenever a Task's status
   * changes.
   */
  async recomputeStatus(projectId: string): Promise<void> {
    const project = await this.projectRepo.findOne({ where: { id: projectId } });
    if (!project || project.status === ProjectStatus.ARCHIVED) return;

    const tasks = await this.taskRepo.find({ where: { projectId } });
    const relevantTasks = tasks.filter((t) => t.status !== TaskStatus.FINISHED);

    if (relevantTasks.length === 0) return;

    const allCompleted = relevantTasks.every((t) => t.status === TaskStatus.COMPLETED);
    const newStatus = allCompleted ? ProjectStatus.COMPLETED : ProjectStatus.ACTIVE;

    if (project.status !== newStatus) {
      const oldValue = { status: project.status };
      project.status = newStatus;
      await this.projectRepo.save(project);
      await this.auditLogsService.record({
        actorId: null,
        entityType: 'Project',
        entityId: project.id,
        action: AuditAction.STATUS_CHANGE,
        oldValue,
        newValue: { status: newStatus },
        reason: 'System-derived from Task completion state',
      });
    }
  }
}
