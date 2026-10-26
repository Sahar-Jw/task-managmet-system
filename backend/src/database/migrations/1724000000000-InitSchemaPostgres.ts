import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * ============================================================
 * INITIAL POSTGRESQL SCHEMA
 * ============================================================
 *
 * Replaces the previous MySQL / MariaDB migration history.
 *
 * IMPORTANT:
 *
 * - Run against a FRESH PostgreSQL database.
 * - The schema is exactly what the TypeORM entities describe
 *   (ids are native uuid, timestamps are timestamptz, enums are
 *   native PostgreSQL enums, attachments use bytea).
 * - synchronize must remain false.
 *
 * ============================================================
 */

export class InitSchemaPostgres1724000000000
  implements MigrationInterface {
  name =
    'InitSchemaPostgres1724000000000';


  public async up(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,
    );

    /*
     * ========================================================
     * TABLES, ENUMS, INDEXES, FOREIGN KEYS (from the entities)
     * ========================================================
     */

    const ddl: string[] = [
      `CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(50) NOT NULL, "description" character varying(255), "permissions" json NOT NULL, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT '1', "full_name" character varying(150) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "phone" character varying(30), "avatar_url" character varying(500), "role_id" uuid NOT NULL, "department_id" uuid, "branch_id" uuid, "team_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "failed_login_attempts" integer NOT NULL DEFAULT '0', "locked_until" TIMESTAMP WITH TIME ZONE, "locale" character varying(10) NOT NULL DEFAULT 'ar', "timezone" character varying(50) NOT NULL DEFAULT 'UTC', "created_by" uuid, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_1208ee1db5ddb64b48a86b46a6" ON "users" ("team_id")`,
      `CREATE INDEX "IDX_a2cecd1a3531c0b041e29ba46e" ON "users" ("role_id")`,
      `CREATE INDEX "IDX_5a58f726a41264c8b3e86d4a1d" ON "users" ("branch_id")`,
      `CREATE INDEX "IDX_0921d1972cf861d568f5271cd8" ON "users" ("department_id")`,
      `CREATE TABLE "teams" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT '1', "name" character varying(150) NOT NULL, "leader_id" uuid NOT NULL, "invite_token" character varying(64) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_c7fd51fc26b12b0c82b77a7a8f9" UNIQUE ("invite_token"), CONSTRAINT "UQ_10c8e335dc32010ef90abe65cec" UNIQUE ("leader_id"), CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_10c8e335dc32010ef90abe65ce" ON "teams" ("leader_id")`,
      `CREATE TYPE "public"."setting_value_type_enum" AS ENUM('string', 'number')`,
      `CREATE TABLE "settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "type" character varying(50) NOT NULL, "code_ar" character varying(100) NOT NULL, "code_en" character varying(100) NOT NULL, "key" character varying(150), "is_system" boolean NOT NULL DEFAULT false, "value_type" "public"."setting_value_type_enum" NOT NULL DEFAULT 'string', "value_ar" character varying(255), "value_en" character varying(255), "value_number" numeric(14,2), "address" character varying(255), "is_admin_department" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0669fe20e252eb692bf4d344975" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_b99ecb7dd618e87685bdde6940" ON "settings" ("type")`,
      `CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT '1', "name" character varying(200) NOT NULL, "description" text, "status" character varying(50) NOT NULL DEFAULT 'Planned', "start_date" date, "end_date" date, "created_by" uuid, "team_id" uuid, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_2187088ab5ef2a918473cb99007" UNIQUE ("name"), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_ce17f8b1c8016554cafa2dc8fb" ON "projects" ("team_id")`,
      `CREATE TYPE "public"."task_attachments_storage_type_enum" AS ENUM('IMAGE', 'DATABASE')`,
      `CREATE TABLE "task_attachments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "task_id" uuid, "assignment_id" uuid, "uploaded_by" uuid NOT NULL, "file_name" character varying(255) NOT NULL, "mime_type" character varying(100) NOT NULL, "file_size" bigint NOT NULL, "storage_type" "public"."task_attachments_storage_type_enum" NOT NULL DEFAULT 'IMAGE', "file_url" character varying(500), "file_data" bytea, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "CHK_86dec00e99ca2ff91bc1c9527b" CHECK ((
    task_id IS NOT NULL
    AND assignment_id IS NULL
  )
  OR
  (
    task_id IS NULL
    AND assignment_id IS NOT NULL
  )), CONSTRAINT "PK_34eb9e5133310a488eaba0be28a" PRIMARY KEY ("id"))`,
      `CREATE TYPE "public"."assignment_status_enum" AS ENUM('PendingAcceptance', 'Accepted', 'Rejected', 'Reassigned', 'Completed')`,
      `CREATE TABLE "task_assignments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT '1', "task_id" uuid NOT NULL, "assignee_id" uuid NOT NULL, "assigned_by" uuid NOT NULL, "status" "public"."assignment_status_enum" NOT NULL DEFAULT 'PendingAcceptance', "due_date" date, "rejection_reason" text, "accepted_at" TIMESTAMP WITH TIME ZONE, "rejected_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_b68f42cf36d807d8a19a96066d7" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_464a6ea0e70dc2600677640c79" ON "task_assignments" ("status")`,
      `CREATE INDEX "IDX_5fbb07753ef37a59017937f951" ON "task_assignments" ("assignee_id")`,
      `CREATE INDEX "IDX_b389f4488d0a8241c3c9827396" ON "task_assignments" ("task_id")`,
      `CREATE TABLE "task_comments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "task_id" uuid NOT NULL, "author_id" uuid NOT NULL, "content" text NOT NULL, "is_edited" boolean NOT NULL DEFAULT false, "edited_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_83b99b0b03db29d4cafcb579b77" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_608fdc50eb832e128ac4167078" ON "task_comments" ("task_id", "created_at")`,
      `CREATE TABLE "task_ratings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "task_id" uuid NOT NULL, "rated_by" uuid NOT NULL, "score" integer NOT NULL, "feedback" text, CONSTRAINT "UQ_4236be3636fecd57be06078434e" UNIQUE ("task_id", "rated_by"), CONSTRAINT "CHK_1f709fa682c322d435d714e128" CHECK ("score" BETWEEN 1 AND 5), CONSTRAINT "PK_e8dc04df6bdd81b7e56a29c9df6" PRIMARY KEY ("id"))`,
      `CREATE TYPE "public"."approval_status_enum" AS ENUM('NotRequired', 'Pending', 'Approved', 'Rejected')`,
      `CREATE TABLE "tasks" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "version" integer NOT NULL DEFAULT '1', "title" character varying(255) NOT NULL, "description" text, "task_type" character varying(50) NOT NULL DEFAULT 'General', "priority" character varying(50) NOT NULL DEFAULT 'Medium', "status" character varying(50) NOT NULL DEFAULT 'Pending', "color" character varying(20), "branch_id" uuid, "department_id" uuid, "project_id" uuid, "assigned_to_id" uuid, "created_by" uuid NOT NULL, "needs_approval" boolean NOT NULL DEFAULT false, "approver_id" uuid, "approval_status" "public"."approval_status_enum" NOT NULL DEFAULT 'NotRequired', "rejection_reason" text, "needs_budget" boolean NOT NULL DEFAULT false, "budget_min" numeric(14,2), "budget_max" numeric(14,2), "budget_currency" character varying(10) DEFAULT 'SAR', "start_date" date, "deadline_date" date, "actual_end_date" TIMESTAMP WITH TIME ZONE, "overdue_notified_at" TIMESTAMP WITH TIME ZONE, "parent_task_id" uuid, "archived_at" TIMESTAMP WITH TIME ZONE, "assignee_can_download_attachments" boolean NOT NULL DEFAULT true, "status_before_archive" character varying(50), CONSTRAINT "CHK_3f65c320708823787e33d8a8f5" CHECK ("parent_task_id" IS NULL OR "parent_task_id" <> "id"), CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_c6181cef72058307711f877467" ON "tasks" ("deadline_date")`,
      `CREATE INDEX "IDX_9430f12c5a1604833f64595a57" ON "tasks" ("assigned_to_id")`,
      `CREATE INDEX "IDX_6086c8dafbae729a930c04d865" ON "tasks" ("status")`,
      `CREATE INDEX "IDX_54fc42a253a8338488ec1f960a" ON "tasks" ("parent_task_id")`,
      `CREATE INDEX "IDX_9eecdb5b1ed8c7c2a1b392c28d" ON "tasks" ("project_id")`,
      `CREATE INDEX "IDX_9f72cc65d40b9d76dcd60bf2f5" ON "tasks" ("department_id")`,
      `CREATE INDEX "IDX_99553977ed1c482525e671cf88" ON "tasks" ("branch_id")`,
      `CREATE TABLE "task_workflow_config" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "mode" character varying(30) NOT NULL DEFAULT 'all_available', "actions" json NOT NULL, "updated_by" uuid, CONSTRAINT "PK_b31fe6dec6f3d323eab57cecafe" PRIMARY KEY ("id"))`,
      `CREATE TYPE "public"."notification_type_enum" AS ENUM('TaskAssigned', 'TaskReassigned', 'AssignmentAccepted', 'AssignmentRejected', 'ApprovalRequested', 'ApprovalDecision', 'TaskStatusChanged', 'TaskCompleted', 'TaskReopened', 'TaskUpdated', 'DueDateChanged', 'DueDateApproaching', 'TaskOverdue', 'NewComment', 'ProjectUpdated', 'ProjectArchived', 'ProjectRestored')`,
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "recipient_id" uuid NOT NULL, "type" "public"."notification_type_enum" NOT NULL, "title" character varying(200) NOT NULL, "message" text NOT NULL, "metadata" json, "is_read" boolean NOT NULL DEFAULT false, "read_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_a0e23ed71f5b46f4892369b78f" ON "notifications" ("recipient_id", "is_read", "created_at")`,
      `CREATE TABLE "dictionary_entries" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "key" character varying(255) NOT NULL, "text_en" text NOT NULL, "text_ar" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_d2598cc24a4f9dd9c7733a4994d" UNIQUE ("key"), CONSTRAINT "PK_47cac68f15abb2d1caa183960fd" PRIMARY KEY ("id"))`,
      `CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "code" character varying(20) NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "archived_at" TIMESTAMP WITH TIME ZONE, "is_admin_department" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_91fddbe23e927e1e525c152baa3" UNIQUE ("code"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`,
      `CREATE TABLE "branding_settings" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "site_name" character varying(150) NOT NULL DEFAULT 'Task & Project Manager', "logo_url" character varying(255), "favicon_url" character varying(255), "meta_title" character varying(150), "meta_description" character varying(300), "meta_keywords" character varying(300), "updated_by_id" uuid, CONSTRAINT "PK_ec51d33cc5ec38420355309bfab" PRIMARY KEY ("id"))`,
      `CREATE TABLE "branches" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying(150) NOT NULL, "code" character varying(20) NOT NULL, "address" character varying(255), "is_active" boolean NOT NULL DEFAULT true, "created_by" uuid, "archived_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_9c06cbb83feb2f0be6263bd47ee" UNIQUE ("code"), CONSTRAINT "PK_7f37d3b42defea97f1df0d19535" PRIMARY KEY ("id"))`,
      `CREATE TABLE "user_sessions" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "ip_address" character varying(45), "user_agent" character varying(500), "last_active_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id"))`,
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id")`,
      `CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "token_hash" character varying(255) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_91185d86d5d7557b19abbb2868b" UNIQUE ("token_hash"), CONSTRAINT "PK_d16bebd73e844c48bca50ff8d3d" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_52ac39dd8a28730c63aeb428c9" ON "password_reset_tokens" ("user_id")`,
      `CREATE TYPE "public"."audit_action_enum" AS ENUM('Create', 'Update', 'Delete', 'Approve', 'Reject', 'Assign', 'Accept', 'Reassign', 'StatusChange', 'Login', 'Logout', 'LoginFailed', 'AccountLocked', 'AccountUnlocked', 'Activate', 'Deactivate', 'Restore', 'Archive')`,
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "actor_id" uuid, "entity_type" character varying(50) NOT NULL, "entity_id" uuid NOT NULL, "action" "public"."audit_action_enum" NOT NULL, "old_value" json, "new_value" json, "reason" text, "ip_address" character varying(45), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
      `CREATE INDEX "IDX_4a85d553dbb4006bd350ab6f88" ON "audit_logs" ("actor_id", "created_at")`,
      `CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_type", "entity_id")`,
      `ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_8c07320adec50a39744a4a301d3" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_e2b248ecbf9aeeab8f47213ce67" FOREIGN KEY ("assignment_id") REFERENCES "task_assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_attachments" ADD CONSTRAINT "FK_0bde6a97fd0578e6ae7fb637495" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_assignments" ADD CONSTRAINT "FK_b389f4488d0a8241c3c98273966" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_assignments" ADD CONSTRAINT "FK_5fbb07753ef37a59017937f9512" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_assignments" ADD CONSTRAINT "FK_69edf4d835d0e50fdad8d155d5f" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_ba9e465cfc707006e60aae59946" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_comments" ADD CONSTRAINT "FK_76901a920ba9ec5be8dbd64d747" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_ratings" ADD CONSTRAINT "FK_195da81aa8a4a18525ce11bc1c8" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "task_ratings" ADD CONSTRAINT "FK_a7b11013c0235b5711c12da00c9" FOREIGN KEY ("rated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_99553977ed1c482525e671cf880" FOREIGN KEY ("branch_id") REFERENCES "settings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9f72cc65d40b9d76dcd60bf2f5c" FOREIGN KEY ("department_id") REFERENCES "settings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9430f12c5a1604833f64595a57f" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_9fc727aef9e222ebd09dc8dac08" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_3b5cd1658c36427a078d76900ef" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "tasks" ADD CONSTRAINT "FK_54fc42a253a8338488ec1f960ad" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "user_sessions" ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "FK_52ac39dd8a28730c63aeb428c9c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_177183f29f438c488b5e8510cdb" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    ];

    for (const statement of ddl) {
      await queryRunner.query(statement);
    }


    /*
     * ========================================================
     * LEGACY TABLE (only used by the development seed)
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE "assignment_approvals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL,
        "approver_id" uuid NOT NULL,
        "decision" varchar(20) NOT NULL
          CHECK ("decision" IN ('Approved', 'Rejected')),
        "reason" text,
        "decided_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assignment_approvals" PRIMARY KEY ("id"),
        CONSTRAINT "fk_approvals_assignment"
          FOREIGN KEY ("assignment_id") REFERENCES "task_assignments" ("id"),
        CONSTRAINT "fk_approvals_approver"
          FOREIGN KEY ("approver_id") REFERENCES "users" ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "idx_approvals_assignment" ON "assignment_approvals" ("assignment_id")`,
    );


    /*
     * ========================================================
     * PERFORMANCE INDEXES
     * ========================================================
     */

    await queryRunner.query(`CREATE INDEX "idx_tasks_created_at" ON "tasks" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_status_assignee" ON "tasks" ("status", "assigned_to_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_archived_at" ON "tasks" ("archived_at")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_created_at" ON "audit_logs" ("created_at")`);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_expires" ON "refresh_tokens" ("expires_at")`);


    /*
     * ========================================================
     * DEFAULT TASK WORKFLOW
     * ========================================================
     */

    await queryRunner.query(
      `
        INSERT INTO "task_workflow_config" ("mode", "actions")
        VALUES ('all_available', $1)
      `,
      [
        JSON.stringify([
          { key: 'start', enabled: true, order: 1 },
          { key: 'complete', enabled: true, order: 2 },
          { key: 'finish', enabled: true, order: 3 },
          { key: 'archive', enabled: true, order: 4 },
        ]),
      ],
    );


    /*
     * ========================================================
     * BUILT-IN STATUS / TYPE / PRIORITY LISTS
     * ========================================================
     */

    const rows:
      Array<{
        type:
          string;

        key:
          string;

        codeEn:
          string;

        codeAr:
          string;
      }> = [
      /*
       * TASK STATUS
       */
      {
        type:
          'task_status',

        key:
          'Pending',

        codeEn:
          'Pending',

        codeAr:
          'قيد الانتظار',
      },

      {
        type:
          'task_status',

        key:
          'Unassigned',

        codeEn:
          'Unassigned',

        codeAr:
          'غير مسندة',
      },

      {
        type:
          'task_status',

        key:
          'InProgress',

        codeEn:
          'In Progress',

        codeAr:
          'قيد التنفيذ',
      },

      {
        type:
          'task_status',

        key:
          'Completed',

        codeEn:
          'Completed',

        codeAr:
          'مكتملة',
      },

      {
        type:
          'task_status',

        key:
          'Reopened',

        codeEn:
          'Reopened',

        codeAr:
          'أعيد فتحها',
      },

      {
        type:
          'task_status',

        key:
          'Finished',

        codeEn:
          'Finished',

        codeAr:
          'منتهية',
      },

      {
        type:
          'task_status',

        key:
          'Archived',

        codeEn:
          'Archived',

        codeAr:
          'مؤرشفة',
      },


      /*
       * TASK TYPE
       */
      {
        type:
          'task_type',

        key:
          'General',

        codeEn:
          'General',

        codeAr:
          'عام',
      },

      {
        type:
          'task_type',

        key:
          'Administrative',

        codeEn:
          'Administrative',

        codeAr:
          'إداري',
      },

      {
        type:
          'task_type',

        key:
          'Financial',

        codeEn:
          'Financial',

        codeAr:
          'مالي',
      },

      {
        type:
          'task_type',

        key:
          'Technical',

        codeEn:
          'Technical',

        codeAr:
          'تقني',
      },

      {
        type:
          'task_type',

        key:
          'Maintenance',

        codeEn:
          'Maintenance',

        codeAr:
          'صيانة',
      },

      {
        type:
          'task_type',

        key:
          'HR',

        codeEn:
          'HR',

        codeAr:
          'الموارد البشرية',
      },

      {
        type:
          'task_type',

        key:
          'Procurement',

        codeEn:
          'Procurement',

        codeAr:
          'المشتريات',
      },

      {
        type:
          'task_type',

        key:
          'Other',

        codeEn:
          'Other',

        codeAr:
          'أخرى',
      },


      /*
       * TASK PRIORITY
       */
      {
        type:
          'task_priority',

        key:
          'Low',

        codeEn:
          'Low',

        codeAr:
          'منخفضة',
      },

      {
        type:
          'task_priority',

        key:
          'Medium',

        codeEn:
          'Medium',

        codeAr:
          'متوسطة',
      },

      {
        type:
          'task_priority',

        key:
          'High',

        codeEn:
          'High',

        codeAr:
          'عالية',
      },

      {
        type:
          'task_priority',

        key:
          'Critical',

        codeEn:
          'Critical',

        codeAr:
          'حرجة',
      },


      /*
       * PROJECT STATUS
       */
      {
        type:
          'project_status',

        key:
          'Planned',

        codeEn:
          'Planned',

        codeAr:
          'مخطط له',
      },

      {
        type:
          'project_status',

        key:
          'Active',

        codeEn:
          'Active',

        codeAr:
          'نشط',
      },

      {
        type:
          'project_status',

        key:
          'Completed',

        codeEn:
          'Completed',

        codeAr:
          'مكتمل',
      },

      {
        type:
          'project_status',

        key:
          'Archived',

        codeEn:
          'Archived',

        codeAr:
          'مؤرشف',
      },
    ];


    for (
      const row
      of rows
    ) {
      await queryRunner.query(
        `
          INSERT INTO "settings" (
            "type",
            "code_ar",
            "code_en",
            "key",
            "is_system",
            "value_type",
            "value_ar",
            "value_en",
            "is_active"
          )
          VALUES ($1, $2, $3, $4, true, 'string', $5, $6, true)
        `,
        [
          row.type,
          row.codeAr,
          row.codeEn,
          row.key,
          row.codeAr,
          row.codeEn,
        ],
      );
    }
  }


  public async down(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`DROP SCHEMA public CASCADE`);
    await queryRunner.query(`CREATE SCHEMA public`);
  }
}
