import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * home.assignApprove used to read "Assign, accept, approve". Assignments are
 * accepted by default now, so the default wording was shortened. Remove only
 * the dictionary row if it still holds the old wording so the new default
 * applies; customised rows are left alone.
 */
export class ResetHomeAssignApproveDictionaryText1724013000000
  implements MigrationInterface
{
  name = 'ResetHomeAssignApproveDictionaryText1724013000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DELETE FROM dictionary_entries ' +
        'WHERE `key` = ? AND (text_en = ? OR text_ar = ?)',
      ['home.assignApprove', 'Assign, accept, approve', 'تعيين، قبول، اعتماد'],
    );
  }

  async down(): Promise<void> {
    // Nothing to restore: the removed row only held outdated wording.
  }
}
