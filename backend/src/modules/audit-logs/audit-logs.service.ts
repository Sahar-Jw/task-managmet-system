import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectRepository,
} from '@nestjs/typeorm';

import {
  Repository,
} from 'typeorm';

import {
  AuditLogEntity,
} from './entities/audit-log.entity';

import {
  AuditAction,
} from '../../shared/enums/audit-action.enum';


/*
 * ============================================================
 * TYPES
 * ============================================================
 */

export interface RecordAuditParams {
  actorId?:
    | string
    | null;

  entityType:
    string;

  entityId:
    string;

  action:
    AuditAction;

  oldValue?:
    | Record<
        string,
        any
      >
    | null;

  newValue?:
    | Record<
        string,
        any
      >
    | null;

  reason?:
    | string
    | null;

  ipAddress?:
    | string
    | null;
}


export interface AuditLogSearchParams {
  actorId?:
    string;

  entityType?:
    string;

  entityId?:
    string;

  action?:
    AuditAction;

  search?:
    string;

  dateFrom?:
    string;

  dateTo?:
    string;

  sortDir?:
    string;

  page?:
    number;

  limit?:
    number;
}


/*
 * ============================================================
 * SENSITIVE FIELDS
 * ============================================================
 *
 * Audit logs are permanent.
 *
 * Because of that, passwords/tokens/secrets should NEVER be
 * written into them even if another Service accidentally passes
 * the full object.
 * ============================================================
 */

const SENSITIVE_KEYS =
  new Set([
    'password',
    'passwordhash',
    'password_hash',

    'token',
    'accesstoken',
    'access_token',

    'refreshtoken',
    'refresh_token',

    'resettoken',
    'reset_token',

    'authorization',
    'cookie',

    'secret',
    'clientsecret',
    'client_secret',

    'apikey',
    'api_key',
  ]);


