#!/usr/bin/with-contenv bashio

# ── Environment ────────────────────────────────────────────────────────────────
# /data is mounted by HAOS as persistent storage (survives add-on updates)
# Never store the DB in /app — it is wiped on every add-on rebuild
export DB_PATH="/data/finance.db"
export PORT="3001"

# ── First-run database initialisation ─────────────────────────────────────────
if [ ! -f "${DB_PATH}" ]; then
    bashio::log.info "First run detected — initialising database at ${DB_PATH}..."
    sqlite3 "${DB_PATH}" < /app/server/schema.sql
    bashio::log.info "Schema created. Seeding taxonomy..."
    node /app/server/seed.js
    bashio::log.info "Database initialised successfully."
fi

# ── Start application ──────────────────────────────────────────────────────────
bashio::log.info "Starting Personal Finance Tracker on port ${PORT}..."
cd /app && exec node server/server.js