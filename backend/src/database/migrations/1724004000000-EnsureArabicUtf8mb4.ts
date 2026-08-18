import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Repairs databases that were created/imported with latin1 columns even
 * though the current schema and connection use utf8mb4. Once MySQL stores
 * Arabic as question marks the original characters cannot be recovered, but
 * this prevents all new and subsequently edited text from being corrupted.
 */
export class EnsureArabicUtf8mb41724004000000
  implements MigrationInterface {
  name =
    'EnsureArabicUtf8mb41724004000000';


  public async up(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks
        DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci,
        MODIFY title_ar varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY title_en varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY description_ar text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        MODIFY description_en text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
        MODIFY rejection_reason text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL
    `);


    await queryRunner.query(`
      ALTER TABLE task_comments
        DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci,
        MODIFY content text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);


    await queryRunner.query(`
      ALTER TABLE task_attachments
        DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci,
        MODIFY file_name varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);


    await queryRunner.query(`
      ALTER TABLE notifications
        DEFAULT CHARACTER SET utf8mb4
        COLLATE utf8mb4_unicode_ci,
        MODIFY title varchar(200)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY message text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
    `);


    await queryRunner.query(`
      ALTER TABLE users
        MODIFY locale varchar(10) NOT NULL DEFAULT 'ar'
    `);
  }


  public async down(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    /* Never downgrade Unicode columns; that would corrupt stored Arabic. */
    await queryRunner.query(`
      ALTER TABLE users
        MODIFY locale varchar(10) NOT NULL DEFAULT 'en'
    `);
  }
}
