import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured logging via pino
  app.useLogger(app.get(Logger));

  // Security headers + CORS restricted to the web app origin
  app.use(helmet());
  app.enableCors({
    origin: process.env.APP_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // Uniform { error: { code, message, details } } envelope for all failures
  app.useGlobalFilters(new AppExceptionFilter());

  // NOTE on validation: request bodies are validated per-route with
  // ZodValidationPipe(schema) (src/common/pipes/zod-validation.pipe.ts)
  // against the shared Zod schemas in @flowos/shared — there is no global
  // schema-less pipe because each endpoint binds its own schema.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FlowOS API')
    .setDescription('Multi-tenant white-label project management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('/api/v1')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  // Graceful shutdown: lets BullMQ workers, socket.io and Redis clients drain
  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);
}

void bootstrap();
