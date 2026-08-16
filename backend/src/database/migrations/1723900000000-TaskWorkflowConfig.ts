import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


export class TaskWorkflowConfig1723900000000
  implements MigrationInterface {
  name =
    'TaskWorkflowConfig1723900000000';


  public async up(
    queryRunner:
      QueryRunner,
  ):
    Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "task_workflow_config" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "mode" varchar(30) NOT NULL DEFAULT 'all_available',
        "actions" json NOT NULL,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_task_workflow_config"
          PRIMARY KEY ("id")
      )
    `);


    await queryRunner.query(`
      INSERT INTO "task_workflow_config" (
        "mode",
        "actions"
      )
      VALUES (
        'all_available',
        '[
          {
            "key": "start",
            "enabled": true,
            "order": 1
          },
          {
            "key": "submit_approval",
            "enabled": true,
            "order": 2
          },
          {
            "key": "complete",
            "enabled": true,
            "order": 3
          },
          {
            "key": "finish",
            "enabled": true,
            "order": 4
          },
          {
            "key": "archive",
            "enabled": true,
            "order": 5
          }
        ]'::json
      )
    `);
  }


  public async down(
    queryRunner:
      QueryRunner,
  ):
    Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "task_workflow_config"
    `);
  }
}