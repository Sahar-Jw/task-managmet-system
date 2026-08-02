import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditAction } from '../../shared/enums/audit-action.enum';

export interface RecordAuditParams {
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason?: string | null;
  ipAddress?: string | null;
}

export interface AuditLogSearchParams {
  actorId?: string;
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepo: Repository<AuditLogEntity>,
  ) {}

  /**
   * The ONLY write path into audit_logs across the entire application.
   * There is intentionally no update()/delete() method (BR-076, NFR-AUD-02):
   * audit records are immutable and append-only.
   */
  async record(params: RecordAuditParams): Promise<AuditLogEntity> {
    const entry = this.auditLogRepo.create({
      actorId: params.actorId ?? undefined,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValue: params.oldValue ?? undefined,
      newValue: params.newValue ?? undefined,
      reason: params.reason ?? undefined,
      ipAddress: params.ipAddress ?? undefined,
    });
    return this.auditLogRepo.save(entry);
  }

  /** NFR-AUD-03: Admins can search/filter by actor, entity, date range, action type. */
  async search(params: AuditLogSearchParams) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 && params.limit <= 100 ? params.limit : 20;

    const qb = this.auditLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (params.actorId) qb.andWhere('log.actorId = :actorId', { actorId: params.actorId });
    if (params.entityType) qb.andWhere('log.entityType = :entityType', { entityType: params.entityType });
    if (params.entityId) qb.andWhere('log.entityId = :entityId', { entityId: params.entityId });
    if (params.action) qb.andWhere('log.action = :action', { action: params.action });
    if (params.dateFrom && params.dateTo) {
      qb.andWhere('log.createdAt BETWEEN :from AND :to', {
        from: params.dateFrom,
        to: params.dateTo,
      });
    } else if (params.dateFrom) {
      qb.andWhere('log.createdAt >= :from', { from: params.dateFrom });
    } else if (params.dateTo) {
      qb.andWhere('log.createdAt <= :to', { to: params.dateTo });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  findOne(id: string) {
    return this.auditLogRepo.findOne({ where: { id }, relations: ['actor'] });
  }
}
