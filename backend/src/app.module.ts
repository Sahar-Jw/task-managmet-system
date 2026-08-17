import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import configuration from './config/configuration';
import { validate } from './config/validation.schema';


import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BrandingModule } from './modules/branding/branding.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskAssignmentsModule } from './modules/task-assignments/task-assignments.module';
import { AssignmentApprovalsModule } from './modules/assignment-approvals/assignment-approvals.module';
import { TaskRatingsModule } from './modules/task-ratings/task-ratings.module';
import { TaskCommentsModule } from './modules/task-comments/task-comments.module';
import { TaskAttachmentsModule } from './modules/task-attachments/task-attachments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TaskWorkflowModule } from './modules/task-workflow/task-workflow.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
      envFilePath: ['.env'],
    }),

    TypeOrmModule.forRootAsync({
  imports: [
    ConfigModule,
  ],

  inject: [
    ConfigService,
  ],

  useFactory: (
    config:
      ConfigService,
  ) => ({
    type:
      'mysql' as const,

    host:
      config.get<string>(
        'database.host',
        'localhost',
      ),

    port:
      config.get<number>(
        'database.port',
        3306,
      ),

    username:
      config.get<string>(
        'database.username',
        'root',
      ),

    password:
      config.get<string>(
        'database.password',
        '',
      ),

    database:
      config.get<string>(
        'database.name',
        'task_pm_system',
      ),

    charset:
      'utf8mb4',

    autoLoadEntities:
      true,

    /*
     * IMPORTANT:
     *
     * We use migrations.
     * Never let TypeORM modify the schema automatically.
     */
    synchronize:
      false,

    logging:
      config.get<boolean>(
        'database.logging',
        false,
      ),
  }),
}),

    RolesModule,
    SettingsModule,
    BrandingModule,
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    TaskAssignmentsModule,
    AssignmentApprovalsModule,
    TaskRatingsModule,
    TaskCommentsModule,
    TaskAttachmentsModule,
    NotificationsModule,
    AuditLogsModule,
    ReportsModule,
    TaskWorkflowModule,
    DictionaryModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
