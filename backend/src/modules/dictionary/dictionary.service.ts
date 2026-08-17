import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { appError } from '../../common/errors/app-error';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { DictionaryEntryEntity } from './entities/dictionary-entry.entity';
import { DictionaryItemDto } from './dto/update-dictionary.dto';

@Injectable()
export class DictionaryService {
  constructor(
    @InjectRepository(DictionaryEntryEntity)
    private readonly repository: Repository<DictionaryEntryEntity>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll() {
    return this.repository.find({ order: { key: 'ASC' } });
  }

  async replaceAll(entries: DictionaryItemDto[], actorId: string) {
    const unique = new Map<string, DictionaryItemDto>();

    for (const entry of entries) {
      const key = entry.key.trim();
      const textEn = entry.textEn.trim();
      const textAr = entry.textAr.trim();

      if (!key || !textEn || !textAr) {
        throw new BadRequestException(
          appError(
            'DICTIONARY_BOTH_LANGUAGES_REQUIRED',
            'Every dictionary entry requires English and Arabic text',
          ),
        );
      }

      unique.set(key, { key, textEn, textAr });
    }

    const rows = [...unique.values()].map((entry) =>
      this.repository.create(entry),
    );

    await this.repository.manager.transaction(async (manager) => {
      if (rows.length > 0) {
        await manager.getRepository(DictionaryEntryEntity).upsert(rows, ['key']);
      }

      const savedKeys = [...unique.keys()];
      if (savedKeys.length === 0) {
        await manager.getRepository(DictionaryEntryEntity).clear();
      } else {
        await manager
          .createQueryBuilder()
          .delete()
          .from(DictionaryEntryEntity)
          .where('`key` NOT IN (:...savedKeys)', { savedKeys })
          .execute();
      }
    });

    await this.auditLogsService.record({
      actorId,
      entityType: 'Dictionary',
      entityId: '00000000-0000-0000-0000-000000000000',
      action: AuditAction.UPDATE,
      newValue: { entryCount: rows.length },
      reason: 'Updated bilingual application dictionary',
    });

    return this.findAll();
  }
}
