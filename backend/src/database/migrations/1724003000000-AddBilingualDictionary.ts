import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBilingualDictionary1724003000000 implements MigrationInterface {
  name = 'AddBilingualDictionary1724003000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE dictionary_entries (
        id CHAR(36) NOT NULL,
        \`key\` VARCHAR(255) NOT NULL,
        text_en TEXT NOT NULL,
        text_ar TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_dictionary_entries_key (\`key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS dictionary_entries');
  }
}
