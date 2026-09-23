import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Self-registration (no invite token) now creates a brand-new Team
 * Leader with no Admin-assigned Branch yet — so branch_id can no
 * longer be NOT NULL. Mirrors department_id, which was already
 * nullable for the same reason (Admin accounts).
 */
export class MakeUserBranchIdNullable1724009000000
  implements MigrationInterface {
  name =
    'MakeUserBranchIdNullable1724009000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN branch_id varchar(36) NULL
    `);
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      MODIFY COLUMN branch_id varchar(36) NOT NULL
    `);
  }
}
