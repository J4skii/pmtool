import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { CommonModule } from './common/common.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { QueuesModule } from './modules/queues/queues.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RolesModule } from './modules/roles/roles.module';
import { SheetImportModule } from './modules/sheet-import/sheet-import.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TimeModule } from './modules/time/time.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization', 'req.headers.cookie'],
        transport: process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            // RATE_LIMIT_TTL is expressed in seconds; @nestjs/throttler v6 wants ms
            ttl: Number(config.get<string>('RATE_LIMIT_TTL') ?? '60') * 1000,
            limit: Number(config.get<string>('RATE_LIMIT_MAX') ?? '120'),
          },
        ],
      }),
    }),
    CommonModule,
    RealtimeModule,
    QueuesModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    RolesModule,
    ProjectsModule,
    SheetImportModule,
    TasksModule,
    FilesModule,
    CommentsModule,
    TimeModule,
    NotificationsModule,
    HealthModule,
    AiModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule {}
