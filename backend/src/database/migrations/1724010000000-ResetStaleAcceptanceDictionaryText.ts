import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The accept/wait-for-acceptance flow was removed and the default UI text
 * was updated (ar.json / en.json), but Settings → Dictionary saves every
 * row into `dictionary_entries`, and those DB rows override the JSON
 * defaults at runtime. Databases that saved the dictionary before the
 * change therefore still show the old wording, e.g.
 * "تم إرسال التكليف وينتظر قبول المستخدم." after assigning a task.
 *
 * Remove only the rows that still hold the old accept-flow wording so the
 * corrected defaults apply again. Rows an admin has customised to
 * something else are left alone.
 */
const STALE_ROWS: Array<{ key: string; textEn: string; textAr: string }> = [
  {
    key: 'generatedUi.text0480',
    textEn: 'Assignment sent. Waiting for the user to accept.',
    textAr: 'تم إرسال التكليف وينتظر قبول المستخدم.',
  },
  {
    key: 'generatedUi.text0481',
    textEn: 'Task reassigned. Waiting for the new user to accept.',
    textAr: 'تم إعادة التكليف وينتظر قبول المستخدم الجديد.',
  },
  {
    key: 'generatedUi.text0488',
    textEn:
      'Assignment acceptance, rejection and reassignment are managed here.',
    textAr: 'قبول ورفض وإعادة تكليف المهمة يتم من هنا.',
  },
  {
    key: 'generatedUi.text0490',
    textEn: 'Waiting for response',
    textAr: 'بانتظار الرد',
  },
  {
    key: 'generatedUi.text0491',
    textEn: 'This task currently has no active assignee.',
    textAr: 'لا يوجد مستخدم مسؤول عن المهمة حالياً.',
  },
  {
    key: 'generatedUi.text0492',
    textEn: 'Accept it to begin work, or reject it with a reason.',
    textAr: 'اقبل المهمة لبدء العمل أو ارفضها مع توضيح السبب.',
  },
  {
    key: 'generatedUi.text0496',
    textEn: 'Waiting for assignee response',
    textAr: 'بانتظار رد المستخدم',
  },
  {
    key: 'generatedUi.text0497',
    textEn:
      'This assignment cannot be reassigned because the user has already accepted it.',
    textAr: 'لا يمكن إعادة تكليف المهمة بعد قبولها.',
  },
];

export class ResetStaleAcceptanceDictionaryText1724010000000
  implements MigrationInterface
{
  name = 'ResetStaleAcceptanceDictionaryText1724010000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const row of STALE_ROWS) {
      await queryRunner.query(
        'DELETE FROM dictionary_entries ' +
          'WHERE `key` = ? AND (text_en = ? OR text_ar = ?)',
        [row.key, row.textEn, row.textAr],
      );
    }
  }

  async down(): Promise<void> {
    // Nothing to restore: the removed rows only held outdated wording.
  }
}
