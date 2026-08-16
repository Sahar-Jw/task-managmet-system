import 'reflect-metadata';

import * as bcrypt from 'bcrypt';

import {
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm';

import {
  AppDataSource,
} from '../data-source';

import {
  RoleEntity,
} from '../../modules/roles/entities/role.entity';

import {
  UserEntity,
} from '../../modules/users/entities/user.entity';

import {
  SettingEntity,
} from '../../modules/settings/entities/setting.entity';

import {
  TaskWorkflowConfigEntity,
} from '../../modules/task-workflow/entities/task-workflow-config.entity';

import {
  RoleName,
} from '../../shared/enums/role.enum';

import {
  SettingType,
} from '../../shared/enums/setting-type.enum';

import {
  SettingValueType,
} from '../../shared/enums/setting-value-type.enum';

import {
  TaskWorkflowActionKey,
  TaskWorkflowMode,
} from '../../shared/enums/task-workflow.enum';


/*
 * ============================================================
 * PASSWORD
 * ============================================================
 *
 * You can override this through:
 *
 * SEED_USER_PASSWORD=YourPassword
 *
 * Otherwise every seeded User gets:
 *
 * Passw0rd!123
 * ============================================================
 */

const SEED_PASSWORD =
  process.env.SEED_USER_PASSWORD ||
  'Passw0rd!123';


/*
 * ============================================================
 * UPSERT HELPER
 * ============================================================
 */

async function upsert<
  T extends ObjectLiteral,
>(
  repository:
    Repository<T>,

  where:
    FindOptionsWhere<T>,

  createData:
    () => DeepPartial<T>,
):
  Promise<T> {
  const existing =
    await repository.findOne({
      where,
    });


  if (
    existing
  ) {
    return existing;
  }


  const entity:
    T =
    repository.create(
      createData(),
    );


  const saved:
    T =
    await repository.save(
      entity,
    );


  return saved;
}


/*
 * ============================================================
 * SEED
 * ============================================================
 */

async function run() {
  console.log(
    '\n==============================================',
  );

  console.log(
    ' Task & Project Manager - MySQL Seed',
  );

  console.log(
    '==============================================\n',
  );


  await AppDataSource.initialize();


  try {
    /*
     * ========================================================
     * REPOSITORIES
     * ========================================================
     */

    const roleRepo =
      AppDataSource.getRepository(
        RoleEntity,
      );


    const userRepo =
      AppDataSource.getRepository(
        UserEntity,
      );


    const settingRepo =
      AppDataSource.getRepository(
        SettingEntity,
      );


    const workflowRepo =
      AppDataSource.getRepository(
        TaskWorkflowConfigEntity,
      );


    /*
     * ========================================================
     * ROLES
     * ========================================================
     *
     * ONLY:
     *
     * ADMIN
     * USER
     * ========================================================
     */

    console.log(
      'Creating Roles...',
    );


    const adminRole =
      await upsert(
        roleRepo,

        {
          name:
            RoleName.ADMIN,
        },

        () => ({
          name:
            RoleName.ADMIN,

          description:
            'Full administrative access',

          permissions: {},
        }),
      );


    const userRole =
      await upsert(
        roleRepo,

        {
          name:
            RoleName.USER,
        },

        () => ({
          name:
            RoleName.USER,

          description:
            'Standard authenticated user',

          permissions: {},
        }),
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

    console.log(
      '\nCreating Branches...',
    );


    const hq =
      await upsert(
        settingRepo,

        {
          type:
            SettingType.BRANCH,

          codeEn:
            'HQ',
        },

        () => ({
          type:
            SettingType.BRANCH,

          codeAr:
            'الرئيسي',

          codeEn:
            'HQ',

          valueType:
            SettingValueType.STRING,

          valueAr:
            'المقر الرئيسي',

          valueEn:
            'Headquarters',

          address:
            'Main Office',

          isSystem:
            false,

          isAdminDepartment:
            false,

          isActive:
            true,
        }),
      );


    const branchTwo =
      await upsert(
        settingRepo,

        {
          type:
            SettingType.BRANCH,

          codeEn:
            'BRANCH-2',
        },

        () => ({
          type:
            SettingType.BRANCH,

          codeAr:
            'الفرع الثاني',

          codeEn:
            'BRANCH-2',

          valueType:
            SettingValueType.STRING,

          valueAr:
            'الفرع الثاني',

          valueEn:
            'Branch 2',

          address:
            'Secondary Office',

          isSystem:
            false,

          isAdminDepartment:
            false,

          isActive:
            true,
        }),
      );


    console.log(
      '  ✓ Headquarters',
    );

    console.log(
      '  ✓ Branch 2',
    );


    /*
     * ========================================================
     * DEPARTMENTS
     * ========================================================
     */

    console.log(
      '\nCreating Departments...',
    );


    const management =
      await upsert(
        settingRepo,

        {
          type:
            SettingType.DEPARTMENT,

          codeEn:
            'MANAGEMENT',
        },

        () => ({
          type:
            SettingType.DEPARTMENT,

          codeAr:
            'الإدارة',

          codeEn:
            'MANAGEMENT',

          valueType:
            SettingValueType.STRING,

          valueAr:
            'الإدارة',

          valueEn:
            'Management',

          isSystem:
            false,

          isAdminDepartment:
            false,

          isActive:
            true,
        }),
      );


    const operations =
      await upsert(
        settingRepo,

        {
          type:
            SettingType.DEPARTMENT,

          codeEn:
            'OPERATIONS',
        },

        () => ({
          type:
            SettingType.DEPARTMENT,

          codeAr:
            'العمليات',

          codeEn:
            'OPERATIONS',

          valueType:
            SettingValueType.STRING,

          valueAr:
            'العمليات',

          valueEn:
            'Operations',

          isSystem:
            false,

          isAdminDepartment:
            false,

          isActive:
            true,
        }),
      );


    const finance =
      await upsert(
        settingRepo,

        {
          type:
            SettingType.DEPARTMENT,

          codeEn:
            'FINANCE',
        },

        () => ({
          type:
            SettingType.DEPARTMENT,

          codeAr:
            'المالية',

          codeEn:
            'FINANCE',

          valueType:
            SettingValueType.STRING,

          valueAr:
            'المالية',

          valueEn:
            'Finance',

          isSystem:
            false,

          isAdminDepartment:
            false,

          isActive:
            true,
        }),
      );


    const hr =
      await upsert(
        settingRepo,

        {
          type:
            SettingType.DEPARTMENT,

          codeEn:
            'HR',
        },

        () => ({
          type:
            SettingType.DEPARTMENT,

          codeAr:
            'الموارد البشرية',

          codeEn:
            'HR',

          valueType:
            SettingValueType.STRING,

          valueAr:
            'الموارد البشرية',

          valueEn:
            'Human Resources',

          isSystem:
            false,

          isAdminDepartment:
            false,

          isActive:
            true,
        }),
      );


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


    /*
     * ========================================================
     * PASSWORD
     * ========================================================
     */

    const passwordHash =
      await bcrypt.hash(
        SEED_PASSWORD,
        12,
      );


    /*
     * ========================================================
     * ADMIN
     * ========================================================
     */

    console.log(
      '\nCreating Admin...',
    );


    await upsert(
      userRepo,

      {
        email:
          'admin@taskmanager.com',
      },

      () => ({
        fullName:
          'System Administrator',

        email:
          'admin@taskmanager.com',

        passwordHash,

        roleId:
          adminRole.id,

        /*
         * Admin does NOT belong to a Department.
         */
        departmentId:
          null,

        branchId:
          hq.id,

        isActive:
          true,

        failedLoginAttempts:
          0,

        locale:
          'en',

        timezone:
          'UTC',
      }),
    );


    console.log(
      '  ✓ admin@taskmanager.com',
    );


    /*
     * ========================================================
     * NORMAL USERS
     * ========================================================
     */

    console.log(
      '\nCreating Users...',
    );


    await upsert(
      userRepo,

      {
        email:
          'ahmed@taskmanager.com',
      },

      () => ({
        fullName:
          'Ahmed Hassan',

        email:
          'ahmed@taskmanager.com',

        passwordHash,

        phone:
          '+966500000001',

        roleId:
          userRole.id,

        departmentId:
          management.id,

        branchId:
          hq.id,

        isActive:
          true,

        failedLoginAttempts:
          0,

        locale:
          'en',

        timezone:
          'UTC',
      }),
    );


    await upsert(
      userRepo,

      {
        email:
          'sarah@taskmanager.com',
      },

      () => ({
        fullName:
          'Sarah Khalid',

        email:
          'sarah@taskmanager.com',

        passwordHash,

        phone:
          '+966500000002',

        roleId:
          userRole.id,

        departmentId:
          operations.id,

        branchId:
          hq.id,

        isActive:
          true,

        failedLoginAttempts:
          0,

        locale:
          'en',

        timezone:
          'UTC',
      }),
    );


    await upsert(
      userRepo,

      {
        email:
          'omar@taskmanager.com',
      },

      () => ({
        fullName:
          'Omar Ali',

        email:
          'omar@taskmanager.com',

        passwordHash,

        phone:
          '+966500000003',

        roleId:
          userRole.id,

        departmentId:
          operations.id,

        branchId:
          branchTwo.id,

        isActive:
          true,

        failedLoginAttempts:
          0,

        locale:
          'en',

        timezone:
          'UTC',
      }),
    );


    await upsert(
      userRepo,

      {
        email:
          'laila@taskmanager.com',
      },

      () => ({
        fullName:
          'Laila Mohammed',

        email:
          'laila@taskmanager.com',

        passwordHash,

        phone:
          '+966500000004',

        roleId:
          userRole.id,

        departmentId:
          finance.id,

        branchId:
          hq.id,

        isActive:
          true,

        failedLoginAttempts:
          0,

        locale:
          'en',

        timezone:
          'UTC',
      }),
    );


    await upsert(
      userRepo,

      {
        email:
          'khaled@taskmanager.com',
      },

      () => ({
        fullName:
          'Khaled Ibrahim',

        email:
          'khaled@taskmanager.com',

        passwordHash,

        phone:
          '+966500000005',

        roleId:
          userRole.id,

        departmentId:
          hr.id,

        branchId:
          branchTwo.id,

        isActive:
          true,

        failedLoginAttempts:
          0,

        locale:
          'en',

        timezone:
          'UTC',
      }),
    );


    console.log(
      '  ✓ ahmed@taskmanager.com',
    );

    console.log(
      '  ✓ sarah@taskmanager.com',
    );

    console.log(
      '  ✓ omar@taskmanager.com',
    );

    console.log(
      '  ✓ laila@taskmanager.com',
    );

    console.log(
      '  ✓ khaled@taskmanager.com',
    );


    /*
     * ========================================================
     * TASK WORKFLOW
     * ========================================================
     */

    console.log(
      '\nChecking Task Workflow...',
    );


    const existingWorkflow =
      await workflowRepo.find({
        take:
          1,
      });


    if (
      existingWorkflow.length ===
      0
    ) {
      await workflowRepo.save(
        workflowRepo.create({
          mode:
            TaskWorkflowMode.ALL_AVAILABLE,

          actions: [
            {
              key:
                TaskWorkflowActionKey.START,

              enabled:
                true,

              order:
                1,
            },

            {
              key:
                TaskWorkflowActionKey.SUBMIT_APPROVAL,

              enabled:
                true,

              order:
                2,
            },

            {
              key:
                TaskWorkflowActionKey.COMPLETE,

              enabled:
                true,

              order:
                3,
            },

            {
              key:
                TaskWorkflowActionKey.FINISH,

              enabled:
                true,

              order:
                4,
            },

            {
              key:
                TaskWorkflowActionKey.ARCHIVE,

              enabled:
                true,

              order:
                5,
            },
          ],
        }),
      );


      console.log(
        '  ✓ Default workflow created',
      );
    } else {
      console.log(
        '  ✓ Existing workflow kept',
      );
    }


    /*
     * ========================================================
     * FINISHED
     * ========================================================
     */

    console.log(
      '\n==============================================',
    );

    console.log(
      ' Seed completed successfully',
    );

    console.log(
      '==============================================\n',
    );


    console.log(
      'Roles:',
    );

    console.log(
      '  ADMIN',
    );

    console.log(
      '  USER',
    );


    console.log(
      '\nLogin accounts:\n',
    );


    console.log(
      'ADMIN',
    );

    console.log(
      'Email:    admin@taskmanager.com',
    );

    console.log(
      `Password: ${SEED_PASSWORD}`,
    );


    console.log(
      '\nUSERS',
    );

    console.log(
      'ahmed@taskmanager.com',
    );

    console.log(
      'sarah@taskmanager.com',
    );

    console.log(
      'omar@taskmanager.com',
    );

    console.log(
      'laila@taskmanager.com',
    );

    console.log(
      'khaled@taskmanager.com',
    );


    console.log(
      `\nAll seeded accounts use: ${SEED_PASSWORD}\n`,
    );
  } finally {
    if (
      AppDataSource.isInitialized
    ) {
      await AppDataSource.destroy();
    }
  }
}


/*
 * ============================================================
 * RUN
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
    (
      error,
    ) => {
      console.error(
        '\nSeed failed:\n',
        error,
      );


      process.exit(
        1,
      );
    },
  );