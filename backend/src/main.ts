import {
  NestFactory,
} from '@nestjs/core';

import {
  ValidationPipe,
} from '@nestjs/common';

import {
  NestExpressApplication,
} from '@nestjs/platform-express';

import {
  ConfigService,
} from '@nestjs/config';

import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import helmet
  from 'helmet';

import compression
  from 'compression';

import cookieParser
  from 'cookie-parser';

import {
  json,
  urlencoded,
} from 'express';

import {
  mkdirSync,
} from 'fs';

import {
  join,
} from 'path';

import {
  AppModule,
} from './app.module';

import {
  STORAGE_ROOT,
} from './common/storage/storage.util';


async function bootstrap() {
  const app =
    await NestFactory.create<
      NestExpressApplication
    >(
      AppModule,
      {
        bodyParser:
          false,
      },
    );


  /*
   * The editable bilingual dictionary contains the complete UI
   * catalog and is intentionally larger than Express's 100 KB
   * default JSON limit. Keep a bounded limit while allowing the
   * full catalog to be saved in one atomic request.
   */
  app.use(
    json({
      limit:
        '5mb',
    }),
  );


  app.use(
    urlencoded({
      extended:
        true,

      limit:
        '5mb',
    }),
  );


  const configService =
    app.get(
      ConfigService,
    );


  const isProduction =
    configService.get<string>(
      'nodeEnv',
    ) === 'production';


  /*
   * Behind nginx / a load balancer, req.ip is the proxy unless Express is
   * told to trust it. This matters for rate limiting and audit-log IPs.
   * TRUST_PROXY accepts a hop count (1), "true", or a subnet like "loopback".
   */
  if (process.env.TRUST_PROXY) {
    const raw = process.env.TRUST_PROXY;
    app.set(
      'trust proxy',
      raw === 'true' ? true : /^\d+$/.test(raw) ? parseInt(raw, 10) : raw,
    );
  }


  /*
   * gzip JSON responses. If nginx already compresses, set
   * DISABLE_APP_COMPRESSION=true to avoid doing it twice.
   */
  if (process.env.DISABLE_APP_COMPRESSION !== 'true') {
    app.use(compression());
  }


  /*
   * ==========================================================
   * STORAGE
   * ==========================================================
   *
   * Create root category folders.
   *
   * YYYY/MM folders are created dynamically when a file arrives.
   * ==========================================================
   */

  mkdirSync(
    join(
      STORAGE_ROOT,
      'avatars',
    ),
    {
      recursive:
        true,
    },
  );


  mkdirSync(
    join(
      STORAGE_ROOT,
      'branding',
    ),
    {
      recursive:
        true,
    },
  );


  mkdirSync(
    join(
      STORAGE_ROOT,
      'attachments',
    ),
    {
      recursive:
        true,
    },
  );


  /*
   * ==========================================================
   * PUBLIC IMAGE STORAGE
   * ==========================================================
   *
   * Avatars and branding must be publicly reachable because:
   *
   * - avatars appear in UI lists
   * - logo/favicon are needed before login
   *
   * DO NOT expose storage/attachments here.
   *
   * Task attachment images must still pass the authenticated
   * /attachments/:id permission checks.
   * ==========================================================
   */

  const publicBasePath =
    (
      process.env.PUBLIC_BASE_PATH ||
      ''
    ).replace(
      /^\/+|\/+$/g,
      '',
    );


  const publicStoragePrefix = (
    category:
      string,
  ) =>
    `/${[
      publicBasePath,
      'storage',
      category,
    ]
      .filter(
        Boolean,
      )
      .join(
        '/',
      )}`;

  app.useStaticAssets(
    join(
      STORAGE_ROOT,
      'avatars',
    ),
    {
      prefix:
        publicStoragePrefix(
          'avatars',
        ),
    },
  );


  app.useStaticAssets(
    join(
      STORAGE_ROOT,
      'branding',
    ),
    {
      prefix:
        publicStoragePrefix(
          'branding',
        ),
    },
  );


  /*
   * ==========================================================
   * SECURITY
   * ==========================================================
   */

  app.use(
    helmet(),
  );


  app.use(
    cookieParser(),
  );


  /*
   * ==========================================================
   * CORS
   * ==========================================================
   */

  const configuredCorsOrigin =
    configService.get<string>(
      'corsOrigin',
    ) || '*';


  /*
   * CORS_ORIGIN accepts a comma- or whitespace-separated allowlist.
   * Using `true` for `*` reflects the requesting origin, which remains
   * compatible with credentials (browsers reject credentials with a
   * literal Access-Control-Allow-Origin: * response).
   */
  const corsOrigin =
    configuredCorsOrigin.trim() === '*'
      ? true
      : configuredCorsOrigin
          .split(/[\s,]+/)
          .map((origin) => origin.trim())
          .filter(Boolean);


  if (isProduction && configuredCorsOrigin.trim() === '*') {
    // eslint-disable-next-line no-console
    console.warn(
      '[security] CORS_ORIGIN is "*" in production: any website can call this API with credentials. Set CORS_ORIGIN to your frontend origin(s).',
    );
  }


  app.enableCors({
    origin:
      corsOrigin,

    credentials:
      true,
  });


  /*
   * ==========================================================
   * VALIDATION
   * ==========================================================
   */

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:
        true,

      forbidNonWhitelisted:
        true,

      transform:
        true,

      transformOptions: {
        enableImplicitConversion:
          true,
      },
    }),
  );


  /*
   * ==========================================================
   * API PREFIX
   * ==========================================================
   */

  const apiPrefix =
    configService.get<string>(
      'apiPrefix',
    ) ||
    'api/v1';


  app.setGlobalPrefix(
    apiPrefix,
  );


  /*
   * ==========================================================
   * SWAGGER
   * ==========================================================
   */

  const swaggerConfig =
    new DocumentBuilder()
      .setTitle(
        'Enterprise Task & Project Management System API',
      )
      .setDescription(
        'REST API implementing the SRS Section 7 contract',
      )
      .setVersion(
        '1.0',
      )
      .addBearerAuth()
      .build();


  /*
   * API docs are a map of the whole attack surface, so they are off in
   * production unless explicitly enabled with ENABLE_SWAGGER=true.
   */
  const swaggerEnabled =
    !isProduction ||
    process.env.ENABLE_SWAGGER === 'true';

  if (swaggerEnabled) {
    const document =
      SwaggerModule.createDocument(
        app,
        swaggerConfig,
      );

    SwaggerModule.setup(
      `${apiPrefix}/docs`,
      app,
      document,
    );
  }


  /*
   * ==========================================================
   * START
   * ==========================================================
   */

  const port =
    configService.get<number>(
      'port',
    ) ||
    3000;


  await app.listen(
    port,
  );


  // eslint-disable-next-line no-console
  console.log(
    `Application listening on port ${port} (prefix: /${apiPrefix})`,
  );


  if (swaggerEnabled) {
    // eslint-disable-next-line no-console
    console.log(
      `Swagger docs: http://localhost:${port}/${apiPrefix}/docs`,
    );
  }
}


bootstrap();
