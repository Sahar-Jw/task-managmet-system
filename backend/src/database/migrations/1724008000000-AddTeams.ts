import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * Adds Teams: a Team Leader's group.
 *
 * - `teams` — one row per leader (leader_id unique), holding the
 *   invite-link token employees register through.
 * - `users.team_id` — which Team a User belongs to (leader or employee).
 * - `projects.team_id` — which Team a Project belongs to. Null means
 *   organization-wide (Admin-created), same visibility as before Teams
 *   existed.
 */
export class AddTeams1724008000000
  implements MigrationInterface {
  name =
    'AddTeams1724008000000';


  public async up(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE teams (
        id varchar(36) NOT NULL PRIMARY KEY,

        name varchar(150) NOT NULL,

        leader_id varchar(36)
          NOT NULL
          UNIQUE,

        invite_token varchar(64)
          NOT NULL
          UNIQUE,

        is_active tinyint(1)
          NOT NULL
          DEFAULT 1,

        archived_at timestamp(6) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        version int
          NOT NULL
          DEFAULT 1,

        INDEX idx_teams_leader (
          leader_id
        ),

        CONSTRAINT fk_teams_leader
          FOREIGN KEY (
            leader_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN team_id varchar(36) NULL AFTER branch_id,
      ADD INDEX idx_users_team (team_id),
      ADD CONSTRAINT fk_users_team
        FOREIGN KEY (team_id)
        REFERENCES teams (id)
    `);


    await queryRunner.query(`
      ALTER TABLE projects
      ADD COLUMN team_id varchar(36) NULL AFTER created_by,
      ADD INDEX idx_projects_team (team_id),
      ADD CONSTRAINT fk_projects_team
        FOREIGN KEY (team_id)
        REFERENCES teams (id)
    `);
  }


  public async down(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE projects
      DROP FOREIGN KEY fk_projects_team,
      DROP INDEX idx_projects_team,
      DROP COLUMN team_id
    `);


    await queryRunner.query(`
      ALTER TABLE users
      DROP FOREIGN KEY fk_users_team,
      DROP INDEX idx_users_team,
      DROP COLUMN team_id
    `);


    await queryRunner.query(`
      DROP TABLE teams
    `);
  }
}
