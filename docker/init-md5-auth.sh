#!/bin/bash
# Force md5 password encryption so Prisma/libpq on Windows can authenticate
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER SYSTEM SET password_encryption = 'md5';
EOSQL

# Reload config
pg_ctl reload -D "$PGDATA"

# Re-set the password so it's stored as md5
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER USER "$POSTGRES_USER" PASSWORD '$POSTGRES_PASSWORD';
EOSQL