/*
 * ============================================================
 * SERVICE
 * ============================================================
 */

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(
      AuditLogEntity,
    )
    private readonly auditLogRepo:
      Repository<AuditLogEntity>,
  ) {}


  /*
   * ==========================================================
   * SANITIZE AUDIT VALUE
   * ==========================================================
   */

  private sanitizeValue(
    value: unknown,
    depth = 0,
  ): unknown {
    /*
     * Prevent excessively deep objects from producing huge
     * audit records or recursive structures.
     */
    if (
      depth >
      8
    ) {
      return '[Maximum depth reached]';
    }


    /*
     * Null / undefined.
     */
    if (
      value ===
        null ||
      value ===
        undefined
    ) {
      return value;
    }


    /*
     * Date.
     */
    if (
      value instanceof
      Date
    ) {
      return value.toISOString();
    }


    /*
     * Primitive.
     */
    if (
      typeof value !==
      'object'
    ) {
      return value;
    }


    /*
     * Arrays.
     *
     * Keep the audit record controlled if somebody accidentally
     * gives us a very large relation array.
     */
    if (
      Array.isArray(
        value,
      )
    ) {
      return value
        .slice(
          0,
          100,
        )
        .map(
          (
            item,
          ) =>
            this.sanitizeValue(
              item,
              depth + 1,
            ),
        );
    }


    /*
     * Object.
     */
    const result:
      Record<
        string,
        unknown
      > = {};


    for (
      const [
        key,
        childValue,
      ] of Object.entries(
        value as Record<
          string,
          unknown
        >,
      )
    ) {
      const normalizedKey =
        key
          .replace(
            /[-_\s]/g,
            '',
          )
          .toLowerCase();


      /*
       * Never persist sensitive data.
       */
      if (
        SENSITIVE_KEYS.has(
          normalizedKey,
        )
      ) {
        continue;
      }


      result[
        key
      ] =
        this.sanitizeValue(
          childValue,
          depth + 1,
        );
    }


    return result;
  }


  private sanitizeRecord(
    value?:
      | Record<
          string,
          any
        >
      | null,
  ):
    | Record<
        string,
        any
      >
    | undefined {
    if (
      !value
    ) {
      return undefined;
    }


    return this.sanitizeValue(
      value,
    ) as Record<
      string,
      any
    >;
  }


  /*
   * ==========================================================
   * RECORD
   * ==========================================================
   *
   * This remains the ONLY write path to audit_logs.
   *
   * There is deliberately no update or delete method.
   * ==========================================================
   */

  async record(
    params:
      RecordAuditParams,
  ): Promise<AuditLogEntity> {
    const entityType =
      params.entityType.trim();


    if (
      !entityType
    ) {
      throw new BadRequestException(
        'Audit entity type is required',
      );
    }


    const reason =
      params.reason
        ?.trim() ||
      undefined;


    const entry =
      this.auditLogRepo.create({
        actorId:
          params.actorId ||
          undefined,

        entityType,

        entityId:
          params.entityId,

        action:
          params.action,

        oldValue:
          this.sanitizeRecord(
            params.oldValue,
          ),

        newValue:
          this.sanitizeRecord(
            params.newValue,
          ),

        reason,

        ipAddress:
          params.ipAddress ||
          undefined,
      });


    return this.auditLogRepo.save(
      entry,
    );
  }


  /*
   * ==========================================================
   * SEARCH
   * ==========================================================
   */

  async search(
    params:
      AuditLogSearchParams,
  ) {
    const page =
      params.page &&
      params.page >
        0
        ? params.page
        : 1;


    const limit =
      params.limit &&
      params.limit >
        0 &&
      params.limit <=
        100
        ? params.limit
        : 20;


    /*
     * ========================================================
     * VALIDATE DATE RANGE
     * ========================================================
     */

    if (
      params.dateFrom &&
      params.dateTo &&
      params.dateFrom >
        params.dateTo
    ) {
      throw new BadRequestException(
        'Date "to" cannot be before date "from"',
      );
    }


    /*
     * ========================================================
     * QUERY
     * ========================================================
     */

    const qb =
      this.auditLogRepo
        .createQueryBuilder(
          'log',
        )
        .leftJoinAndSelect(
          'log.actor',
          'actor',
        );


    /*
     * ========================================================
     * ACTOR
     * ========================================================
     */

    if (
      params.actorId
    ) {
      qb.andWhere(
        'log.actorId = :actorId',
        {
          actorId:
            params.actorId,
        },
      );
    }


    /*
     * ========================================================
     * ENTITY
     * ========================================================
     */

    if (
      params.entityType
    ) {
      qb.andWhere(
        'log.entityType = :entityType',
        {
          entityType:
            params.entityType,
        },
      );
    }


    if (
      params.entityId
    ) {
      qb.andWhere(
        'log.entityId = :entityId',
        {
          entityId:
            params.entityId,
        },
      );
    }


    /*
     * ========================================================
     * ACTION
     * ========================================================
     */

    if (
      params.action
    ) {
      qb.andWhere(
        'log.action = :action',
        {
          action:
            params.action,
        },
      );
    }


    /*
     * ========================================================
     * GENERAL SEARCH
     * ========================================================
     */

    if (
      params.search
        ?.trim()
    ) {
      const search =
        `%${params.search.trim()}%`;


      qb.andWhere(
        `(
          log.entityType ILIKE :search

          OR CAST(
            log.entityId
            AS TEXT
          ) ILIKE :search

          OR log.reason ILIKE :search

          OR actor.fullName ILIKE :search

          OR actor.email ILIKE :search

          OR log.ipAddress ILIKE :search
        )`,
        {
          search,
        },
      );
    }


    /*
     * ========================================================
     * DATE FROM
     * ========================================================
     */

    if (
      params.dateFrom
    ) {
      /*
       * The frontend sends YYYY-MM-DD.
       *
       * Start at the beginning of that day.
       */
      qb.andWhere(
        'log.createdAt >= :dateFrom::date',
        {
          dateFrom:
            params.dateFrom,
        },
      );
    }


    /*
     * ========================================================
     * DATE TO
     * ========================================================
     *
     * IMPORTANT:
     *
     * Using:
     *
     * createdAt <= '2026-08-16'
     *
     * means midnight and would exclude almost the whole day.
     *
     * We instead use:
     *
     * createdAt < 2026-08-17
     * ========================================================
     */

    if (
      params.dateTo
    ) {
      qb.andWhere(
        `log.createdAt < (
          :dateTo::date +
          INTERVAL '1 day'
        )`,
        {
          dateTo:
            params.dateTo,
        },
      );
    }


    /*
     * ========================================================
     * SORT
     * ========================================================
     */

    qb.orderBy(
      'log.createdAt',
      params.sortDir ===
        'asc'
        ? 'ASC'
        : 'DESC',
    );


    /*
     * Stable secondary order.
     */
    qb.addOrderBy(
      'log.id',
      params.sortDir ===
        'asc'
        ? 'ASC'
        : 'DESC',
    );


    /*
     * ========================================================
     * PAGINATION
     * ========================================================
     */

    qb
      .skip(
        (
          page -
          1
        ) *
          limit,
      )
      .take(
        limit,
      );


    const [
      items,
      total,
    ] =
      await qb.getManyAndCount();


    return {
      items,
      total,
      page,
      limit,
    };
  }


  /*
   * ==========================================================
   * META
   * ==========================================================
   *
   * Allows the frontend to discover Entity Types instead of
   * hardcoding Task / User / Project / etc.
   * ==========================================================
   */

  async getMeta() {
    const entityRows =
      await this.auditLogRepo
        .createQueryBuilder(
          'log',
        )
        .select(
          'DISTINCT log.entityType',
          'entityType',
        )
        .orderBy(
          'log.entityType',
          'ASC',
        )
        .getRawMany<{
          entityType:
            string;
        }>();


    return {
      entityTypes:
        entityRows
          .map(
            (
              row,
            ) =>
              row.entityType,
          )
          .filter(
            Boolean,
          ),

      actions:
        Object.values(
          AuditAction,
        ),
    };
  }


  /*
   * ==========================================================
   * GET ONE
   * ==========================================================
   */

  async findOne(
    id: string,
  ) {
    const log =
      await this.auditLogRepo.findOne({
        where: {
          id,
        },

        relations: [
          'actor',
        ],
      });


    if (
      !log
    ) {
      throw new NotFoundException(
        'Audit log entry not found',
      );
    }


    return log;
  }
}