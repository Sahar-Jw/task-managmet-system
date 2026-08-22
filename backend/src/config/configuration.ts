export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port:
  parseInt(
    process.env.PORT ||
      '3000',
    10,
  ),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'task_pm_system',
synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '60d',
  },

  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),
    failedLoginLockThreshold: parseInt(
      process.env.FAILED_LOGIN_LOCK_THRESHOLD || '5',
      10,
    ),
    failedLoginLockMinutes: parseInt(
      process.env.FAILED_LOGIN_LOCK_MINUTES || '15',
      10,
    ),
  },

  uploads: {
    // Hard infra ceiling enforced by Multer at boot. The actual
    // day-to-day limit admins see/edit lives in Settings > Task Defaults
    // (settings.key = MAX_ATTACHMENT_SIZE_MB) and can only be set at or
    // below this ceiling — raising it further requires changing this env
    // var and restarting the server.
    maxFileSizeMb: parseInt(process.env.MAX_UPLOAD_FILE_SIZE_MB || '100', 10),
  },

  mail: {
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587', 10),
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    from: process.env.MAIL_FROM || 'no-reply@example.com',
  },

  // Base URL of the Next.js app — used to build the link inside the
  // password-reset email (e.g. `${frontendUrl}/reset-password?token=...`).
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
});