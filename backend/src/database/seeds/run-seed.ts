import 'reflect-metadata';

import * as bcrypt from 'bcryptjs';

import {
  randomUUID,
} from 'crypto';

import {
  AppDataSource,
} from '../data-source';


/*
 * ============================================================
 * DEVELOPMENT SEED
 * ============================================================
 *
 * Designed for a fresh database after:
 *
 * npm run migration:run
 *
 * Creates:
 *
 * - ADMIN / USER roles
 * - branches
 * - departments
 * - branding
 * - 1 admin
 * - 7 normal users
 * - projects
 * - parent tasks
 * - subtasks
 * - assignments
 * - approvals
 * - comments
 * - ratings
 * - notifications
 * - audit logs
 *
 * Does NOT create fake:
 *
 * - refresh tokens
 * - password reset tokens
 * - user sessions
 *
 * Those should be generated naturally by the application.
 * ============================================================
 */


const PASSWORD =
  process.env.SEED_USER_PASSWORD ||
  'Passw0rd!123';


/*
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

function dateOnly(
  offsetDays:
    number,
): string {
  const date =
    new Date();

  date.setDate(
    date.getDate() +
      offsetDays,
  );

  return date
    .toISOString()
    .slice(
      0,
      10,
    );
}


function dateTime(
  offsetDays:
    number,

  offsetHours =
    0,
): Date {
  const date =
    new Date();

  date.setDate(
    date.getDate() +
      offsetDays,
  );

  date.setHours(
    date.getHours() +
      offsetHours,
  );

  return date;
}


/*
 * ============================================================
 * MAIN
 * ============================================================
 */

