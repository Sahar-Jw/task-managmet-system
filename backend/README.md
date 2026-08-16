# Enterprise Task & Project Management System — Backend

NestJS + TypeORM + mysql implementation of the SRS (`SRS_Task_Project_Management_System.pdf`).
This has been built, compiled, migrated against a real mysql instance, and
exercised end-to-end (login, RBAC, task lifecycle, audit trail) during development.

## Stack

- **Framework:** NestJS 10 (modular architecture, Guards, Interceptors, Filters)
- **ORM:** TypeORM 0.3 with versioned migrations (no `synchronize` in production)
- **Database:** mysql 16
- **Auth:** JWT access tokens (15m) + rotating refresh tokens in an HttpOnly/Secure cookie
- **Docs:** OpenAPI/Swagger, auto-generated from decorators

## Project layout

```
src/
├── main.ts                 # bootstrap: helmet, CORS, ValidationPipe, Swagger
├── app.module.ts            # wires all 14 feature modules + global providers
├── common/                  # decorators, guards, interceptors, filters, utils
├── config/                  # typed configuration + env validation
├── database/
│   ├── data-source.ts        # TypeORM CLI datasource
│   ├── migrations/           # versioned schema migrations
│   └── seeds/run-seed.ts     # bootstraps Roles, one Branch, one Department, one Admin
├── shared/
│   ├── entities/              # BaseEntity, VersionedEntity (optimistic locking)
│   └── enums/                 # TaskStatus, AssignmentStatus, RoleName, etc.
└── modules/
    ├── auth/                  # login, refresh, logout, forgot/reset password
    ├── roles/, branches/, departments/, users/
    ├── projects/, tasks/
    ├── task-assignments/, assignment-approvals/
    ├── task-ratings/, task-comments/, task-attachments/
    ├── notifications/, audit-logs/, reports/
```

Every module follows the same shape: `*.module.ts`, `*.controller.ts`,
`*.service.ts`, `entities/*.entity.ts`, `dto/*.dto.ts`.

## Business rules & non-functional requirements

All 85 Business Rules (BR-001–BR-085) from SRS Section 2 are implemented at
the layer where they belong:

- **Database constraints** — CHECK constraints (e.g. no self-parenting tasks,
  rating 1–5, attachment single-ownership), UNIQUE constraints (branch/department
  codes, project names per branch, one rating per rater), FK integrity.
- **Service-layer validation** — anything requiring a DB lookup: circular
  task-hierarchy detection (BR-030), status-transition matrix (BR-032–036),
  cascade deactivation (BR-008), last-Admin protection (BR-021), etc.
- **Guards** — `JwtAuthGuard`, `RolesGuard` (server-side RBAC — NFR-SEC-04),
  `SelfOrAdminGuard` (ownership checks — BR-012, BR-071).
- **Audit trail** — every state-changing service call writes through
  `AuditLogsService.record()`, the only write path into `audit_logs`. The
  table is additionally protected by a mysql trigger that rejects any
  `UPDATE`/`DELETE` at the database level (BR-076, NFR-AUD-02).

Non-functional requirements are addressed via: Helmet security headers,
rate limiting (`@nestjs/throttler`), optimistic locking (`@VersionColumn`),
structured JSON logging with request IDs, a global exception-filter pair
producing the standard `{statusCode, message, error, timestamp, path}`
error envelope, pagination on all list endpoints, and Swagger docs at
`/api/v1/docs`.

## Getting started

```bash
npm install
cp .env.example .env      # edit DB credentials / JWT secrets
npm run migration:run     # creates schema, enums, indexes, triggers
npm run seed               # creates Roles, one Branch/Department, one Admin
npm run start:dev
```

Default seeded Admin login (**change immediately**):
```
email:    admin@example.com
password: ChangeMe123!
```

Swagger UI: `http://localhost:3000/api/v1/docs`

### Environment variables

See `.env.example` for the full list (DB connection, JWT secrets/expiry,
bcrypt cost, account-lock threshold, max upload size, CORS origin).

### Useful scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` | Compile to `dist/` |
| `npm run migration:generate -- src/database/migrations/<Name>` | Generate a migration from entity diffs |
| `npm run migration:run` / `migration:revert` | Apply / roll back migrations |
| `npm run seed` | Seed Roles, Branch, Department, Admin |
| `npm run lint` | ESLint |

## API surface

Base path: `/api/v1`. Every endpoint from SRS Section 7 is implemented,
including auth, users, branches, departments, projects, tasks (with
sub-tasks and status transitions), task assignments (assign/accept/reject/
reassign), assignment approvals, ratings, comments, attachments (multipart
upload with MIME/extension allow-listing — NFR-SEC-06), notifications,
audit-log search, and the three Admin reports (task summary, user
performance, branch overview).

## What's out of scope (matches SRS 12.5)

Native mobile apps, third-party calendar sync, time tracking, and
multi-currency billing are explicitly out of scope for v1, per the SRS.
Two integration points are intentionally left as stubs for a production
deployment to wire up: transactional email delivery (password reset,
notifications) and a dedicated password-reset-token table.
