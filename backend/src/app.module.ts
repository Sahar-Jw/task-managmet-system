import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { validate } from './config/validation.schema';


import { RolesModule } from './modules/roles/roles.module';
import { SettingsModule } from './modules/settings/settings.module';
import { BrandingModule } from './modules/branding/branding.module';
import { UsersModule } from './modules/users/users.module';
import { TeamsModule } from './modules/teams/teams.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskAssignmentsModule } from './modules/task-assignments/task-assignments.module';
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

    ScheduleModule.forRoot(),

    /*
     * Global rate limit per client IP. The default is deliberately generous
     * because many staff can share one office IP; the sensitive public auth
     * endpoints get a much stricter @Throttle() of their own.
     * Make sure TRUST_PROXY is set behind nginx, otherwise every user looks
     * like the proxy's IP and they would all share one bucket.
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '600', 10),
      },
    ]),

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
      'postgres' as const,

    host:
      config.get<string>(
        'database.host',
        'localhost',
      ),

    port:
      config.get<number>(
        'database.port',
        5432,
      ),

    username:
      config.get<string>(
        'database.username',
        'postgres',
      ),

    password:
      config.get<string>(
        'database.password',
        'postgres',
      ),

    database:
      config.get<string>(
        'database.name',
        'task_pm_system',
      ),

    uuidExtension:
      'pgcrypto',

    autoLoadEntities:
      true,

    /*
     * Connection pool (node-postgres).
     * Keep this below PostgreSQL's max_connections divided by
     * the number of app instances.
     */
    extra: {
      max: parseInt(process.env.DB_POOL_SIZE || '20', 10),
    },

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
    TeamsModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    TaskAssignmentsModule,
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
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
