import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Assignments are now accepted by default, so the landing page no longer
 * talks about accepting / rejecting / pending approval.
 *
 * The default wording was updated in en.json / ar.json, but rows saved from
 * Settings -> Dictionary override those defaults at runtime. Remove only the
 * rows that still hold the old wording so the new defaults apply. Rows an
 * admin customised to something else are left alone.
 */
const STALE_ROWS: Array<{ key: string; textEn: string; textAr: string }> = [
  { key: 'generatedUi.text0048', textEn: 'Assignment acceptance', textAr: 'قبول ورفض التكليف' },
  { key: 'generatedUi.text0056', textEn: 'Assignment accepted', textAr: 'تم قبول التكليف' },
  { key: 'generatedUi.text0330', textEn: 'Assignments can be accepted, rejected with a reason, and reassigned through a controlled workflow.', textAr: 'التكليف يحتاج قبولاً، ويمكن رفضه مع السبب، ثم إعادة التكليف حسب قواعد واضحة.' },
  { key: 'generatedUi.text0337', textEn: 'Send the task to the right person for acceptance.', textAr: 'أرسل المهمة للمستخدم المناسب بانتظار القبول.' },
  { key: 'generatedUi.text0345', textEn: 'Create tasks, assign ownership, manage acceptance, rejection, approvals and projects from one place—with a clear record of every important step.', textAr: 'أنشئ المهام، كلّف الأشخاص، تابع القبول والرفض والموافقات والمشاريع من مكان واحد مع سجل واضح لكل خطوة.' },
  { key: 'generatedUi.text0351', textEn: 'Approval', textAr: 'بانتظار الموافقة' },
];

export class ResetLandingAcceptanceDictionaryText1724012000000
  implements MigrationInterface
{
  name = 'ResetLandingAcceptanceDictionaryText1724012000000';

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
