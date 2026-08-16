import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


export class HybridAttachmentStorage1724001000000
  implements MigrationInterface {
  name =
    'HybridAttachmentStorage1724001000000';


  public async up(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    /*
     * Existing image/file URLs must become nullable because
     * database-stored documents will not have a physical URL.
     */
    await queryRunner.query(`
      ALTER TABLE task_attachments
      MODIFY COLUMN file_url varchar(500) NULL
    `);


    /*
     * IMAGE:
     *
     * physical file under backend/storage/
     * DB contains file_url only.
     *
     * DATABASE:
     *
     * actual file bytes inside MySQL file_data.
     */
    await queryRunner.query(`
      ALTER TABLE task_attachments
      ADD COLUMN storage_type
        ENUM(
          'IMAGE',
          'DATABASE'
        )
        NOT NULL
        DEFAULT 'IMAGE'
      AFTER file_size
    `);


    /*
     * LONGBLOB allows large binary documents.
     *
     * Application upload limits still determine the actual
     * maximum accepted upload size.
     */
    await queryRunner.query(`
      ALTER TABLE task_attachments
      ADD COLUMN file_data LONGBLOB NULL
      AFTER storage_type
    `);


    /*
     * Existing attachment rows already have file_url and therefore
     * represent disk-backed files.
     */
    await queryRunner.query(`
      UPDATE task_attachments
      SET storage_type = 'IMAGE'
      WHERE file_url IS NOT NULL
    `);
  }


  public async down(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    /*
     * A rollback cannot represent DATABASE rows using the old
     * non-null file_url schema, so remove database-only records.
     */
    await queryRunner.query(`
      DELETE FROM task_attachments
      WHERE storage_type = 'DATABASE'
    `);


    await queryRunner.query(`
      ALTER TABLE task_attachments
      DROP COLUMN file_data
    `);


    await queryRunner.query(`
      ALTER TABLE task_attachments
      DROP COLUMN storage_type
    `);


    await queryRunner.query(`
      ALTER TABLE task_attachments
      MODIFY COLUMN file_url varchar(500) NOT NULL
    `);
  }
}