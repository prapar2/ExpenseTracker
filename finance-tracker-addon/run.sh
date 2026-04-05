#!/usr/bin/with-contenv bashio

# ── Environment ────────────────────────────────────────────────────────────
export DB_PATH="/data/finance.db"
export PORT="3001"
export BACKUP_CREDENTIALS_PATH="/data/google-oauth.json"
export BACKUP_SCHEDULE="0 0 * * 0"

# Read user-configured options from HA add-on config
export GOOGLE_OAUTH_CLIENT_ID="$(bashio::config 'GOOGLE_OAUTH_CLIENT_ID')"
export GOOGLE_OAUTH_CLIENT_SECRET="$(bashio::config 'GOOGLE_OAUTH_CLIENT_SECRET')"
export GOOGLE_OAUTH_REDIRECT_URI="$(bashio::config 'GOOGLE_OAUTH_REDIRECT_URI')"
export BACKUP_SYSTEM_NAME="$(bashio::config 'BACKUP_SYSTEM_NAME')"

# BACKUP_ENABLED: bashio returns boolean true/false, server.js expects string "true"
if bashio::config.true 'BACKUP_ENABLED'; then
  export BACKUP_ENABLED="true"
else
  export BACKUP_ENABLED="false"
fi

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