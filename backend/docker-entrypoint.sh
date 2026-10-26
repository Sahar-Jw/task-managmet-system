#!/bin/sh
# Container start-up for the backend.
#   RUN_MIGRATIONS (default true)  - apply pending DB migrations before start
#   RUN_SEED       (default false) - create the initial roles/admin/demo data.
#                                    The seed refuses to run if users already
#                                    exist, so it is safe, but set it back to
#                                    false after the first successful start.
set -e

# Diagnostics: show which database settings this container actually received.
# Values are printed inside [brackets] so stray spaces are visible. The
# password itself is NEVER printed, only its length and a few safety checks.
echo "[entrypoint] DB_HOST=[${DB_HOST:-<unset>}] DB_PORT=[${DB_PORT:-<unset>}] DB_USERNAME=[${DB_USERNAME:-<unset>}] DB_NAME=[${DB_NAME:-<unset>}]"
echo "[entrypoint] DB_PASSWORD length=${#DB_PASSWORD}"
case "$DB_PASSWORD" in
  *[[:space:]]*) echo "[entrypoint] WARNING: DB_PASSWORD contains whitespace" ;;
esac
case "$DB_PASSWORD" in
  \"*|\'*|*\"|*\') echo "[entrypoint] WARNING: DB_PASSWORD starts or ends with a quote character" ;;
esac

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
