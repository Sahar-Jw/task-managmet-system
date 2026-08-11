import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1721400000000 implements MigrationInterface {
  name = 'InitSchema1721400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    // ---------- ENUM TYPES ----------
    await queryRunner.query(`CREATE TYPE "project_status_enum" AS ENUM ('Planned','Active','Completed','Archived')`);
    await queryRunner.query(`CREATE TYPE "task_status_enum" AS ENUM ('Pending','Unassigned','InProgress','PendingApproval','Completed','Reopened','Finished','Archived')`);
    await queryRunner.query(`CREATE TYPE "task_priority_enum" AS ENUM ('Low','Medium','High','Critical')`);
    await queryRunner.query(`CREATE TYPE "assignment_status_enum" AS ENUM ('PendingAcceptance','Accepted','Rejected','Reassigned','Completed')`);
    await queryRunner.query(`CREATE TYPE "approval_decision_enum" AS ENUM ('Approved','Rejected')`);
    await queryRunner.query(`CREATE TYPE "notification_type_enum" AS ENUM ('TaskAssigned','TaskReassigned','AssignmentRejected','ApprovalDecision','NewComment','DueDateApproaching','TaskOverdue')`);
    await queryRunner.query(`CREATE TYPE "audit_action_enum" AS ENUM ('Create','Update','Delete','Approve','Reject','Assign','Reassign','StatusChange','Login','Logout','LoginFailed','AccountLocked','AccountUnlocked','Restore','Archive')`);
    await queryRunner.query(`CREATE TYPE "task_type_enum" AS ENUM ('General','Administrative','Financial','Technical','Maintenance','HR','Procurement','Other')`);
    await queryRunner.query(`CREATE TYPE "approval_status_enum" AS ENUM ('NotRequired','Pending','Approved','Rejected')`);

    // ---------- ROLES ----------
    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(50) NOT NULL UNIQUE,
        "description" varchar(255),
        "permissions" jsonb NOT NULL DEFAULT '{}',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- BRANCHES ----------
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "code" varchar(20) NOT NULL UNIQUE,
        "address" varchar(255),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz
      )
    `);

    // ---------- DEPARTMENTS ----------
    // Standalone lookup entity: no relation to Branch or any other entity.
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(150) NOT NULL,
        "code" varchar(20) NOT NULL UNIQUE,
        "is_active" boolean NOT NULL DEFAULT true,
        "is_admin_department" boolean NOT NULL DEFAULT false,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz
      )
    `);

    // ---------- USERS ----------
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "full_name" varchar(150) NOT NULL,
        "email" varchar(255) NOT NULL UNIQUE,
        "password_hash" varchar(255) NOT NULL,
        "phone" varchar(30),
        "avatar_url" varchar(500),
        "role_id" uuid NOT NULL REFERENCES "roles"("id"),
        "department_id" uuid NOT NULL REFERENCES "departments"("id"),
        "branch_id" uuid NOT NULL REFERENCES "branches"("id"),
        "is_active" boolean NOT NULL DEFAULT true,
        "failed_login_attempts" int NOT NULL DEFAULT 0,
        "locked_until" timestamptz,
        "locale" varchar(10) NOT NULL DEFAULT 'en',
        "timezone" varchar(50) NOT NULL DEFAULT 'UTC',
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz,
        "version" int NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_users_department" ON "users" ("department_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_branch" ON "users" ("branch_id")`);
    await queryRunner.query(`CREATE INDEX "idx_users_role" ON "users" ("role_id")`);

    // Backfill circular FK now that users exists
    await queryRunner.query(`ALTER TABLE "branches" ADD CONSTRAINT "fk_branches_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);
    await queryRunner.query(`ALTER TABLE "departments" ADD CONSTRAINT "fk_departments_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")`);

    // ---------- PROJECTS ----------
    // Standalone lookup entity: no relation to Branch or any other entity.
    await queryRunner.query(`
      CREATE TABLE "projects" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL UNIQUE,
        "description" text,
        "status" project_status_enum NOT NULL DEFAULT 'Planned',
        "start_date" date,
        "end_date" date,
        "created_by" uuid REFERENCES "users"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz,
        "version" int NOT NULL DEFAULT 1
      )
    `);

    // ---------- TASKS ----------
    // Task is the central/hub entity: it is the ONLY table with foreign
    // keys into branches / departments / projects, each independent of
    // the others (a Task can set any combination of the three).
    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title_ar" varchar(255) NOT NULL,
        "title_en" varchar(255) NOT NULL,
        "description_ar" text,
        "description_en" text,
        "task_type" task_type_enum NOT NULL DEFAULT 'General',
        "priority" task_priority_enum NOT NULL DEFAULT 'Medium',
        "status" task_status_enum NOT NULL DEFAULT 'Pending',
        "color" varchar(20),
        "branch_id" uuid REFERENCES "branches"("id"),
        "department_id" uuid REFERENCES "departments"("id"),
        "project_id" uuid REFERENCES "projects"("id"),
        "assigned_to_id" uuid REFERENCES "users"("id"),
        "created_by" uuid NOT NULL REFERENCES "users"("id"),
        "needs_approval" boolean NOT NULL DEFAULT false,
        "approver_id" uuid REFERENCES "users"("id"),
        "approval_status" approval_status_enum NOT NULL DEFAULT 'NotRequired',
        "rejection_reason" text,
        "needs_budget" boolean NOT NULL DEFAULT false,
        "budget_min" numeric(14,2),
        "budget_max" numeric(14,2),
        "budget_currency" varchar(10) DEFAULT 'SAR',
        "start_date" date,
        "deadline_date" date,
        "actual_end_date" timestamptz,
        "parent_task_id" uuid REFERENCES "tasks"("id"),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz,
        "version" int NOT NULL DEFAULT 1,
        CONSTRAINT "chk_task_no_self_parent" CHECK ("parent_task_id" IS NULL OR "parent_task_id" <> "id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_tasks_branch" ON "tasks" ("branch_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_project" ON "tasks" ("project_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_department" ON "tasks" ("department_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_parent" ON "tasks" ("parent_task_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_status" ON "tasks" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_assigned_to" ON "tasks" ("assigned_to_id")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_deadline_date" ON "tasks" ("deadline_date")`);

    // ---------- TASK ASSIGNMENTS ----------
    await queryRunner.query(`
      CREATE TABLE "task_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
        "assignee_id" uuid NOT NULL REFERENCES "users"("id"),
        "assigned_by" uuid NOT NULL REFERENCES "users"("id"),
        "status" assignment_status_enum NOT NULL DEFAULT 'PendingAcceptance',
        "due_date" date,
        "rejection_reason" text,
        "accepted_at" timestamptz,
        "rejected_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "version" int NOT NULL DEFAULT 1
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_assignments_task" ON "task_assignments" ("task_id")`);
    await queryRunner.query(`CREATE INDEX "idx_assignments_assignee" ON "task_assignments" ("assignee_id")`);
    await queryRunner.query(`CREATE INDEX "idx_assignments_status" ON "task_assignments" ("status")`);

    // ---------- ASSIGNMENT APPROVALS ----------
    await queryRunner.query(`
      CREATE TABLE "assignment_approvals" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL REFERENCES "task_assignments"("id"),
        "approver_id" uuid NOT NULL REFERENCES "users"("id"),
        "decision" approval_decision_enum NOT NULL,
        "reason" text,
        "decided_at" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_approvals_assignment" ON "assignment_approvals" ("assignment_id")`);

    // ---------- TASK RATINGS ----------
    await queryRunner.query(`
      CREATE TABLE "task_ratings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
        "rated_by" uuid NOT NULL REFERENCES "users"("id"),
        "score" int NOT NULL,
        "feedback" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_rating_task_rater" UNIQUE ("task_id", "rated_by"),
        CONSTRAINT "chk_rating_score_range" CHECK ("score" BETWEEN 1 AND 5)
      )
    `);

    // ---------- TASK COMMENTS ----------
    await queryRunner.query(`
      CREATE TABLE "task_comments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" uuid NOT NULL REFERENCES "tasks"("id"),
        "author_id" uuid NOT NULL REFERENCES "users"("id"),
        "content" text NOT NULL,
        "is_edited" boolean NOT NULL DEFAULT false,
        "edited_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_comments_task_created" ON "task_comments" ("task_id", "created_at")`);

    // ---------- TASK ATTACHMENTS ----------
    await queryRunner.query(`
      CREATE TABLE "task_attachments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "task_id" uuid REFERENCES "tasks"("id"),
        "assignment_id" uuid REFERENCES "task_assignments"("id"),
        "uploaded_by" uuid NOT NULL REFERENCES "users"("id"),
        "file_name" varchar(255) NOT NULL,
        "file_url" varchar(500) NOT NULL,
        "mime_type" varchar(100) NOT NULL,
        "file_size" bigint NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz,
        CONSTRAINT "chk_attachment_single_owner" CHECK (
          ("task_id" IS NOT NULL AND "assignment_id" IS NULL) OR
          ("task_id" IS NULL AND "assignment_id" IS NOT NULL)
        )
      )
    `);

    // ---------- NOTIFICATIONS ----------
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "recipient_id" uuid NOT NULL REFERENCES "users"("id"),
        "type" notification_type_enum NOT NULL,
        "title" varchar(200) NOT NULL,
        "message" text NOT NULL,
        "metadata" jsonb,
        "is_read" boolean NOT NULL DEFAULT false,
        "read_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_notifications_recipient" ON "notifications" ("recipient_id", "is_read", "created_at")`);

    // ---------- AUDIT LOGS ----------
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" uuid REFERENCES "users"("id"),
        "entity_type" varchar(50) NOT NULL,
        "entity_id" uuid NOT NULL,
        "action" audit_action_enum NOT NULL,
        "old_value" jsonb,
        "new_value" jsonb,
        "reason" text,
        "ip_address" varchar(45),
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_audit_entity" ON "audit_logs" ("entity_type", "entity_id")`);
    await queryRunner.query(`CREATE INDEX "idx_audit_actor_created" ON "audit_logs" ("actor_id", "created_at")`);

    // ---------- REFRESH TOKENS ----------
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "token_hash" varchar(255) NOT NULL UNIQUE,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX "idx_refresh_tokens_user" ON "refresh_tokens" ("user_id")`);

    // ---------- USER SESSIONS ----------
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "ip_address" varchar(45),
        "user_agent" varchar(500),
        "last_active_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ---------- AUDIT LOG IMMUTABILITY (BR-076, NFR-AUD-02) ----------
    // Prevent UPDATE/DELETE on audit_logs via a trigger, independent of
    // whatever DB role the application connects as.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs is append-only: % operations are not permitted', TG_OP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_audit_logs_no_update
      BEFORE UPDATE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_audit_logs_no_delete
      BEFORE DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_logs_no_delete ON "audit_logs"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_logs_no_update ON "audit_logs"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_audit_log_mutation`);

    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_attachments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_comments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_ratings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "assignment_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "projects"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "departments" DROP CONSTRAINT IF EXISTS "fk_departments_created_by"`);
    await queryRunner.query(`ALTER TABLE IF EXISTS "branches" DROP CONSTRAINT IF EXISTS "fk_branches_created_by"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "audit_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "approval_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "approval_decision_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "assignment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_priority_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "project_status_enum"`);
  }
}
