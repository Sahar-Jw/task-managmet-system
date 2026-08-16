import {
  MigrationInterface,
  QueryRunner,
} from 'typeorm';


/**
 * ============================================================
 * INITIAL MYSQL / MARIADB SCHEMA
 * ============================================================
 *
 * MySQL-native replacement for the previous PostgreSQL
 * migration history.
 *
 * IMPORTANT:
 *
 * - Run against a FRESH database.
 * - Do not keep the old PostgreSQL migrations inside the
 *   TypeORM migrations folder.
 * - UUID values are stored as varchar(36).
 * - TypeORM/app still generates UUID strings.
 * - synchronize must remain false.
 *
 * ============================================================
 */

export class InitSchemaMysql1724000000000
  implements MigrationInterface {
  name =
    'InitSchemaMysql1724000000000';


  /*
   * ==========================================================
   * UP
   * ==========================================================
   */

  public async up(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    /*
     * ========================================================
     * ROLES
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE roles (
        id varchar(36) NOT NULL PRIMARY KEY,

        name varchar(50) NOT NULL UNIQUE,

        description varchar(255) NULL,

        permissions json NOT NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * SETTINGS
     * ========================================================
     *
     * Polymorphic table for:
     *
     * - branches
     * - departments
     * - project settings
     * - task statuses
     * - task types
     * - task priorities
     * - project statuses
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE settings (
        id varchar(36) NOT NULL PRIMARY KEY,

        type varchar(50) NOT NULL,

        code_ar varchar(100) NOT NULL,

        code_en varchar(100) NOT NULL,

        \`key\` varchar(150) NULL,

        is_system tinyint(1)
          NOT NULL
          DEFAULT 0,

        value_type ENUM(
          'string',
          'number'
        )
          NOT NULL
          DEFAULT 'string',

        value_ar varchar(255) NULL,

        value_en varchar(255) NULL,

        value_number numeric(14,2) NULL,

        address varchar(255) NULL,

        is_admin_department tinyint(1)
          NOT NULL
          DEFAULT 0,

        is_active tinyint(1)
          NOT NULL
          DEFAULT 1,

        created_by varchar(36) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        archived_at timestamp(6) NULL,

        INDEX idx_settings_type (
          type
        ),

        UNIQUE INDEX idx_settings_type_key (
          type,
          \`key\`
        )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * USERS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE users (
        id varchar(36) NOT NULL PRIMARY KEY,

        full_name varchar(150) NOT NULL,

        email varchar(255)
          NOT NULL
          UNIQUE,

        password_hash varchar(255) NOT NULL,

        phone varchar(30) NULL,

        avatar_url varchar(500) NULL,

        role_id varchar(36) NOT NULL,

        department_id varchar(36) NULL,

        branch_id varchar(36) NOT NULL,

        is_active tinyint(1)
          NOT NULL
          DEFAULT 1,

        failed_login_attempts int
          NOT NULL
          DEFAULT 0,

        locked_until timestamp(6) NULL,

        locale varchar(10)
          NOT NULL
          DEFAULT 'en',

        timezone varchar(50)
          NOT NULL
          DEFAULT 'UTC',

        created_by varchar(36) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        archived_at timestamp(6) NULL,

        version int
          NOT NULL
          DEFAULT 1,

        INDEX idx_users_department (
          department_id
        ),

        INDEX idx_users_branch (
          branch_id
        ),

        INDEX idx_users_role (
          role_id
        ),

        CONSTRAINT fk_users_role
          FOREIGN KEY (
            role_id
          )
          REFERENCES roles (
            id
          ),

        CONSTRAINT fk_users_department
          FOREIGN KEY (
            department_id
          )
          REFERENCES settings (
            id
          ),

        CONSTRAINT fk_users_branch
          FOREIGN KEY (
            branch_id
          )
          REFERENCES settings (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * PROJECTS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE projects (
        id varchar(36) NOT NULL PRIMARY KEY,

        name varchar(200)
          NOT NULL
          UNIQUE,

        description text NULL,

        status varchar(50)
          NOT NULL
          DEFAULT 'Planned',

        start_date date NULL,

        end_date date NULL,

        created_by varchar(36) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        archived_at timestamp(6) NULL,

        version int
          NOT NULL
          DEFAULT 1,

        CONSTRAINT fk_projects_created_by
          FOREIGN KEY (
            created_by
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * TASKS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE tasks (
        id varchar(36) NOT NULL PRIMARY KEY,

        title_ar varchar(255) NOT NULL,

        title_en varchar(255) NOT NULL,

        description_ar text NULL,

        description_en text NULL,

        task_type varchar(50)
          NOT NULL
          DEFAULT 'General',

        priority varchar(50)
          NOT NULL
          DEFAULT 'Medium',

        status varchar(50)
          NOT NULL
          DEFAULT 'Pending',

        color varchar(20) NULL,

        branch_id varchar(36) NULL,

        department_id varchar(36) NULL,

        project_id varchar(36) NULL,

        assigned_to_id varchar(36) NULL,

        created_by varchar(36) NOT NULL,

        needs_approval tinyint(1)
          NOT NULL
          DEFAULT 0,

        approver_id varchar(36) NULL,

        approval_status ENUM(
          'NotRequired',
          'Pending',
          'Approved',
          'Rejected'
        )
          NOT NULL
          DEFAULT 'NotRequired',

        rejection_reason text NULL,

        needs_budget tinyint(1)
          NOT NULL
          DEFAULT 0,

        budget_min numeric(14,2) NULL,

        budget_max numeric(14,2) NULL,

        budget_currency varchar(10)
          NULL
          DEFAULT 'SAR',

        start_date date NULL,

        deadline_date date NULL,

        actual_end_date timestamp(6) NULL,

        parent_task_id varchar(36) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        archived_at timestamp(6) NULL,

        version int
          NOT NULL
          DEFAULT 1,

        assignee_can_download_attachments tinyint(1)
          NOT NULL
          DEFAULT 1,

        status_before_archive varchar(50) NULL,

        INDEX idx_tasks_branch (
          branch_id
        ),

        INDEX idx_tasks_project (
          project_id
        ),

        INDEX idx_tasks_department (
          department_id
        ),

        INDEX idx_tasks_parent (
          parent_task_id
        ),

        INDEX idx_tasks_status (
          status
        ),

        INDEX idx_tasks_assigned_to (
          assigned_to_id
        ),

        INDEX idx_tasks_deadline_date (
          deadline_date
        ),

        CONSTRAINT chk_task_no_self_parent
          CHECK (
            parent_task_id IS NULL
            OR parent_task_id <> id
          ),

        CONSTRAINT fk_tasks_branch
          FOREIGN KEY (
            branch_id
          )
          REFERENCES settings (
            id
          ),

        CONSTRAINT fk_tasks_department
          FOREIGN KEY (
            department_id
          )
          REFERENCES settings (
            id
          ),

        CONSTRAINT fk_tasks_project
          FOREIGN KEY (
            project_id
          )
          REFERENCES projects (
            id
          ),

        CONSTRAINT fk_tasks_assigned_to
          FOREIGN KEY (
            assigned_to_id
          )
          REFERENCES users (
            id
          ),

        CONSTRAINT fk_tasks_created_by
          FOREIGN KEY (
            created_by
          )
          REFERENCES users (
            id
          ),

        CONSTRAINT fk_tasks_approver
          FOREIGN KEY (
            approver_id
          )
          REFERENCES users (
            id
          ),

        CONSTRAINT fk_tasks_parent
          FOREIGN KEY (
            parent_task_id
          )
          REFERENCES tasks (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * TASK ASSIGNMENTS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE task_assignments (
        id varchar(36) NOT NULL PRIMARY KEY,

        task_id varchar(36) NOT NULL,

        assignee_id varchar(36) NOT NULL,

        assigned_by varchar(36) NOT NULL,

        status ENUM(
          'PendingAcceptance',
          'Accepted',
          'Rejected',
          'Reassigned',
          'Completed'
        )
          NOT NULL
          DEFAULT 'PendingAcceptance',

        due_date date NULL,

        rejection_reason text NULL,

        accepted_at timestamp(6) NULL,

        rejected_at timestamp(6) NULL,

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

        INDEX idx_assignments_task (
          task_id
        ),

        INDEX idx_assignments_assignee (
          assignee_id
        ),

        INDEX idx_assignments_status (
          status
        ),

        CONSTRAINT fk_assignments_task
          FOREIGN KEY (
            task_id
          )
          REFERENCES tasks (
            id
          ),

        CONSTRAINT fk_assignments_assignee
          FOREIGN KEY (
            assignee_id
          )
          REFERENCES users (
            id
          ),

        CONSTRAINT fk_assignments_assigned_by
          FOREIGN KEY (
            assigned_by
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * ASSIGNMENT APPROVALS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE assignment_approvals (
        id varchar(36) NOT NULL PRIMARY KEY,

        assignment_id varchar(36) NOT NULL,

        approver_id varchar(36) NOT NULL,

        decision ENUM(
          'Approved',
          'Rejected'
        ) NOT NULL,

        reason text NULL,

        decided_at timestamp(6) NOT NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_approvals_assignment (
          assignment_id
        ),

        CONSTRAINT fk_approvals_assignment
          FOREIGN KEY (
            assignment_id
          )
          REFERENCES task_assignments (
            id
          ),

        CONSTRAINT fk_approvals_approver
          FOREIGN KEY (
            approver_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * TASK RATINGS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE task_ratings (
        id varchar(36) NOT NULL PRIMARY KEY,

        task_id varchar(36) NOT NULL,

        rated_by varchar(36) NOT NULL,

        score int NOT NULL,

        feedback text NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6),

        CONSTRAINT uq_rating_task_rater
          UNIQUE (
            task_id,
            rated_by
          ),

        CONSTRAINT chk_rating_score_range
          CHECK (
            score BETWEEN 1 AND 5
          ),

        CONSTRAINT fk_ratings_task
          FOREIGN KEY (
            task_id
          )
          REFERENCES tasks (
            id
          ),

        CONSTRAINT fk_ratings_rated_by
          FOREIGN KEY (
            rated_by
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * TASK COMMENTS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE task_comments (
        id varchar(36) NOT NULL PRIMARY KEY,

        task_id varchar(36) NOT NULL,

        author_id varchar(36) NOT NULL,

        content text NOT NULL,

        is_edited tinyint(1)
          NOT NULL
          DEFAULT 0,

        edited_at timestamp(6) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        deleted_at timestamp(6) NULL,

        INDEX idx_comments_task_created (
          task_id,
          created_at
        ),

        CONSTRAINT fk_comments_task
          FOREIGN KEY (
            task_id
          )
          REFERENCES tasks (
            id
          ),

        CONSTRAINT fk_comments_author
          FOREIGN KEY (
            author_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * TASK ATTACHMENTS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE task_attachments (
        id varchar(36) NOT NULL PRIMARY KEY,

        task_id varchar(36) NULL,

        assignment_id varchar(36) NULL,

        uploaded_by varchar(36) NOT NULL,

        file_name varchar(255) NOT NULL,

        file_url varchar(500) NOT NULL,

        mime_type varchar(100) NOT NULL,

        file_size bigint NOT NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        deleted_at timestamp(6) NULL,

        CONSTRAINT chk_attachment_single_owner
          CHECK (
            (
              task_id IS NOT NULL
              AND assignment_id IS NULL
            )
            OR
            (
              task_id IS NULL
              AND assignment_id IS NOT NULL
            )
          ),

        CONSTRAINT fk_attachments_task
          FOREIGN KEY (
            task_id
          )
          REFERENCES tasks (
            id
          ),

        CONSTRAINT fk_attachments_assignment
          FOREIGN KEY (
            assignment_id
          )
          REFERENCES task_assignments (
            id
          ),

        CONSTRAINT fk_attachments_uploaded_by
          FOREIGN KEY (
            uploaded_by
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * NOTIFICATIONS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE notifications (
        id varchar(36) NOT NULL PRIMARY KEY,

        recipient_id varchar(36) NOT NULL,

        type ENUM(
          'TaskAssigned',
          'TaskReassigned',
          'AssignmentAccepted',
          'AssignmentRejected',
          'ApprovalRequested',
          'ApprovalDecision',
          'TaskStatusChanged',
          'TaskCompleted',
          'TaskReopened',
          'TaskUpdated',
          'DueDateChanged',
          'DueDateApproaching',
          'TaskOverdue',
          'NewComment',
          'ProjectUpdated',
          'ProjectArchived',
          'ProjectRestored'
        ) NOT NULL,

        title varchar(200) NOT NULL,

        message text NOT NULL,

        metadata json NULL,

        is_read tinyint(1)
          NOT NULL
          DEFAULT 0,

        read_at timestamp(6) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_notifications_recipient (
          recipient_id,
          is_read,
          created_at
        ),

        CONSTRAINT fk_notifications_recipient
          FOREIGN KEY (
            recipient_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * AUDIT LOGS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id varchar(36) NOT NULL PRIMARY KEY,

        actor_id varchar(36) NULL,

        entity_type varchar(50) NOT NULL,

        entity_id varchar(36) NOT NULL,

        action ENUM(
          'Create',
          'Update',
          'Delete',
          'Approve',
          'Reject',
          'Assign',
          'Reassign',
          'StatusChange',
          'Login',
          'Logout',
          'LoginFailed',
          'AccountLocked',
          'AccountUnlocked',
          'Restore',
          'Archive'
        ) NOT NULL,

        old_value json NULL,

        new_value json NULL,

        reason text NULL,

        ip_address varchar(45) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_audit_entity (
          entity_type,
          entity_id
        ),

        INDEX idx_audit_actor_created (
          actor_id,
          created_at
        ),

        CONSTRAINT fk_audit_actor
          FOREIGN KEY (
            actor_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * REFRESH TOKENS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id varchar(36) NOT NULL PRIMARY KEY,

        user_id varchar(36) NOT NULL,

        token_hash varchar(255)
          NOT NULL
          UNIQUE,

        expires_at timestamp(6) NOT NULL,

        revoked_at timestamp(6) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_refresh_tokens_user (
          user_id
        ),

        CONSTRAINT fk_refresh_tokens_user
          FOREIGN KEY (
            user_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * USER SESSIONS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE user_sessions (
        id varchar(36) NOT NULL PRIMARY KEY,

        user_id varchar(36) NOT NULL,

        ip_address varchar(45) NULL,

        user_agent varchar(500) NULL,

        last_active_at timestamp(6) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        CONSTRAINT fk_user_sessions_user
          FOREIGN KEY (
            user_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * PASSWORD RESET TOKENS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE password_reset_tokens (
        id varchar(36) NOT NULL PRIMARY KEY,

        user_id varchar(36) NOT NULL,

        token_hash varchar(255)
          NOT NULL
          UNIQUE,

        expires_at timestamp(6) NOT NULL,

        used_at timestamp(6) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        INDEX idx_password_reset_tokens_user (
          user_id
        ),

        CONSTRAINT fk_password_reset_tokens_user
          FOREIGN KEY (
            user_id
          )
          REFERENCES users (
            id
          )
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * BRANDING SETTINGS
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE branding_settings (
        id varchar(36) NOT NULL PRIMARY KEY,

        site_name varchar(150)
          NOT NULL
          DEFAULT 'Task & Project Manager',

        logo_url varchar(255) NULL,

        favicon_url varchar(255) NULL,

        meta_title varchar(150) NULL,

        meta_description varchar(300) NULL,

        meta_keywords varchar(300) NULL,

        updated_by_id varchar(36) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * TASK WORKFLOW CONFIG
     * ========================================================
     */

    await queryRunner.query(`
      CREATE TABLE task_workflow_config (
        id varchar(36) NOT NULL PRIMARY KEY,

        mode varchar(30)
          NOT NULL
          DEFAULT 'all_available',

        actions json NOT NULL,

        updated_by varchar(36) NULL,

        created_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6),

        updated_at timestamp(6)
          NOT NULL
          DEFAULT CURRENT_TIMESTAMP(6)
          ON UPDATE CURRENT_TIMESTAMP(6)
      )
      ENGINE=InnoDB
      DEFAULT CHARSET=utf8mb4
    `);


    /*
     * ========================================================
     * DEFAULT TASK WORKFLOW
     * ========================================================
     */

    await queryRunner.query(
      `
        INSERT INTO task_workflow_config (
          id,
          mode,
          actions
        )
        VALUES (
          UUID(),
          'all_available',
          ?
        )
      `,
      [
        JSON.stringify([
          {
            key:
              'start',

            enabled:
              true,

            order:
              1,
          },

          {
            key:
              'submit_approval',

            enabled:
              true,

            order:
              2,
          },

          {
            key:
              'complete',

            enabled:
              true,

            order:
              3,
          },

          {
            key:
              'finish',

            enabled:
              true,

            order:
              4,
          },

          {
            key:
              'archive',

            enabled:
              true,

            order:
              5,
          },
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
          'PendingApproval',

        codeEn:
          'Pending Approval',

        codeAr:
          'بانتظار الموافقة',
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


    /*
     * ========================================================
     * INSERT BUILT-IN SETTINGS
     * ========================================================
     */

    for (
      const row
      of rows
    ) {
      await queryRunner.query(
        `
          INSERT INTO settings (
            id,
            type,
            code_ar,
            code_en,
            \`key\`,
            is_system,
            value_type,
            value_ar,
            value_en,
            is_active
          )
          VALUES (
            UUID(),
            ?,
            ?,
            ?,
            ?,
            1,
            'string',
            ?,
            ?,
            1
          )
        `,
        [
          row.type,

          row.codeAr,

          row.codeEn,

          row.key,

          /*
           * Correct:
           *
           * Arabic goes into value_ar.
           */
          row.codeAr,

          /*
           * English goes into value_en.
           */
          row.codeEn,
        ],
      );
    }
  }


  /*
   * ==========================================================
   * DOWN
   * ==========================================================
   */

  public async down(
    queryRunner:
      QueryRunner,
  ): Promise<void> {
    /*
     * Drop in reverse FK dependency order.
     */

    await queryRunner.query(`
      DROP TABLE IF EXISTS task_workflow_config
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS branding_settings
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS password_reset_tokens
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS user_sessions
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS refresh_tokens
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS audit_logs
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS notifications
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS task_attachments
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS task_comments
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS task_ratings
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS assignment_approvals
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS task_assignments
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS tasks
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS projects
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS users
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS settings
    `);


    await queryRunner.query(`
      DROP TABLE IF EXISTS roles
    `);
  }
}