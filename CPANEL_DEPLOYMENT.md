# cPanel Deployment Guide

## Hosting requirements

This application requires cPanel's **Setup Node.js App** feature (CloudLinux Node.js Selector) or another Passenger-backed Node.js application facility. PHP-only shared hosting cannot run the NestJS API or Next.js server. Confirm that the provider supports long-running Node.js applications, environment variables, application restarts, and separate backend and frontend applications before deploying.

Use Node.js 20 or 22. The repository declares `>=20 <23`; Node.js 22 is the preferred current deployment target.

Create two HTTPS applications, normally:

- Frontend: `https://app.example.com`
- Backend: `https://api.example.com`

These should be same-site subdomains so the refresh cookie's `SameSite=Strict` policy works. In cPanel, set each application's root to its respective `frontend` or `backend` directory. If the UI asks for a startup file, use `dist/main.js` for the backend. For the frontend, the host must support the `npm run start -- -p "$PORT"` startup command or an equivalent Passenger configuration for Next.js; confirm this with the provider.

The repository also supports mounting both applications on one origin:

- Frontend: `https://example.com/`
- Backend application URL: `https://example.com/api`
- Public API URL: `https://example.com/api/v1`

For that layout, use `frontend/app.js` as the Passenger startup file, set backend `PUBLIC_BASE_PATH=api`, and set frontend `NEXT_PUBLIC_API_ORIGIN=https://example.com/api`. The application roots remain the separate `frontend` and `backend` directories; do not copy either source tree into the domain document root.

## MySQL setup

1. In **MySQL Databases**, create a database and a dedicated database user.
2. Grant that user all privileges on only the application database.
3. Record cPanel's fully qualified database and username values (often prefixed with the cPanel account name).
4. Use MySQL 8.0 or newer, `utf8mb4`, and a strong unique password.
5. Do not enable `DB_SYNCHRONIZE` in production; apply versioned migrations instead.

## Backend deployment

From the backend application root, using Node.js 20 or 22:

```bash
npm ci
npm run build
npm run migration:run
SEED_USER_PASSWORD='a-new-unique-temporary-password' npm run seed
npm run start:prod
```

Run the seed only on a new, empty database. It refuses to run when users already exist. Immediately sign in as the seeded administrator and replace the seeded password with a unique production password. Do not retain the password shown in development documentation.

Configure Passenger/cPanel to start the compiled application from `backend` with `dist/main.js`, a working directory of `backend`, and the cPanel-provided `PORT`. Restart the application after changing environment variables, migrations, or compiled files.

### Required backend environment

Set these in cPanel's Node.js application environment (never commit production values):

```dotenv
NODE_ENV=production
PORT=<provided-by-cPanel>
API_PREFIX=api/v1
PUBLIC_BASE_PATH=
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=<cpanel_database_user>
DB_PASSWORD=<strong_unique_database_password>
DB_NAME=<cpanel_database_name>
DB_SYNCHRONIZE=false
DB_LOGGING=false
JWT_ACCESS_SECRET=<at-least-32-random-characters>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=<different-at-least-32-random-characters>
JWT_REFRESH_EXPIRES_IN=60d
BCRYPT_SALT_ROUNDS=12
FAILED_LOGIN_LOCK_THRESHOLD=5
FAILED_LOGIN_LOCK_MINUTES=15
MAX_UPLOAD_FILE_SIZE_MB=25
CORS_ORIGIN=https://app.example.com
FRONTEND_URL=https://app.example.com
MAIL_HOST=<smtp-host>
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=<smtp-username>
MAIL_PASS=<smtp-password>
MAIL_FROM="Task Manager <no-reply@example.com>"
```

`CORS_ORIGIN` must be the exact externally visible frontend origin: scheme, hostname, and optional non-default port, with no path and no trailing slash. For example, use exactly `https://app.example.com`, not `https://app.example.com/` and not a wildcard. `FRONTEND_URL` must use the same public frontend origin so password-reset links are correct.

## Frontend deployment

Set the public API URL before building because Next.js embeds public environment values into the client bundle:

```dotenv
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
NEXT_PUBLIC_API_ORIGIN=https://api.example.com
```

When the backend is mounted at `/api` on the frontend domain, use:

```dotenv
NEXT_PUBLIC_API_URL=https://example.com/api/v1
NEXT_PUBLIC_API_ORIGIN=https://example.com/api
```

Then run from the frontend application root with Node.js 20 or 22:

```bash
npm ci
npm run build
npm run start -- -p "$PORT"
```

After changing `NEXT_PUBLIC_API_URL`, rebuild and restart the frontend. Do not deploy only the `.next` directory without its matching `package.json`, lockfile, public assets, and production dependencies.

## HTTPS, cookies, and CORS

Install valid TLS certificates for both origins and force HTTPS before accepting users. In production the refresh cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, and scoped to the configured API prefix's `/auth` path. Browsers will not send it over HTTP. Verify that the reverse proxy preserves HTTPS and forwards cookies. Keep frontend and backend on same-site HTTPS subdomains; cross-site hosting is incompatible with the current strict cookie policy.

## Persistent uploads and backups

`backend/storage` must be persistent and writable by the Node.js application user. Do not place it in an ephemeral release directory or replace it during deployment. Attachments are authorization-protected; do not expose `backend/storage/attachments` as a public directory.

Back up both of these on a tested schedule:

- A consistent MySQL dump, with retention and encrypted off-site copies.
- The complete `backend/storage` tree, captured in coordination with the database backup so file records and stored files remain aligned.

Test restoration into a non-production environment. A database-only backup does not restore uploaded files.

## Pre-deployment checks

Run these using Node.js 20 or 22 before uploading a release:

```bash
cd backend
npm ci
npm test -- --runInBand
npm run build
npm run verify:i18n

cd ../frontend
npm ci
npx tsc --noEmit
npm run build

cd ..
git diff --check
```

Also confirm the production database backup, storage backup, DNS, TLS certificates, SMTP credentials, exact CORS origin, strong independent JWT secrets, and a rollback plan.

## Post-deployment smoke tests

Perform these through the public HTTPS origins, using at least an administrator and a normal user:

1. Open the login and registration pages on desktop and mobile widths; confirm English and Arabic layouts.
2. Register a normal user, log in, refresh the browser, wait for an access-token refresh, and log out. Confirm logout clears the refresh cookie.
3. Request a password-reset email, inspect the HTTPS link, reset the password once, and confirm the token cannot be reused.
4. As administrator, create and edit a branch, department, user, project, task, setting, branding value, dictionary entry, and workflow configuration.
5. Assign a task to a normal user; accept/reject or reassign it as allowed; exercise status changes and approval decisions with permitted and forbidden roles.
6. Add comments, ratings, and an allowed attachment. Download it as an authorized user and confirm an unrelated user receives a denial. Reject an invalid file type and an oversized file.
7. Confirm notifications and unread counts update for the intended recipient and that outbound SMTP delivery succeeds.
8. Open reports and audit logs; verify the actions just performed appear with correct actor and target data.
9. Upload an avatar and branding asset, restart both applications, and confirm all uploaded files remain available.
10. Check browser developer tools for failed API calls, CORS errors, insecure requests, cookie warnings, untranslated text, and server errors.
11. Restart the Passenger applications from cPanel and repeat login, refresh, API health, and upload-download checks.
12. Verify a database dump and storage backup can be created, then perform a documented restore rehearsal outside production.
