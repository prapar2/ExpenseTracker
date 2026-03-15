#!/usr/bin/with-contenv bashio

# ── Environment ────────────────────────────────────────────────────────────
export DB_PATH="/data/finance.db"
export PORT="3001"

# ── First-run database initialisation ─────────────────────────────────────
if [ ! -f "${DB_PATH}" ]; then
    bashio::log.info "First run — initialising database..."
    sqlite3 "${DB_PATH}" < /app/server/schema.sql
    bashio::log.info "Seeding taxonomy..."
    node /app/server/seed.js
    bashio::log.info "Database ready."
fi

# ── Start app — exec replaces the shell process, s6 monitors Node directly
bashio::log.info "Starting Finance Tracker on port ${PORT}..."
exec node /app/server/server.js