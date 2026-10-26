#!/bin/sh
# Container start-up for the backend.
#   RUN_MIGRATIONS (default true)  - apply pending DB migrations before start
#   RUN_SEED       (default false) - create the initial roles/admin/demo data.
#                                    The seed refuses to run if users already
#                                    exist, so it is safe, but set it back to
#                                    false after the first successful start.
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Running database migrations..."
  npm run migration:run
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Running seed..."
  npm run seed || echo "[entrypoint] Seed did not run (data may already exist). Continuing."
fi

echo "[entrypoint] Starting API..."
exec node dist/main
