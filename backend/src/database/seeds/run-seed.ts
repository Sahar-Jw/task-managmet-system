import 'reflect-metadata';
import * as bcrypt from 'bcrypt';
import { writeFileSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { AppDataSource } from '../data-source';
import { RoleEntity } from '../../modules/roles/entities/role.entity';
import { SettingEntity } from '../../modules/settings/entities/setting.entity';
import { ProjectEntity } from '../../modules/projects/entities/project.entity';
import { TaskEntity } from '../../modules/tasks/entities/task.entity';
import { TaskAssignmentEntity } from '../../modules/task-assignments/entities/task-assignment.entity';
import { TaskCommentEntity } from '../../modules/task-comments/entities/task-comment.entity';
import { TaskAttachmentEntity } from '../../modules/task-attachments/entities/task-attachment.entity';
import { TaskRatingEntity } from '../../modules/task-ratings/entities/task-rating.entity';
import { NotificationEntity } from '../../modules/notifications/entities/notification.entity';
import { AuditLogEntity } from '../../modules/audit-logs/entities/audit-log.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import { RoleName } from '../../shared/enums/role.enum';
import { ProjectStatus } from '../../shared/enums/project-status.enum';
import { TaskPriority } from '../../shared/enums/task-priority.enum';
import { TaskStatus } from '../../shared/enums/task-status.enum';
import { TaskType } from '../../shared/enums/task-type.enum';
import { ApprovalStatus } from '../../shared/enums/approval-status.enum';
import { AssignmentStatus } from '../../shared/enums/assignment-status.enum';
import { NotificationType } from '../../shared/enums/notification-type.enum';
import { AuditAction } from '../../shared/enums/audit-action.enum';
import { SettingType } from '../../shared/enums/setting-type.enum';
import { SettingValueType } from '../../shared/enums/setting-value-type.enum';

/**
 * Bootstraps a fully populated test database: Roles, Branches, Departments,
 * Users (active/inactive/locked), Projects (every status), and Tasks
 * exercising every field and every corner of the lifecycle — pending,
 * in-progress, needing approval (pending/approved/rejected), completed with
 * an evaluation, a father task with sub-tasks, overdue, finished, and
 * archived — plus comments, an attachment, a legacy multi-assignee
 * assignment, notifications, and a few audit log rows.
 *
 * Usage: npm run seed
 * Safe to re-run: every insert is guarded by a "does this already exist?"
 * check, so running it twice won't create duplicates.
 */

const TEST_PASSWORD = process.env.SEED_USER_PASSWORD || 'Passw0rd!123';

async function run() {
  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(RoleEntity);
  const settingRepo = AppDataSource.getRepository(SettingEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);
  const projectRepo = AppDataSource.getRepository(ProjectEntity);
  const taskRepo = AppDataSource.getRepository(TaskEntity);
  const assignmentRepo = AppDataSource.getRepository(TaskAssignmentEntity);
  const commentRepo = AppDataSource.getRepository(TaskCommentEntity);
  const attachmentRepo = AppDataSource.getRepository(TaskAttachmentEntity);
  const ratingRepo = AppDataSource.getRepository(TaskRatingEntity);
  const notificationRepo = AppDataSource.getRepository(NotificationEntity);
  const auditRepo = AppDataSource.getRepository(AuditLogEntity);

  // ---------------------------------------------------------------- Roles
  const adminRole = await upsert(roleRepo, { name: RoleName.ADMIN }, () => ({
    name: RoleName.ADMIN,
    description: 'Full administrative privileges',
    permissions: {},
  }));
  const userRole = await upsert(roleRepo, { name: RoleName.USER }, () => ({
    name: RoleName.USER,
    description: 'Standard authenticated user',
    permissions: {},
  }));

  // -------------------------------------------------------------- Branches
  const hq = await upsert(settingRepo, { type: SettingType.BRANCH, codeEn: 'HQ' }, () => ({
    type: SettingType.BRANCH,
    codeAr: 'HQ',
    codeEn: 'HQ',
    valueType: SettingValueType.STRING,
    valueAr: 'المقر الرئيسي',
    valueEn: 'Headquarters',
    address: 'Riyadh, Saudi Arabia',
    isActive: true,
  }));
  const jeddah = await upsert(settingRepo, { type: SettingType.BRANCH, codeEn: 'JED' }, () => ({
    type: SettingType.BRANCH,
    codeAr: 'JED',
    codeEn: 'JED',
    valueType: SettingValueType.STRING,
    valueAr: 'فرع جدة',
    valueEn: 'Jeddah Branch',
    address: 'Jeddah, Saudi Arabia',
    isActive: true,
  }));

  // ------------------------------------------------------------ Departments
  // The "Administration" department has been removed entirely — Admin Users
  // don't belong to any Department (see the Users section below).
  const engineering = await upsert(settingRepo, { type: SettingType.DEPARTMENT, codeEn: 'ENG' }, () => ({
    type: SettingType.DEPARTMENT,
    codeAr: 'ENG',
    codeEn: 'ENG',
    valueType: SettingValueType.STRING,
    valueAr: 'الهندسة',
    valueEn: 'Engineering',
    isActive: true,
  }));
  const finance = await upsert(settingRepo, { type: SettingType.DEPARTMENT, codeEn: 'FIN' }, () => ({
    type: SettingType.DEPARTMENT,
    codeAr: 'FIN',
    codeEn: 'FIN',
    valueType: SettingValueType.STRING,
    valueAr: 'المالية',
    valueEn: 'Finance',
    isActive: true,
  }));
  const hr = await upsert(settingRepo, { type: SettingType.DEPARTMENT, codeEn: 'HR' }, () => ({
    type: SettingType.DEPARTMENT,
    codeAr: 'HR',
    codeEn: 'HR',
    valueType: SettingValueType.STRING,
    valueAr: 'الموارد البشرية',
    valueEn: 'Human Resources',
    isActive: true,
  }));

  // ------------------------------------------------------- Project Settings
  await upsert(settingRepo, { type: SettingType.PROJECT_SETTING, codeEn: 'MAX_UPLOAD_SIZE_MB' }, () => ({
    type: SettingType.PROJECT_SETTING,
    codeAr: 'MAX_UPLOAD_SIZE_MB',
    codeEn: 'MAX_UPLOAD_SIZE_MB',
    valueType: SettingValueType.NUMBER,
    valueNumber: '25',
    isActive: true,
  }));
  await upsert(settingRepo, { type: SettingType.PROJECT_SETTING, codeEn: 'DEFAULT_CURRENCY' }, () => ({
    type: SettingType.PROJECT_SETTING,
    codeAr: 'DEFAULT_CURRENCY',
    codeEn: 'DEFAULT_CURRENCY',
    valueType: SettingValueType.STRING,
    valueAr: 'ريال سعودي',
    valueEn: 'SAR',
    isActive: true,
  }));

  // ------------------------------------------------------------------ Users
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  const admin = await upsert(userRepo, { email: 'admin@example.com' }, () => ({
    fullName: 'System Administrator',
    email: 'admin@example.com',
    passwordHash,
    roleId: adminRole.id,
    departmentId: null,
    branchId: hq.id,
    isActive: true,
  }));

  const secondAdmin = await upsert(userRepo, { email: 'ahmed.admin@example.com' }, () => ({
    fullName: 'Ahmed Al-Otaibi',
    email: 'ahmed.admin@example.com',
    passwordHash,
    roleId: adminRole.id,
    departmentId: null,
    branchId: hq.id,
    isActive: true,
  }));

  const omar = await upsert(userRepo, { email: 'omar.dev@example.com' }, () => ({
    fullName: 'Omar Al-Fahad',
    email: 'omar.dev@example.com',
    passwordHash,
    roleId: userRole.id,
    departmentId: engineering.id,
    branchId: hq.id,
    isActive: true,
  }));

  const laila = await upsert(userRepo, { email: 'laila.finance@example.com' }, () => ({
    fullName: 'Laila Hassan',
    email: 'laila.finance@example.com',
    passwordHash,
    roleId: userRole.id,
    departmentId: finance.id,
    branchId: jeddah.id,
    isActive: true,
  }));

  const khaled = await upsert(userRepo, { email: 'khaled.hr@example.com' }, () => ({
    fullName: 'Khaled Ibrahim',
    email: 'khaled.hr@example.com',
    passwordHash,
    roleId: userRole.id,
    departmentId: hr.id,
    branchId: hq.id,
    isActive: true,
  }));

  // Inactive user — to test reactivation from the Users page.
  await upsert(userRepo, { email: 'mona.inactive@example.com' }, () => ({
    fullName: 'Mona Saleh',
    email: 'mona.inactive@example.com',
    passwordHash,
    roleId: userRole.id,
    departmentId: engineering.id,
    branchId: hq.id,
    isActive: false,
    archivedAt: new Date(),
  }));

  // Locked-out user — to test the "Unlock" action.
  await upsert(userRepo, { email: 'yusuf.locked@example.com' }, () => ({
    fullName: 'Yusuf Al-Qahtani',
    email: 'yusuf.locked@example.com',
    passwordHash,
    roleId: userRole.id,
    departmentId: engineering.id,
    branchId: hq.id,
    isActive: true,
    failedLoginAttempts: 5,
    lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // locked for 30 more minutes
  }));

  console.log(`\nAll seeded Users share the password: ${TEST_PASSWORD}\n`);

  // --------------------------------------------------------------- Projects
  const websiteProject = await upsert(projectRepo, { name: 'Website Revamp' }, () => ({
    name: 'Website Revamp',
    description: 'Redesign of the public-facing corporate website.',
    status: ProjectStatus.ACTIVE,
    startDate: daysAgo(20),
    createdById: admin.id,
  }));

  const auditProject = await upsert(projectRepo, { name: 'Q3 Financial Audit' }, () => ({
    name: 'Q3 Financial Audit',
    description: 'Quarterly internal audit of financial records.',
    status: ProjectStatus.PLANNED,
    startDate: daysFromNow(5),
    createdById: secondAdmin.id,
  }));

  const migrationProject = await upsert(projectRepo, { name: 'Legacy System Migration' }, () => ({
    name: 'Legacy System Migration',
    description: 'Migration off the old ERP system — fully wrapped up.',
    status: ProjectStatus.COMPLETED,
    startDate: daysAgo(90),
    endDate: daysAgo(10),
    createdById: admin.id,
  }));

  await upsert(projectRepo, { name: 'Retired Pilot Program' }, () => ({
    name: 'Retired Pilot Program',
    description: 'An early pilot that was shelved.',
    status: ProjectStatus.ARCHIVED,
    startDate: daysAgo(200),
    endDate: daysAgo(150),
    archivedAt: daysAgoDate(150),
    createdById: admin.id,
  }));

  // ------------------------------------------------------------------ Tasks

  // 1. Plain task — Pending, no approval, no budget.
  const t1 = await upsert(taskRepo, { titleEn: 'Draft homepage wireframes' }, () => ({
    titleAr: 'رسم المخططات الأولية للصفحة الرئيسية',
    titleEn: 'Draft homepage wireframes',
    descriptionAr: 'إعداد تصاميم أولية للصفحة الرئيسية الجديدة للموقع.',
    descriptionEn: 'Prepare initial wireframes for the new homepage layout.',
    taskType: TaskType.TECHNICAL,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.PENDING,
    color: '#3B82F6',
    branchId: hq.id,
    departmentId: engineering.id,
    projectId: websiteProject.id,
    assignedToId: omar.id,
    createdById: admin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: false,
    startDate: today(),
    deadlineDate: daysFromNow(10),
  }));

  // 2. In-progress task WITH a money range.
  const t2 = await upsert(taskRepo, { titleEn: 'Renew stock photography license' }, () => ({
    titleAr: 'تجديد ترخيص الصور الفوتوغرافية',
    titleEn: 'Renew stock photography license',
    descriptionAr: 'تجديد اشتراك مكتبة الصور المستخدمة في الموقع.',
    descriptionEn: 'Renew the annual subscription for the stock photo library used across the site.',
    taskType: TaskType.FINANCIAL,
    priority: TaskPriority.HIGH,
    status: TaskStatus.IN_PROGRESS,
    color: '#F59E0B',
    branchId: jeddah.id,
    departmentId: finance.id,
    projectId: websiteProject.id,
    assignedToId: laila.id,
    createdById: secondAdmin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: true,
    budgetMin: '5000.00',
    budgetMax: '8000.00',
    budgetCurrency: 'SAR',
    startDate: daysAgo(3),
    deadlineDate: daysFromNow(7),
  }));

  // 3. Needs approval — currently sitting in PendingApproval, waiting on the approver.
  const t3 = await upsert(taskRepo, { titleEn: 'Publish new pricing page' }, () => ({
    titleAr: 'نشر صفحة الأسعار الجديدة',
    titleEn: 'Publish new pricing page',
    descriptionAr: 'مراجعة ونشر صفحة الأسعار المحدثة على الموقع.',
    descriptionEn: 'Review and publish the updated pricing page to production.',
    taskType: TaskType.GENERAL,
    priority: TaskPriority.HIGH,
    status: TaskStatus.PENDING_APPROVAL,
    color: '#8B5CF6',
    branchId: hq.id,
    departmentId: engineering.id,
    projectId: websiteProject.id,
    assignedToId: omar.id,
    createdById: admin.id,
    needsApproval: true,
    approverId: admin.id,
    approvalStatus: ApprovalStatus.PENDING,
    needsBudget: false,
    startDate: daysAgo(5),
    deadlineDate: daysFromNow(2),
  }));

  // 4. Completed AND approved — has an evaluation (rating) left for the assignee.
  const t4 = await upsert(taskRepo, { titleEn: 'Fix checkout page bug' }, () => ({
    titleAr: 'إصلاح خطأ في صفحة الدفع',
    titleEn: 'Fix checkout page bug',
    descriptionAr: 'إصلاح خطأ يمنع بعض العملاء من إتمام عملية الدفع.',
    descriptionEn: 'Fix a bug preventing some customers from completing checkout.',
    taskType: TaskType.TECHNICAL,
    priority: TaskPriority.CRITICAL,
    status: TaskStatus.COMPLETED,
    color: '#22C55E',
    branchId: hq.id,
    departmentId: engineering.id,
    projectId: websiteProject.id,
    assignedToId: omar.id,
    createdById: admin.id,
    needsApproval: true,
    approverId: admin.id,
    approvalStatus: ApprovalStatus.APPROVED,
    needsBudget: false,
    startDate: daysAgo(8),
    deadlineDate: daysAgo(1),
    actualEndDate: daysAgoDate(1),
  }));
  await upsertRating(ratingRepo, t4.id, admin.id, () => ({
    taskId: t4.id,
    ratedById: admin.id,
    score: 5,
    feedback: 'Great job — fixed quickly and communicated clearly throughout.',
  }));

  // 5. Needed approval but got REJECTED — back in progress with a rejection cause.
  const t5 = await upsert(taskRepo, { titleEn: 'Increase marketing budget request' }, () => ({
    titleAr: 'طلب زيادة ميزانية التسويق',
    titleEn: 'Increase marketing budget request',
    descriptionAr: 'طلب اعتماد زيادة ميزانية الحملة التسويقية للربع القادم.',
    descriptionEn: 'Request approval to increase next quarter\u2019s marketing campaign budget.',
    taskType: TaskType.FINANCIAL,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.IN_PROGRESS,
    color: '#EF4444',
    branchId: jeddah.id,
    departmentId: finance.id,
    projectId: auditProject.id,
    assignedToId: laila.id,
    createdById: laila.id,
    needsApproval: true,
    approverId: secondAdmin.id,
    approvalStatus: ApprovalStatus.REJECTED,
    rejectionReason: 'Exceeds this quarter\u2019s allocated marketing spend. Resubmit with a revised, lower figure.',
    needsBudget: true,
    budgetMin: '20000.00',
    budgetMax: '35000.00',
    budgetCurrency: 'SAR',
    startDate: daysAgo(6),
    deadlineDate: daysFromNow(14),
  }));

  // 6. Father task with two sub-tasks (one done, one still open).
  const father = await upsert(taskRepo, { titleEn: 'Roll out new onboarding process' }, () => ({
    titleAr: 'إطلاق عملية التهيئة الجديدة للموظفين',
    titleEn: 'Roll out new onboarding process',
    descriptionAr: 'تنفيذ عملية تهيئة جديدة للموظفين الجدد على عدة مراحل.',
    descriptionEn: 'Multi-step rollout of the revised new-hire onboarding process.',
    taskType: TaskType.HR,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.IN_PROGRESS,
    color: '#64748B',
    branchId: hq.id,
    departmentId: hr.id,
    assignedToId: khaled.id,
    createdById: admin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: false,
    startDate: daysAgo(15),
    deadlineDate: daysFromNow(20),
  }));
  await upsert(taskRepo, { titleEn: 'Write onboarding handbook' }, () => ({
    titleAr: 'كتابة دليل التهيئة',
    titleEn: 'Write onboarding handbook',
    descriptionEn: 'Draft the written handbook step of the onboarding rollout.',
    taskType: TaskType.HR,
    priority: TaskPriority.MEDIUM,
    status: TaskStatus.COMPLETED,
    color: '#64748B',
    branchId: hq.id,
    departmentId: hr.id,
    parentTaskId: father.id,
    assignedToId: khaled.id,
    createdById: admin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: false,
    startDate: daysAgo(15),
    deadlineDate: daysAgo(5),
    actualEndDate: daysAgoDate(6),
  }));
  await upsert(taskRepo, { titleEn: 'Record onboarding welcome video' }, () => ({
    titleAr: 'تصوير فيديو ترحيبي للتهيئة',
    titleEn: 'Record onboarding welcome video',
    descriptionEn: 'Film and edit the short welcome video step of the onboarding rollout.',
    taskType: TaskType.HR,
    priority: TaskPriority.LOW,
    status: TaskStatus.PENDING,
    color: '#64748B',
    branchId: hq.id,
    departmentId: hr.id,
    parentTaskId: father.id,
    assignedToId: khaled.id,
    createdById: admin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: false,
    startDate: daysFromNow(1),
    deadlineDate: daysFromNow(18),
  }));

  // 7. Overdue — deadline already passed but still open (exercises overdue reports/dashboard).
  const t7 = await upsert(taskRepo, { titleEn: 'Reconcile December invoices' }, () => ({
    titleAr: 'مطابقة فواتير شهر ديسمبر',
    titleEn: 'Reconcile December invoices',
    descriptionEn: 'Match outstanding December invoices against the ledger.',
    taskType: TaskType.FINANCIAL,
    priority: TaskPriority.HIGH,
    status: TaskStatus.PENDING,
    color: '#EF4444',
    branchId: jeddah.id,
    departmentId: finance.id,
    assignedToId: laila.id,
    createdById: secondAdmin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: false,
    startDate: daysAgo(20),
    deadlineDate: daysAgo(4),
  }));

  // 8. finished task.
  await upsert(taskRepo, { titleEn: 'Sponsor summer conference booth' }, () => ({
    titleAr: 'رعاية جناح المؤتمر الصيفي',
    titleEn: 'Sponsor summer conference booth',
    descriptionEn: 'Book and design a booth at the summer tech conference.',
    taskType: TaskType.OTHER,
    priority: TaskPriority.LOW,
    status: TaskStatus.FINISHED,
    color: '#94A3B8',
    branchId: hq.id,
    departmentId: engineering.id,
    createdById: admin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: true,
    budgetMin: '10000.00',
    budgetMax: '15000.00',
    budgetCurrency: 'SAR',
    startDate: daysAgo(30),
    deadlineDate: daysAgo(2),
  }));

  // 9. Archived task.
  await upsert(taskRepo, { titleEn: 'Old landing page copy review' }, () => ({
    titleAr: 'مراجعة محتوى الصفحة المقصودة القديمة',
    titleEn: 'Old landing page copy review',
    descriptionEn: 'A long-finished, now-archived review task kept for history.',
    taskType: TaskType.GENERAL,
    priority: TaskPriority.LOW,
    status: TaskStatus.ARCHIVED,
    color: '#94A3B8',
    branchId: hq.id,
    departmentId: engineering.id,
    projectId: migrationProject.id,
    createdById: admin.id,
    needsApproval: false,
    approvalStatus: ApprovalStatus.NOT_REQUIRED,
    needsBudget: false,
    startDate: daysAgo(120),
    deadlineDate: daysAgo(100),
    actualEndDate: daysAgoDate(100),
    archivedAt: daysAgoDate(95),
  }));

  // --------------------------------------------------- Comments & attachment
  await upsertComment(commentRepo, t7.id, laila.id, 'I\u2019ve started pulling the December statements together.');
  await upsertComment(commentRepo, t7.id, secondAdmin.id, 'Please prioritize this — it\u2019s already overdue.');
  await upsertComment(commentRepo, t4.id, omar.id, 'Root cause was a race condition in the payment webhook handler.');

  const uploadsDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  const samplePath = join(uploadsDir, 'seed-sample.txt');
  const sampleContent = 'This is a sample attachment created by the seed script for testing downloads.\n';
  writeFileSync(samplePath, sampleContent);
  const fileSize = statSync(samplePath).size;

  await upsert(attachmentRepo, { taskId: t1.id, fileName: 'seed-sample.txt' }, () => ({
    taskId: t1.id,
    uploadedById: admin.id,
    fileName: 'seed-sample.txt',
    fileUrl: '/uploads/seed-sample.txt',
    mimeType: 'text/plain',
    fileSize,
  }));

  // ------------------------------------------- Legacy multi-assignee example
  // Exercises the secondary "Assignment" accept/reject panel on the task
  // detail page, separate from the primary "for whom" field on the Task.
  await upsert(assignmentRepo, { taskId: t2.id, assigneeId: khaled.id }, () => ({
    taskId: t2.id,
    assigneeId: khaled.id,
    assignedById: secondAdmin.id,
    status: AssignmentStatus.PENDING_ACCEPTANCE,
    dueDate: daysFromNow(7),
  }));

  // ------------------------------------------------------------ Notifications
  await upsertNotification(notificationRepo, omar.id, 'You have been assigned to "Draft homepage wireframes"', () => ({
    recipientId: omar.id,
    type: NotificationType.TASK_ASSIGNED,
    title: 'New task assigned',
    message: 'You have been assigned to "Draft homepage wireframes".',
    isRead: false,
  }));
  await upsertNotification(notificationRepo, admin.id, 'Approval needed for "Publish new pricing page"', () => ({
    recipientId: admin.id,
    type: NotificationType.APPROVAL_DECISION,
    title: 'Approval requested',
    message: 'Omar Al-Fahad submitted "Publish new pricing page" for your approval.',
    isRead: false,
  }));
  await upsertNotification(notificationRepo, laila.id, 'Your request "Increase marketing budget request" was rejected', () => ({
    recipientId: laila.id,
    type: NotificationType.APPROVAL_DECISION,
    title: 'Request rejected',
    message: 'Your submission for "Increase marketing budget request" was rejected.',
    isRead: true,
    readAt: daysAgoDate(1),
  }));

  // ------------------------------------------------------------- Audit logs
  await auditRepo.save(
    auditRepo.create({
      actorId: admin.id,
      entityType: 'Task',
      entityId: t4.id,
      action: AuditAction.APPROVE,
      newValue: { approvalStatus: 'Approved', status: 'Completed' },
      reason: 'Verified fix in staging before approving.',
    }),
  );
  await auditRepo.save(
    auditRepo.create({
      actorId: secondAdmin.id,
      entityType: 'Task',
      entityId: t5.id,
      action: AuditAction.REJECT,
      newValue: { approvalStatus: 'Rejected' },
      reason: 'Exceeds this quarter\u2019s allocated marketing spend.',
    }),
  );

  await AppDataSource.destroy();

  console.log('\nSeed complete. Sign in with any of:');
  console.log(`  admin@example.com          / ${TEST_PASSWORD}  (Admin)`);
  console.log(`  ahmed.admin@example.com    / ${TEST_PASSWORD}  (Admin)`);
  console.log(`  omar.dev@example.com       / ${TEST_PASSWORD}  (User — Engineering)`);
  console.log(`  laila.finance@example.com  / ${TEST_PASSWORD}  (User — Finance)`);
  console.log(`  khaled.hr@example.com      / ${TEST_PASSWORD}  (User — HR)`);
  console.log(`  mona.inactive@example.com  / ${TEST_PASSWORD}  (deactivated — try reactivating)`);
  console.log(`  yusuf.locked@example.com   / ${TEST_PASSWORD}  (locked out — try unlocking)`);
}

// ---------------------------------------------------------------- Helpers

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysAgo(n: number): string {
  return daysFromNow(-n);
}
function daysAgoDate(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Find-or-create: looks up by `where`, creates via `build()` if missing. */
async function upsert<T extends { id: string }>(
  repo: import('typeorm').Repository<T>,
  where: Partial<T>,
  build: () => Partial<T>,
): Promise<T> {
  const existing = await repo.findOne({ where: where as any });
  if (existing) return existing;
  const entity = repo.create(build() as any);
  return (await repo.save(entity as any)) as T;
}

async function upsertRating(
  repo: import('typeorm').Repository<TaskRatingEntity>,
  taskId: string,
  ratedById: string,
  build: () => Partial<TaskRatingEntity>,
) {
  return upsert(repo as any, { taskId, ratedById } as any, build as any);
}

async function upsertComment(
  repo: import('typeorm').Repository<TaskCommentEntity>,
  taskId: string,
  authorId: string,
  content: string,
) {
  const existing = await repo.findOne({ where: { taskId, authorId, content } });
  if (existing) return existing;
  return repo.save(repo.create({ taskId, authorId, content }));
}

async function upsertNotification(
  repo: import('typeorm').Repository<NotificationEntity>,
  recipientId: string,
  message: string,
  build: () => Partial<NotificationEntity>,
) {
  const existing = await repo.findOne({ where: { recipientId, message } });
  if (existing) return existing;
  return repo.save(repo.create(build() as any));
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  process.exit(1);
});