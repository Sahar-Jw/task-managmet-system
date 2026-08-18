import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Tasks store exactly one title and one description. Their content may be in
 * any language. Bilingual dictionary/settings tables remain unchanged.
 */
export class UnifyTaskText1724005000000
  implements MigrationInterface {
  name =
    'UnifyTaskText1724005000000';


  public async up(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks
        ADD COLUMN title varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER id,
        ADD COLUMN description text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title
    `);


    await queryRunner.query(`
      UPDATE tasks
      SET
        title = CASE
          WHEN NULLIF(TRIM(title_ar), '') IS NOT NULL
            AND title_ar NOT REGEXP '^[?[:space:]]+$'
            THEN title_ar
          WHEN NULLIF(TRIM(title_en), '') IS NOT NULL
            AND title_en NOT REGEXP '^[?[:space:]]+$'
            THEN title_en
          ELSE COALESCE(NULLIF(title_ar, ''), NULLIF(title_en, ''), '')
        END,
        description = CASE
          WHEN NULLIF(TRIM(description_ar), '') IS NOT NULL
            AND description_ar NOT REGEXP '^[?[:space:]]+$'
            THEN description_ar
          WHEN NULLIF(TRIM(description_en), '') IS NOT NULL
            AND description_en NOT REGEXP '^[?[:space:]]+$'
            THEN description_en
          ELSE COALESCE(NULLIF(description_ar, ''), NULLIF(description_en, ''))
        END
    `);


    await queryRunner.query(`
      ALTER TABLE tasks
        MODIFY title varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        DROP COLUMN title_ar,
        DROP COLUMN title_en,
        DROP COLUMN description_ar,
        DROP COLUMN description_en
    `);
  }


  public async down(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tasks
        ADD COLUMN title_ar varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER id,
        ADD COLUMN title_en varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title_ar,
        ADD COLUMN description_ar text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER title_en,
        ADD COLUMN description_en text
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL AFTER description_ar
    `);


    await queryRunner.query(`
      UPDATE tasks
      SET
        title_ar = title,
        title_en = title,
        description_ar = description,
        description_en = description
    `);


    await queryRunner.query(`
      ALTER TABLE tasks
        MODIFY title_ar varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        MODIFY title_en varchar(255)
          CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
        DROP COLUMN title,
        DROP COLUMN description
    `);
  }
}
