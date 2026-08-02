import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // NFR-SEC-12: security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string>('corsOrigin'),
    credentials: true, // required for the HttpOnly refresh-token cookie
  });

  // NFR-SEC-05: all input validated/sanitized server-side via DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const apiPrefix = configService.get<string>('apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // OpenAPI/Swagger docs (NFR-MAINT-06)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Enterprise Task & Project Management System API')
    .setDescription('REST API implementing the SRS Section 7 contract')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = configService.get<number>('port') || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Application listening on port ${port} (prefix: /${apiPrefix})`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
