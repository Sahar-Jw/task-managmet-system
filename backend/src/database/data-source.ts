import 'reflect-metadata';

import {
  DataSource,
} from 'typeorm';

import * as dotenv from 'dotenv';


dotenv.config();


export const AppDataSource =
  new DataSource({
    type:
      'mysql',

    host:
      process.env.DB_HOST ||
      'localhost',

    port:
      parseInt(
        process.env.DB_PORT ||
          '3306',
        10,
      ),

    username:
      process.env.DB_USERNAME ||
      'root',

    password:
      process.env.DB_PASSWORD ||
      '',

    database:
      process.env.DB_NAME ||
      'task_pm_system',

    charset:
      'utf8mb4',

    synchronize:
      false,

    logging:
      process.env.DB_LOGGING ===
      'true',

    entities: [
      __dirname +
        '/../modules/**/entities/*.entity{.ts,.js}',
    ],

    migrations: [
      __dirname +
        '/migrations/*{.ts,.js}',
    ],
  });