async function run() {
  console.log('');
  console.log(
    '============================================================',
  );
  console.log(
    ' Task & Project Manager - Full Development Seed',
  );
  console.log(
    '============================================================',
  );
  console.log('');


  await AppDataSource.initialize();


  const queryRunner =
    AppDataSource.createQueryRunner();


  await queryRunner.connect();


  await queryRunner.startTransaction();


  try {
    /*
     * ========================================================
     * SAFETY CHECK
     * ========================================================
     *
     * This seed is meant for a fresh DB.
     *
     * We deliberately refuse to run over existing Users.
     * ========================================================
     */

    const [
      existingUsers,
    ] =
      await queryRunner.query(
        `
          SELECT COUNT(*) AS count
          FROM users
        `,
      );


    if (
      Number(
        existingUsers.count,
      ) >
      0
    ) {
      throw new Error(
        [
          '',
          'Seed stopped because the users table already contains data.',
          '',
          'Use a fresh database before running this development seed.',
          '',
          'Recommended:',
          '',
          '1. Drop task_pm_system',
          '2. Create task_pm_system again',
          '3. npm run migration:run',
          '4. npm run seed',
          '',
        ].join(
          '\n',
        ),
      );
    }


    /*
     * ========================================================
     * PASSWORD
     * ========================================================
     */

    console.log(
      'Hashing development password...',
    );


    const passwordHash =
      await bcrypt.hash(
        PASSWORD,
        12,
      );


    /*
     * ========================================================
     * IDS
     * ========================================================
     */

    const ids = {
      /*
       * Roles
       */
      adminRole:
        randomUUID(),

      userRole:
        randomUUID(),


      /*
       * Branches
       */
      headquarters:
        randomUUID(),

      northBranch:
        randomUUID(),

      southBranch:
        randomUUID(),


      /*
       * Departments
       */
      management:
        randomUUID(),

      operations:
        randomUUID(),

      finance:
        randomUUID(),

      humanResources:
        randomUUID(),

      technology:
        randomUUID(),


      /*
       * Users
       */
      admin:
        randomUUID(),

      ahmed:
        randomUUID(),

      sarah:
        randomUUID(),

      omar:
        randomUUID(),

      laila:
        randomUUID(),

      khaled:
        randomUUID(),

      noor:
        randomUUID(),

      yusuf:
        randomUUID(),


      /*
       * Projects
       */
      websiteProject:
        randomUUID(),

      officeProject:
        randomUUID(),

      hrProject:
        randomUUID(),

      financeProject:
        randomUUID(),

      infrastructureProject:
        randomUUID(),


      /*
       * Tasks
       */
      websiteParent:
        randomUUID(),

      websiteDesign:
        randomUUID(),

      websiteApi:
        randomUUID(),

      websiteTesting:
        randomUUID(),

      budgetTask:
        randomUUID(),

      hiringTask:
        randomUUID(),

      serverTask:
        randomUUID(),

      policiesTask:
        randomUUID(),

      reportTask:
        randomUUID(),

      unassignedTask:
        randomUUID(),

      completedTask:
        randomUUID(),

      approvalTask:
        randomUUID(),

      archivedTask:
        randomUUID(),

      overdueTask:
        randomUUID(),

      reopenedTask:
        randomUUID(),


      /*
       * Assignments
       */
      websiteDesignAssignment:
        randomUUID(),

      websiteApiAssignment:
        randomUUID(),

      testingAssignment:
        randomUUID(),

      budgetAssignment:
        randomUUID(),

      hiringAssignment:
        randomUUID(),

      serverAssignment:
        randomUUID(),

      policiesAssignment:
        randomUUID(),

      reportAssignment:
        randomUUID(),

      completedAssignment:
        randomUUID(),

      approvalAssignment:
        randomUUID(),

      overdueAssignment:
        randomUUID(),

      reopenedAssignment:
        randomUUID(),
    };


    /*
     * ========================================================
     * ROLES
     * ========================================================
     */

    console.log(
      'Creating Roles...',
    );


    await queryRunner.query(
      `
        INSERT INTO roles (
          id,
          name,
          description,
          permissions
        )
        VALUES (
          ?,
          'ADMIN',
          'Full administrative access',
          ?
        )
      `,
      [
        ids.adminRole,

        JSON.stringify({
          manageUsers:
            true,

          manageSettings:
            true,

          manageProjects:
            true,

          manageTasks:
            true,

          viewAuditLog:
            true,

          manageWorkflow:
            true,
        }),
      ],
    );


    await queryRunner.query(
      `
        INSERT INTO roles (
          id,
          name,
          description,
          permissions
        )
        VALUES (
          ?,
          'USER',
          'Standard authenticated user',
          ?
        )
      `,
      [
        ids.userRole,

        JSON.stringify({
          manageUsers:
            false,

          manageSettings:
            false,

          manageProjects:
            false,

          manageTasks:
            true,

          viewAuditLog:
            false,

          manageWorkflow:
            false,
        }),
      ],
    );


    console.log(
      '  ✓ ADMIN',
    );

    console.log(
      '  ✓ USER',
    );


    /*
     * ========================================================
     * BRANCHES
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Branches...',
    );


    const branches = [
      {
        id:
          ids.headquarters,

        codeEn:
          'HQ',

        codeAr:
          'الرئيسي',

        valueEn:
          'Headquarters',

        valueAr:
          'المقر الرئيسي',

        address:
          'Main Office',
      },

      {
        id:
          ids.northBranch,

        codeEn:
          'NORTH',

        codeAr:
          'الشمال',

        valueEn:
          'North Branch',

        valueAr:
          'فرع الشمال',

        address:
          'North District',
      },

      {
        id:
          ids.southBranch,

        codeEn:
          'SOUTH',

        codeAr:
          'الجنوب',

        valueEn:
          'South Branch',

        valueAr:
          'فرع الجنوب',

        address:
          'South District',
      },
    ];


    for (
      const branch
      of branches
    ) {
      await queryRunner.query(
        `
          INSERT INTO settings (
            id,
            type,
            code_ar,
            code_en,
            value_type,
            value_ar,
            value_en,
            address,
            is_system,
            is_admin_department,
            is_active
          )
          VALUES (
            ?,
            'branch',
            ?,
            ?,
            'string',
            ?,
            ?,
            ?,
            0,
            0,
            1
          )
        `,
        [
          branch.id,
          branch.codeAr,
          branch.codeEn,
          branch.valueAr,
          branch.valueEn,
          branch.address,
        ],
      );
    }


    console.log(
      '  ✓ Headquarters',
    );

    console.log(
      '  ✓ North Branch',
    );

    console.log(
      '  ✓ South Branch',
    );


    /*
     * ========================================================
     * DEPARTMENTS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Departments...',
    );


    const departments = [
      {
        id:
          ids.management,

        codeEn:
          'MANAGEMENT',

        codeAr:
          'الإدارة',

        valueEn:
          'Management',

        valueAr:
          'الإدارة',
      },

      {
        id:
          ids.operations,

        codeEn:
          'OPERATIONS',

        codeAr:
          'العمليات',

        valueEn:
          'Operations',

        valueAr:
          'العمليات',
      },

      {
        id:
          ids.finance,

        codeEn:
          'FINANCE',

        codeAr:
          'المالية',

        valueEn:
          'Finance',

        valueAr:
          'المالية',
      },

      {
        id:
          ids.humanResources,

        codeEn:
          'HR',

        codeAr:
          'الموارد البشرية',

        valueEn:
          'Human Resources',

        valueAr:
          'الموارد البشرية',
      },

      {
        id:
          ids.technology,

        codeEn:
          'TECHNOLOGY',

        codeAr:
          'تقنية المعلومات',

        valueEn:
          'Technology',

        valueAr:
          'تقنية المعلومات',
      },
    ];


    for (
      const department
      of departments
    ) {
      await queryRunner.query(
        `
          INSERT INTO settings (
            id,
            type,
            code_ar,
            code_en,
            value_type,
            value_ar,
            value_en,
            is_system,
            is_admin_department,
            is_active
          )
          VALUES (
            ?,
            'department',
            ?,
            ?,
            'string',
            ?,
            ?,
            0,
            0,
            1
          )
        `,
        [
          department.id,
          department.codeAr,
          department.codeEn,
          department.valueAr,
          department.valueEn,
        ],
      );
    }


    console.log(
      '  ✓ Management',
    );

    console.log(
      '  ✓ Operations',
    );

    console.log(
      '  ✓ Finance',
    );

    console.log(
      '  ✓ Human Resources',
    );

    console.log(
      '  ✓ Technology',
    );


    /*
     * ========================================================
     * USERS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Users...',
    );


    const users = [
      {
        id:
          ids.admin,

        fullName:
          'System Administrator',

        email:
          'admin@taskmanager.com',

        phone:
          null,

        roleId:
          ids.adminRole,

        departmentId:
          null,

        branchId:
          ids.headquarters,
      },

      {
        id:
          ids.ahmed,

        fullName:
          'Ahmed Hassan',

        email:
          'ahmed@taskmanager.com',

        phone:
          '+966500000001',

        roleId:
          ids.userRole,

        departmentId:
          ids.management,

        branchId:
          ids.headquarters,
      },

      {
        id:
          ids.sarah,

        fullName:
          'Sarah Khalid',

        email:
          'sarah@taskmanager.com',

        phone:
          '+966500000002',

        roleId:
          ids.userRole,

        departmentId:
          ids.operations,

        branchId:
          ids.headquarters,
      },

      {
        id:
          ids.omar,

        fullName:
          'Omar Ali',

        email:
          'omar@taskmanager.com',

        phone:
          '+966500000003',

        roleId:
          ids.userRole,

        departmentId:
          ids.technology,

        branchId:
          ids.northBranch,
      },

      {
        id:
          ids.laila,

        fullName:
          'Laila Mohammed',

        email:
          'laila@taskmanager.com',

        phone:
          '+966500000004',

        roleId:
          ids.userRole,

        departmentId:
          ids.finance,

        branchId:
          ids.headquarters,
      },

      {
        id:
          ids.khaled,

        fullName:
          'Khaled Ibrahim',

        email:
          'khaled@taskmanager.com',

        phone:
          '+966500000005',

        roleId:
          ids.userRole,

        departmentId:
          ids.humanResources,

        branchId:
          ids.southBranch,
      },

      {
        id:
          ids.noor,

        fullName:
          'Noor Salem',

        email:
          'noor@taskmanager.com',

        phone:
          '+966500000006',

        roleId:
          ids.userRole,

        departmentId:
          ids.operations,

        branchId:
          ids.southBranch,
      },

      {
        id:
          ids.yusuf,

        fullName:
          'Yusuf Nasser',

        email:
          'yusuf@taskmanager.com',

        phone:
          '+966500000007',

        roleId:
          ids.userRole,

        departmentId:
          ids.technology,

        branchId:
          ids.headquarters,
      },
    ];


    for (
      const user
      of users
    ) {
      await queryRunner.query(
        `
          INSERT INTO users (
            id,
            full_name,
            email,
            password_hash,
            phone,
            role_id,
            department_id,
            branch_id,
            is_active,
            failed_login_attempts,
            locale,
            timezone,
            version
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            1,
            0,
            'en',
            'UTC',
            1
          )
        `,
        [
          user.id,
          user.fullName,
          user.email,
          passwordHash,
          user.phone,
          user.roleId,
          user.departmentId,
          user.branchId,
        ],
      );
    }


    console.log(
      `  ✓ ${users.length} Users`,
    );


    /*
     * ========================================================
     * VERIFY USER ROLE RELATIONS
     * ========================================================
     */

    const roleVerification =
      await queryRunner.query(
        `
          SELECT
            u.email,
            u.role_id,
            r.name AS role_name
          FROM users u
          INNER JOIN roles r
            ON r.id = u.role_id
        `,
      );


    if (
      roleVerification.length !==
      users.length
    ) {
      throw new Error(
        'User/Role verification failed.',
      );
    }


    for (
      const user
      of roleVerification
    ) {
      if (
        !user.role_id ||
        !user.role_name
      ) {
        throw new Error(
          `Invalid Role relation for ${user.email}`,
        );
      }
    }


    console.log(
      '  ✓ User/Role relations verified',
    );


    /*
     * ========================================================
     * BRANDING
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Branding...',
    );


    await queryRunner.query(
      `
        INSERT INTO branding_settings (
          id,
          site_name,
          meta_title,
          meta_description,
          meta_keywords,
          updated_by_id
        )
        VALUES (
          ?,
          'Task & Project Manager',
          'Task & Project Manager',
          'Manage projects, tasks, assignments and workflows',
          'tasks,projects,workflow,management',
          ?
        )
      `,
      [
        randomUUID(),
        ids.admin,
      ],
    );


    console.log(
      '  ✓ Branding',
    );


    /*
     * ========================================================
     * PROJECTS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Projects...',
    );


    const projects = [
      {
        id:
          ids.websiteProject,

        name:
          'Corporate Website Upgrade',

        description:
          'Redesign and modernize the company website.',

        status:
          'Active',

        startDate:
          dateOnly(
            -20,
          ),

        endDate:
          dateOnly(
            30,
          ),

        createdBy:
          ids.admin,
      },

      {
        id:
          ids.officeProject,

        name:
          'Office Operations Improvement',

        description:
          'Improve internal operational processes and facilities.',

        status:
          'Active',

        startDate:
          dateOnly(
            -10,
          ),

        endDate:
          dateOnly(
            45,
          ),

        createdBy:
          ids.admin,
      },

      {
        id:
          ids.hrProject,

        name:
          '2026 Recruitment Campaign',

        description:
          'Recruitment and onboarding program for new employees.',

        status:
          'Active',

        startDate:
          dateOnly(
            -30,
          ),

        endDate:
          dateOnly(
            60,
          ),

        createdBy:
          ids.admin,
      },

      {
        id:
          ids.financeProject,

        name:
          'Financial Controls Review',

        description:
          'Review budgets and financial approval processes.',

        status:
          'Planned',

        startDate:
          dateOnly(
            5,
          ),

        endDate:
          dateOnly(
            70,
          ),

        createdBy:
          ids.admin,
      },

      {
        id:
          ids.infrastructureProject,

        name:
          'IT Infrastructure Refresh',

        description:
          'Upgrade servers, networking and internal infrastructure.',

        status:
          'Active',

        startDate:
          dateOnly(
            -15,
          ),

        endDate:
          dateOnly(
            40,
          ),

        createdBy:
          ids.admin,
      },
    ];


    for (
      const project
      of projects
    ) {
      await queryRunner.query(
        `
          INSERT INTO projects (
            id,
            name,
            description,
            status,
            start_date,
            end_date,
            created_by,
            version
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            1
          )
        `,
        [
          project.id,
          project.name,
          project.description,
          project.status,
          project.startDate,
          project.endDate,
          project.createdBy,
        ],
      );
    }


    console.log(
      `  ✓ ${projects.length} Projects`,
    );


    /*
     * ========================================================
     * TASK CREATION HELPER
     * ========================================================
     */

    async function createTask(
      options: {
        id:
          string;

        titleEn:
          string;

        titleAr:
          string;

        descriptionEn?:
          string;

        descriptionAr?:
          string;

        taskType?:
          string;

        priority?:
          string;

        status?:
          string;

        color?:
          string;

        branchId?:
          string | null;

        departmentId?:
          string | null;

        projectId?:
          string | null;

        assignedToId?:
          string | null;

        createdById:
          string;

        needsApproval?:
          boolean;

        approverId?:
          string | null;

        approvalStatus?:
          string;

        rejectionReason?:
          string | null;

        needsBudget?:
          boolean;

        budgetMin?:
          string | null;

        budgetMax?:
          string | null;

        budgetCurrency?:
          string | null;

        startDate?:
          string | null;

        deadlineDate?:
          string | null;

        actualEndDate?:
          Date | null;

        parentTaskId?:
          string | null;

        archivedAt?:
          Date | null;

        assigneeCanDownloadAttachments?:
          boolean;

        statusBeforeArchive?:
          string | null;
      },
    ) {
      await queryRunner.query(
        `
          INSERT INTO tasks (
            id,
            title_ar,
            title_en,
            description_ar,
            description_en,
            task_type,
            priority,
            status,
            color,
            branch_id,
            department_id,
            project_id,
            assigned_to_id,
            created_by,
            needs_approval,
            approver_id,
            approval_status,
            rejection_reason,
            needs_budget,
            budget_min,
            budget_max,
            budget_currency,
            start_date,
            deadline_date,
            actual_end_date,
            parent_task_id,
            archived_at,
            version,
            assignee_can_download_attachments,
            status_before_archive
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            1,
            ?,
            ?
          )
        `,
        [
          options.id,
          options.titleAr,
          options.titleEn,
          options.descriptionAr ??
            null,
          options.descriptionEn ??
            null,
          options.taskType ??
            'General',
          options.priority ??
            'Medium',
          options.status ??
            'Pending',
          options.color ??
            null,
          options.branchId ??
            null,
          options.departmentId ??
            null,
          options.projectId ??
            null,
          options.assignedToId ??
            null,
          options.createdById,
          options.needsApproval
            ? 1
            : 0,
          options.approverId ??
            null,
          options.approvalStatus ??
            'NotRequired',
          options.rejectionReason ??
            null,
          options.needsBudget
            ? 1
            : 0,
          options.budgetMin ??
            null,
          options.budgetMax ??
            null,
          options.budgetCurrency ??
            'SAR',
          options.startDate ??
            null,
          options.deadlineDate ??
            null,
          options.actualEndDate ??
            null,
          options.parentTaskId ??
            null,
          options.archivedAt ??
            null,
          options.assigneeCanDownloadAttachments ===
          false
            ? 0
            : 1,
          options.statusBeforeArchive ??
            null,
        ],
      );
    }


    /*
     * ========================================================
     * TASKS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Tasks and Subtasks...',
    );


    /*
     * Parent task
     */
    await createTask({
      id:
        ids.websiteParent,

      titleEn:
        'Launch redesigned corporate website',

      titleAr:
        'إطلاق الموقع المؤسسي الجديد',

      descriptionEn:
        'Parent task containing the complete website delivery plan.',

      descriptionAr:
        'المهمة الرئيسية لخطة تطوير وإطلاق الموقع.',

      taskType:
        'Technical',

      priority:
        'High',

      status:
        'InProgress',

      projectId:
        ids.websiteProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.technology,

      assignedToId:
        ids.omar,

      createdById:
        ids.admin,

      startDate:
        dateOnly(
          -12,
        ),

      deadlineDate:
        dateOnly(
          21,
        ),
    });


    /*
     * Child 1
     */
    await createTask({
      id:
        ids.websiteDesign,

      titleEn:
        'Complete website UI design',

      titleAr:
        'إكمال تصميم واجهة الموقع',

      descriptionEn:
        'Finalize responsive page designs and reusable UI components.',

      taskType:
        'Technical',

      priority:
        'High',

      status:
        'InProgress',

      projectId:
        ids.websiteProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.technology,

      assignedToId:
        ids.yusuf,

      createdById:
        ids.omar,

      parentTaskId:
        ids.websiteParent,

      startDate:
        dateOnly(
          -8,
        ),

      deadlineDate:
        dateOnly(
          8,
        ),
    });


    /*
     * Child 2
     */
    await createTask({
      id:
        ids.websiteApi,

      titleEn:
        'Implement website API integration',

      titleAr:
        'تنفيذ تكامل واجهة برمجة الموقع',

      descriptionEn:
        'Connect frontend pages to content and backend APIs.',

      taskType:
        'Technical',

      priority:
        'Critical',

      status:
        'InProgress',

      projectId:
        ids.websiteProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.technology,

      assignedToId:
        ids.omar,

      createdById:
        ids.admin,

      parentTaskId:
        ids.websiteParent,

      startDate:
        dateOnly(
          -5,
        ),

      deadlineDate:
        dateOnly(
          12,
        ),
    });


    /*
     * Child 3
     */
    await createTask({
      id:
        ids.websiteTesting,

      titleEn:
        'Website QA and browser testing',

      titleAr:
        'اختبار جودة الموقع والمتصفحات',

      descriptionEn:
        'Test responsive layouts, forms and browser compatibility.',

      taskType:
        'Technical',

      priority:
        'Medium',

      status:
        'Pending',

      projectId:
        ids.websiteProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.technology,

      assignedToId:
        ids.noor,

      createdById:
        ids.omar,

      parentTaskId:
        ids.websiteParent,

      startDate:
        dateOnly(
          6,
        ),

      deadlineDate:
        dateOnly(
          18,
        ),
    });


    /*
     * Budget task
     */
    await createTask({
      id:
        ids.budgetTask,

      titleEn:
        'Prepare Q4 operational budget',

      titleAr:
        'إعداد ميزانية التشغيل للربع الرابع',

      descriptionEn:
        'Prepare expected operational spending and supporting breakdown.',

      taskType:
        'Financial',

      priority:
        'High',

      status:
        'InProgress',

      projectId:
        ids.financeProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.finance,

      assignedToId:
        ids.laila,

      createdById:
        ids.admin,

      needsBudget:
        true,

      budgetMin:
        '75000.00',

      budgetMax:
        '120000.00',

      budgetCurrency:
        'SAR',

      startDate:
        dateOnly(
          -3,
        ),

      deadlineDate:
        dateOnly(
          14,
        ),
    });


    /*
     * HR task
     */
    await createTask({
      id:
        ids.hiringTask,

      titleEn:
        'Prepare candidate interview schedule',

      titleAr:
        'إعداد جدول مقابلات المرشحين',

      taskType:
        'HR',

      priority:
        'Medium',

      status:
        'Pending',

      projectId:
        ids.hrProject,

      branchId:
        ids.southBranch,

      departmentId:
        ids.humanResources,

      assignedToId:
        ids.khaled,

      createdById:
        ids.admin,

      startDate:
        dateOnly(
          0,
        ),

      deadlineDate:
        dateOnly(
          10,
        ),
    });


    /*
     * Technical/server task
     */
    await createTask({
      id:
        ids.serverTask,

      titleEn:
        'Upgrade internal application server',

      titleAr:
        'ترقية خادم التطبيقات الداخلي',

      taskType:
        'Maintenance',

      priority:
        'Critical',

      status:
        'InProgress',

      projectId:
        ids.infrastructureProject,

      branchId:
        ids.northBranch,

      departmentId:
        ids.technology,

      assignedToId:
        ids.omar,

      createdById:
        ids.admin,

      startDate:
        dateOnly(
          -7,
        ),

      deadlineDate:
        dateOnly(
          5,
        ),

      assigneeCanDownloadAttachments:
        false,
    });


    /*
     * Administrative task
     */
    await createTask({
      id:
        ids.policiesTask,

      titleEn:
        'Update internal operating procedures',

      titleAr:
        'تحديث إجراءات العمل الداخلية',

      taskType:
        'Administrative',

      priority:
        'Medium',

      status:
        'InProgress',

      projectId:
        ids.officeProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.management,

      assignedToId:
        ids.ahmed,

      createdById:
        ids.admin,

      deadlineDate:
        dateOnly(
          20,
        ),
    });


    /*
     * Reporting task
     */
    await createTask({
      id:
        ids.reportTask,

      titleEn:
        'Prepare weekly operations report',

      titleAr:
        'إعداد تقرير العمليات الأسبوعي',

      taskType:
        'Administrative',

      priority:
        'Low',

      status:
        'Pending',

      projectId:
        ids.officeProject,

      branchId:
        ids.southBranch,

      departmentId:
        ids.operations,

      assignedToId:
        ids.sarah,

      createdById:
        ids.admin,

      deadlineDate:
        dateOnly(
          4,
        ),
    });


    /*
     * Unassigned
     */
    await createTask({
      id:
        ids.unassignedTask,

      titleEn:
        'Review office supply requirements',

      titleAr:
        'مراجعة احتياجات المستلزمات المكتبية',

      taskType:
        'Procurement',

      priority:
        'Low',

      status:
        'Unassigned',

      projectId:
        ids.officeProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.operations,

      assignedToId:
        null,

      createdById:
        ids.admin,

      deadlineDate:
        dateOnly(
          17,
        ),
    });


    /*
     * Completed
     */
    await createTask({
      id:
        ids.completedTask,

      titleEn:
        'Complete monthly expense reconciliation',

      titleAr:
        'إكمال مطابقة المصروفات الشهرية',

      taskType:
        'Financial',

      priority:
        'Medium',

      status:
        'Completed',

      projectId:
        ids.financeProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.finance,

      assignedToId:
        ids.laila,

      createdById:
        ids.admin,

      startDate:
        dateOnly(
          -14,
        ),

      deadlineDate:
        dateOnly(
          -3,
        ),

      actualEndDate:
        dateTime(
          -4,
        ),
    });


    /*
     * Pending approval
     */
    await createTask({
      id:
        ids.approvalTask,

      titleEn:
        'Approve new recruitment advertising budget',

      titleAr:
        'الموافقة على ميزانية إعلانات التوظيف',

      taskType:
        'Financial',

      priority:
        'High',

      status:
        'PendingApproval',

      projectId:
        ids.hrProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.humanResources,

      assignedToId:
        ids.khaled,

      createdById:
        ids.admin,

      needsApproval:
        true,

      approverId:
        ids.admin,

      approvalStatus:
        'Pending',

      needsBudget:
        true,

      budgetMin:
        '15000.00',

      budgetMax:
        '25000.00',

      budgetCurrency:
        'SAR',

      deadlineDate:
        dateOnly(
          7,
        ),
    });


    /*
     * Archived
     */
    await createTask({
      id:
        ids.archivedTask,

      titleEn:
        'Old printer replacement review',

      titleAr:
        'مراجعة استبدال الطابعات القديمة',

      taskType:
        'Procurement',

      priority:
        'Low',

      status:
        'Archived',

      projectId:
        ids.officeProject,

      branchId:
        ids.headquarters,

      departmentId:
        ids.operations,

      createdById:
        ids.admin,

      archivedAt:
        dateTime(
          -2,
        ),

      statusBeforeArchive:
        'Completed',
    });


    /*
     * Overdue
     *
     * Kept InProgress with deadline in past.
     * The app can determine overdue from the date.
     */
    await createTask({
      id:
        ids.overdueTask,

      titleEn:
        'Complete network inventory',

      titleAr:
        'إكمال جرد معدات الشبكة',

      taskType:
        'Technical',

      priority:
        'High',

      status:
        'InProgress',

      projectId:
        ids.infrastructureProject,

      branchId:
        ids.northBranch,

      departmentId:
        ids.technology,

      assignedToId:
        ids.yusuf,

      createdById:
        ids.admin,

      startDate:
        dateOnly(
          -15,
        ),

      deadlineDate:
        dateOnly(
          -2,
        ),
    });


    /*
     * Reopened
     */
    await createTask({
      id:
        ids.reopenedTask,

      titleEn:
        'Correct employee onboarding checklist',

      titleAr:
        'تصحيح قائمة إجراءات انضمام الموظفين',

      taskType:
        'HR',

      priority:
        'Medium',

      status:
        'Reopened',

      projectId:
        ids.hrProject,

      branchId:
        ids.southBranch,

      departmentId:
        ids.humanResources,

      assignedToId:
        ids.khaled,

      createdById:
        ids.admin,

      deadlineDate:
        dateOnly(
          6,
        ),
    });


    console.log(
      '  ✓ 15 Tasks',
    );

    console.log(
      '  ✓ Parent task with 3 Subtasks',
    );


    /*
     * ========================================================
     * ASSIGNMENTS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Task Assignments...',
    );


    const assignments = [
      {
        id:
          ids.websiteDesignAssignment,

        taskId:
          ids.websiteDesign,

        assigneeId:
          ids.yusuf,

        assignedBy:
          ids.omar,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            8,
          ),

        acceptedAt:
          dateTime(
            -6,
          ),
      },

      {
        id:
          ids.websiteApiAssignment,

        taskId:
          ids.websiteApi,

        assigneeId:
          ids.omar,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            12,
          ),

        acceptedAt:
          dateTime(
            -4,
          ),
      },

      {
        id:
          ids.testingAssignment,

        taskId:
          ids.websiteTesting,

        assigneeId:
          ids.noor,

        assignedBy:
          ids.omar,

        status:
          'PendingAcceptance',

        dueDate:
          dateOnly(
            18,
          ),

        acceptedAt:
          null,
      },

      {
        id:
          ids.budgetAssignment,

        taskId:
          ids.budgetTask,

        assigneeId:
          ids.laila,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            14,
          ),

        acceptedAt:
          dateTime(
            -2,
          ),
      },

      {
        id:
          ids.hiringAssignment,

        taskId:
          ids.hiringTask,

        assigneeId:
          ids.khaled,

        assignedBy:
          ids.admin,

        status:
          'PendingAcceptance',

        dueDate:
          dateOnly(
            10,
          ),

        acceptedAt:
          null,
      },

      {
        id:
          ids.serverAssignment,

        taskId:
          ids.serverTask,

        assigneeId:
          ids.omar,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            5,
          ),

        acceptedAt:
          dateTime(
            -6,
          ),
      },

      {
        id:
          ids.policiesAssignment,

        taskId:
          ids.policiesTask,

        assigneeId:
          ids.ahmed,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            20,
          ),

        acceptedAt:
          dateTime(
            -1,
          ),
      },

      {
        id:
          ids.reportAssignment,

        taskId:
          ids.reportTask,

        assigneeId:
          ids.sarah,

        assignedBy:
          ids.admin,

        status:
          'PendingAcceptance',

        dueDate:
          dateOnly(
            4,
          ),

        acceptedAt:
          null,
      },

      {
        id:
          ids.completedAssignment,

        taskId:
          ids.completedTask,

        assigneeId:
          ids.laila,

        assignedBy:
          ids.admin,

        status:
          'Completed',

        dueDate:
          dateOnly(
            -3,
          ),

        acceptedAt:
          dateTime(
            -13,
          ),
      },

      {
        id:
          ids.approvalAssignment,

        taskId:
          ids.approvalTask,

        assigneeId:
          ids.khaled,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            7,
          ),

        acceptedAt:
          dateTime(
            -1,
          ),
      },

      {
        id:
          ids.overdueAssignment,

        taskId:
          ids.overdueTask,

        assigneeId:
          ids.yusuf,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            -2,
          ),

        acceptedAt:
          dateTime(
            -14,
          ),
      },

      {
        id:
          ids.reopenedAssignment,

        taskId:
          ids.reopenedTask,

        assigneeId:
          ids.khaled,

        assignedBy:
          ids.admin,

        status:
          'Accepted',

        dueDate:
          dateOnly(
            6,
          ),

        acceptedAt:
          dateTime(
            -2,
          ),
      },
    ];


    for (
      const assignment
      of assignments
    ) {
      await queryRunner.query(
        `
          INSERT INTO task_assignments (
            id,
            task_id,
            assignee_id,
            assigned_by,
            status,
            due_date,
            accepted_at,
            version
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            1
          )
        `,
        [
          assignment.id,
          assignment.taskId,
          assignment.assigneeId,
          assignment.assignedBy,
          assignment.status,
          assignment.dueDate,
          assignment.acceptedAt,
        ],
      );
    }


    console.log(
      `  ✓ ${assignments.length} Assignments`,
    );


    /*
     * ========================================================
     * ASSIGNMENT APPROVAL HISTORY
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Assignment Approval history...',
    );


    await queryRunner.query(
      `
        INSERT INTO assignment_approvals (
          id,
          assignment_id,
          approver_id,
          decision,
          reason,
          decided_at
        )
        VALUES (
          ?,
          ?,
          ?,
          'Approved',
          'Assignment approved for execution.',
          ?
        )
      `,
      [
        randomUUID(),
        ids.websiteApiAssignment,
        ids.admin,
        dateTime(
          -4,
          1,
        ),
      ],
    );


    await queryRunner.query(
      `
        INSERT INTO assignment_approvals (
          id,
          assignment_id,
          approver_id,
          decision,
          reason,
          decided_at
        )
        VALUES (
          ?,
          ?,
          ?,
          'Approved',
          'Budget work assignment approved.',
          ?
        )
      `,
      [
        randomUUID(),
        ids.budgetAssignment,
        ids.admin,
        dateTime(
          -2,
          1,
        ),
      ],
    );


    console.log(
      '  ✓ Approval history',
    );


    /*
     * ========================================================
     * COMMENTS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Comments...',
    );


    const comments = [
      {
        taskId:
          ids.websiteParent,

        authorId:
          ids.admin,

        content:
          'Please keep the child tasks updated as each milestone is completed.',
      },

      {
        taskId:
          ids.websiteDesign,

        authorId:
          ids.yusuf,

        content:
          'Homepage and dashboard designs are complete. Working on responsive states.',
      },

      {
        taskId:
          ids.websiteApi,

        authorId:
          ids.omar,

        content:
          'Authentication and project endpoints are integrated.',
      },

      {
        taskId:
          ids.budgetTask,

        authorId:
          ids.laila,

        content:
          'I have collected the major cost estimates and am reviewing vendor figures.',
      },

      {
        taskId:
          ids.serverTask,

        authorId:
          ids.omar,

        content:
          'Backup completed before the server upgrade.',
      },

      {
        taskId:
          ids.approvalTask,

        authorId:
          ids.khaled,

        content:
          'The recruitment campaign proposal is ready for approval.',
      },

      {
        taskId:
          ids.overdueTask,

        authorId:
          ids.yusuf,

        content:
          'Inventory is delayed because two switches are still being verified.',
      },

      {
        taskId:
          ids.reopenedTask,

        authorId:
          ids.khaled,

        content:
          'I am correcting the checklist based on the latest feedback.',
      },
    ];


    for (
      const comment
      of comments
    ) {
      await queryRunner.query(
        `
          INSERT INTO task_comments (
            id,
            task_id,
            author_id,
            content,
            is_edited
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            0
          )
        `,
        [
          randomUUID(),
          comment.taskId,
          comment.authorId,
          comment.content,
        ],
      );
    }


    console.log(
      `  ✓ ${comments.length} Comments`,
    );


    /*
     * ========================================================
     * RATINGS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Ratings...',
    );


    await queryRunner.query(
      `
        INSERT INTO task_ratings (
          id,
          task_id,
          rated_by,
          score,
          feedback
        )
        VALUES (
          ?,
          ?,
          ?,
          5,
          'Completed accurately and ahead of the final review.'
        )
      `,
      [
        randomUUID(),
        ids.completedTask,
        ids.admin,
      ],
    );


    console.log(
      '  ✓ Ratings',
    );


    /*
     * ========================================================
     * NOTIFICATIONS
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Notifications...',
    );


    const notifications = [
      {
        recipientId:
          ids.yusuf,

        type:
          'TaskAssigned',

        title:
          'New task assigned',

        message:
          'You were assigned to Complete website UI design.',

        metadata: {
          taskId:
            ids.websiteDesign,
        },

        isRead:
          0,
      },

      {
        recipientId:
          ids.omar,

        type:
          'TaskAssigned',

        title:
          'New task assigned',

        message:
          'You were assigned to Implement website API integration.',

        metadata: {
          taskId:
            ids.websiteApi,
        },

        isRead:
          1,
      },

      {
        recipientId:
          ids.noor,

        type:
          'TaskAssigned',

        title:
          'Assignment waiting for acceptance',

        message:
          'Website QA and browser testing is waiting for your response.',

        metadata: {
          taskId:
            ids.websiteTesting,
        },

        isRead:
          0,
      },

      {
        recipientId:
          ids.khaled,

        type:
          'TaskAssigned',

        title:
          'New HR task',

        message:
          'Prepare candidate interview schedule has been assigned to you.',

        metadata: {
          taskId:
            ids.hiringTask,
        },

        isRead:
          0,
      },

      {
        recipientId:
          ids.admin,

        type:
          'ApprovalRequested',

        title:
          'Approval requested',

        message:
          'Recruitment advertising budget is waiting for approval.',

        metadata: {
          taskId:
            ids.approvalTask,
        },

        isRead:
          0,
      },

      {
        recipientId:
          ids.yusuf,

        type:
          'TaskOverdue',

        title:
          'Task overdue',

        message:
          'Complete network inventory has passed its deadline.',

        metadata: {
          taskId:
            ids.overdueTask,
        },

        isRead:
          0,
      },

      {
        recipientId:
          ids.laila,

        type:
          'TaskCompleted',

        title:
          'Task completed',

        message:
          'Monthly expense reconciliation was marked completed.',

        metadata: {
          taskId:
            ids.completedTask,
        },

        isRead:
          1,
      },

      {
        recipientId:
          ids.khaled,

        type:
          'TaskReopened',

        title:
          'Task reopened',

        message:
          'Employee onboarding checklist has been reopened.',

        metadata: {
          taskId:
            ids.reopenedTask,
        },

        isRead:
          0,
      },
    ];


    for (
      const notification
      of notifications
    ) {
      await queryRunner.query(
        `
          INSERT INTO notifications (
            id,
            recipient_id,
            type,
            title,
            message,
            metadata,
            is_read,
            read_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          randomUUID(),
          notification.recipientId,
          notification.type,
          notification.title,
          notification.message,
          JSON.stringify(
            notification.metadata,
          ),
          notification.isRead,
          notification.isRead
            ? dateTime(
                -1,
              )
            : null,
        ],
      );
    }


    console.log(
      `  ✓ ${notifications.length} Notifications`,
    );


    /*
     * ========================================================
     * AUDIT LOG
     * ========================================================
     */

    console.log('');
    console.log(
      'Creating Audit Log...',
    );


    const auditLogs = [
      {
        actorId:
          ids.admin,

        entityType:
          'Project',

        entityId:
          ids.websiteProject,

        action:
          'Create',

        reason:
          'Project created by administrator',

        oldValue:
          null,

        newValue: {
          name:
            'Corporate Website Upgrade',

          status:
            'Active',
        },
      },

      {
        actorId:
          ids.admin,

        entityType:
          'Task',

        entityId:
          ids.websiteParent,

        action:
          'Create',

        reason:
          'Main project task created',

        oldValue:
          null,

        newValue: {
          status:
            'InProgress',

          priority:
            'High',
        },
      },

      {
        actorId:
          ids.omar,

        entityType:
          'Task',

        entityId:
          ids.websiteDesign,

        action:
          'Assign',

        reason:
          'Website design assigned to Yusuf',

        oldValue:
          null,

        newValue: {
          assignedToId:
            ids.yusuf,
        },
      },

      {
        actorId:
          ids.admin,

        entityType:
          'Task',

        entityId:
          ids.completedTask,

        action:
          'StatusChange',

        reason:
          'Task completed successfully',

        oldValue: {
          status:
            'InProgress',
        },

        newValue: {
          status:
            'Completed',
        },
      },

      {
        actorId:
          ids.admin,

        entityType:
          'Task',

        entityId:
          ids.reopenedTask,

        action:
          'StatusChange',

        reason:
          'Changes were requested after completion review',

        oldValue: {
          status:
            'Completed',
        },

        newValue: {
          status:
            'Reopened',
        },
      },

      {
        actorId:
          ids.admin,

        entityType:
          'Task',

        entityId:
          ids.archivedTask,

        action:
          'Archive',

        reason:
          'Old completed procurement task archived',

        oldValue: {
          status:
            'Completed',
        },

        newValue: {
          status:
            'Archived',
        },
      },
    ];


    for (
      const audit
      of auditLogs
    ) {
      await queryRunner.query(
        `
          INSERT INTO audit_logs (
            id,
            actor_id,
            entity_type,
            entity_id,
            action,
            old_value,
            new_value,
            reason,
            ip_address
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            '127.0.0.1'
          )
        `,
        [
          randomUUID(),
          audit.actorId,
          audit.entityType,
          audit.entityId,
          audit.action,
          audit.oldValue
            ? JSON.stringify(
                audit.oldValue,
              )
            : null,
          audit.newValue
            ? JSON.stringify(
                audit.newValue,
              )
            : null,
          audit.reason,
        ],
      );
    }


    console.log(
      `  ✓ ${auditLogs.length} Audit records`,
    );


    /*
     * ========================================================
     * FINAL COUNTS
     * ========================================================
     */

    console.log('');
    console.log(
      'Validating database...',
    );


    const tables = [
      'roles',
      'settings',
      'users',
      'projects',
      'tasks',
      'task_assignments',
      'assignment_approvals',
      'task_comments',
      'task_ratings',
      'notifications',
      'audit_logs',
      'branding_settings',
      'task_workflow_config',
    ];


    const counts:
      Record<
        string,
        number
      > =
      {};


    for (
      const table
      of tables
    ) {
      const [
        result,
      ] =
        await queryRunner.query(
          `
            SELECT COUNT(*) AS count
            FROM \`${table}\`
          `,
        );


      counts[
        table
      ] =
        Number(
          result.count,
        );
    }


    /*
     * Critical validation.
     */
    if (
      counts.roles !==
      2
    ) {
      throw new Error(
        `Expected 2 Roles, found ${counts.roles}.`,
      );
    }


    if (
      counts.users !==
      8
    ) {
      throw new Error(
        `Expected 8 Users, found ${counts.users}.`,
      );
    }


    if (
      counts.projects <
      5
    ) {
      throw new Error(
        'Project seed validation failed.',
      );
    }


    if (
      counts.tasks <
      15
    ) {
      throw new Error(
        'Task seed validation failed.',
      );
    }


    /*
     * Verify no broken User roles.
     */
    const [
      brokenRoles,
    ] =
      await queryRunner.query(
        `
          SELECT COUNT(*) AS count
          FROM users u

          LEFT JOIN roles r
            ON r.id = u.role_id

          WHERE
            u.role_id IS NULL
            OR r.id IS NULL
        `,
      );


    if (
      Number(
        brokenRoles.count,
      ) !==
      0
    ) {
      throw new Error(
        'One or more Users have an invalid Role relation.',
      );
    }


    /*
     * Verify task hierarchy.
     */
    const [
      subTaskCount,
    ] =
      await queryRunner.query(
        `
          SELECT COUNT(*) AS count
          FROM tasks
          WHERE parent_task_id IS NOT NULL
        `,
      );


    if (
      Number(
        subTaskCount.count,
      ) <
      3
    ) {
      throw new Error(
        'Subtask seed verification failed.',
      );
    }


    /*
     * ========================================================
     * COMMIT
     * ========================================================
     */

    await queryRunner.commitTransaction();


    /*
     * ========================================================
     * RESULT
     * ========================================================
     */

    console.log('');
    console.log(
      '============================================================',
    );

    console.log(
      ' FULL SEED COMPLETED SUCCESSFULLY',
    );

    console.log(
      '============================================================',
    );

    console.log('');


    for (
      const table
      of tables
    ) {
      console.log(
        `${table.padEnd(
          26,
          ' ',
        )} ${counts[
          table
        ]}`,
      );
    }


    console.log('');
    console.log(
      'Development login:',
    );

    console.log('');
    console.log(
      'ADMIN',
    );

    console.log(
      '  Email:    admin@taskmanager.com',
    );

    console.log(
      `  Password: ${PASSWORD}`,
    );


    console.log('');
    console.log(
      'USERS',
    );

    console.log(
      '  ahmed@taskmanager.com',
    );

    console.log(
      '  sarah@taskmanager.com',
    );

    console.log(
      '  omar@taskmanager.com',
    );

    console.log(
      '  laila@taskmanager.com',
    );

    console.log(
      '  khaled@taskmanager.com',
    );

    console.log(
      '  noor@taskmanager.com',
    );

    console.log(
      '  yusuf@taskmanager.com',
    );


    console.log('');
    console.log(
      `All accounts use: ${PASSWORD}`,
    );

    console.log('');
    console.log(
      'Demo data includes:',
    );

    console.log(
      '  ✓ Active Projects',
    );

    console.log(
      '  ✓ Planned Project',
    );

    console.log(
      '  ✓ Parent Task',
    );

    console.log(
      '  ✓ Subtasks',
    );

    console.log(
      '  ✓ Assigned Tasks',
    );

    console.log(
      '  ✓ Unassigned Task',
    );

    console.log(
      '  ✓ Pending Acceptance assignments',
    );

    console.log(
      '  ✓ Accepted assignments',
    );

    console.log(
      '  ✓ Completed Task',
    );

    console.log(
      '  ✓ Pending Approval Task',
    );

    console.log(
      '  ✓ Budget Task',
    );

    console.log(
      '  ✓ Overdue Task',
    );

    console.log(
      '  ✓ Reopened Task',
    );

    console.log(
      '  ✓ Archived Task',
    );

    console.log(
      '  ✓ Comments',
    );

    console.log(
      '  ✓ Rating',
    );

    console.log(
      '  ✓ Notifications',
    );

    console.log(
      '  ✓ Audit history',
    );

    console.log('');
  } catch (
    error
  ) {
    /*
     * One failure = no partial seed.
     */
    await queryRunner.rollbackTransaction();


    console.error('');
    console.error(
      '============================================================',
    );

    console.error(
      ' SEED FAILED - TRANSACTION ROLLED BACK',
    );

    console.error(
      '============================================================',
    );

    console.error('');

    console.error(
      error,
    );

    console.error('');


    throw error;
  } finally {
    await queryRunner.release();


    if (
      AppDataSource.isInitialized
    ) {
      await AppDataSource.destroy();
    }
  }
}


/*
 * ============================================================
 * EXECUTE
 * ============================================================
 */

run()
  .then(
    () => {
      process.exit(
        0,
      );
    },
  )
  .catch(
    () => {
      process.exit(
        1,
      );
    },
  );