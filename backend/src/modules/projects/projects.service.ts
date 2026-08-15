import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Not } from 'typeorm';
import { ProjectEntity } from './entities/project.entity';
import { TaskEntity } from '../tasks/entities/task.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateProjectDto, QueryProjectsDto, UpdateProjectDto } from './dto/project.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectStatus } from '../../shared/enums/project-status.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { TaskStatus } from '../../shared/enums/task-status.enum';
import { RoleName } from '../../shared/enums/role.enum';

// A Project row plus the owner's display name. Project intentionally has
// no TypeORM relation to User (see the entity's comment), so the owner's
// name is resolved with a separate batched lookup and merged in here
// rather than via a join/relation.
export type ProjectWithOwner = ProjectEntity & { ownerName?: string };

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly projectRepo: Repository<ProjectEntity>,
    @InjectRepository(TaskEntity)
    private readonly taskRepo: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // Admin sees every Project by default, or only their own when `mine` is
  // passed (the "My projects" tab). A regular User only ever sees Projects
  // they created themselves, regardless of `mine`.
  async findAll(query: QueryProjectsDto, actor: UserEntity) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const isAdmin = actor.role?.name === RoleName.ADMIN;
    const scopeToSelf = !isAdmin || query.mine === 'true';

    const [items, total] = await this.projectRepo.findAndCount({
      where: {
        ...(query.status ? { status: query.status } : query.excludeArchived === 'true' ? { status: Not(ProjectStatus.ARCHIVED) } : {}),
        ...(scopeToSelf ? { createdById: actor.id } : {}),
      },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: await this.attachOwners(items), total, page, limit };
  }

  /**
   * `actor` is optional so this can still be used for internal, trusted
   * lookups (e.g. by other services) without an ownership check. When an
   * actor is passed in, a non-Admin who doesn't own the Project is
   * forbidden from seeing it — mirrors the findAll() scoping above.
   */
  async findOne(id: string, actor?: UserEntity): Promise<ProjectWithOwner> {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');

    if (actor && actor.role?.name !== RoleName.ADMIN && project.createdById !== actor.id) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const [withOwner] = await this.attachOwners([project]);
    return withOwner;
  }

  // Batches a single lookup for every distinct createdById in the list and
  // merges the owner's fullName in as `ownerName`, instead of a per-row
  // relation/join (Project deliberately has none — see entity comment).
  private async attachOwners(projects: ProjectEntity[]): Promise<ProjectWithOwner[]> {
    const ownerIds = [...new Set(projects.map((p) => p.createdById).filter((v): v is string => !!v))];
    if (ownerIds.length === 0) return projects;

    const owners = await this.userRepo.find({ where: { id: In(ownerIds) } });
    const ownerNameById = new Map(owners.map((u) => [u.id, u.fullName]));

    return projects.map((p) => ({
      ...p,
      ownerName: p.createdById ? ownerNameById.get(p.createdById) : undefined,
    }));
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
    // Ownership/visibility check: Admin can edit any Project, a User only
    // their own.
    const project = await this.findOne(id, actor);
    if (project.status === ProjectStatus.ARCHIVED) {
      throw new BadRequestException('Cannot edit an archived Project');
    }

    if (dto.name && dto.name !== project.name) {
      const existing = await this.projectRepo.findOne({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Project name must be unique');
      }
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

  /**
   * Hard-deletes a Project. Admin can delete any Project, a User only one
   * they created themselves. A Project that still has Tasks on it can't be
   * deleted outright (BR-024 style: archive is the intended path once a
   * Project has real work attached to it) — the caller has to remove/move
   * those Tasks first, or archive the Project instead of deleting it.
   */
  async remove(id: string, actor: UserEntity): Promise<void> {
    // Ownership/visibility check: Admin can delete any Project, a User
    // only their own.
    const project = await this.findOne(id, actor);

    const taskCount = await this.taskRepo.count({ where: { projectId: id } });
    if (taskCount > 0) {
      throw new BadRequestException(
        `Cannot delete this Project: it still has ${taskCount} task(s) attached to it. ` +
          'Remove or reassign those Tasks first, or archive the Project instead.',
      );
    }

    await this.projectRepo.remove(project);

    await this.auditLogsService.record({
      actorId: actor.id,
      entityType: 'Project',
      entityId: id,
      action: AuditAction.DELETE,
      oldValue: project,
    });
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
