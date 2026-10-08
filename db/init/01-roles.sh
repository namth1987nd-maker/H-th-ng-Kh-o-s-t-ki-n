#!/bin/bash
# Chạy một lần khi Postgres khởi tạo volume mới (docker-entrypoint-initdb.d).
# Tạo vai trò ứng dụng kèm mật khẩu lấy từ biến môi trường, tách khỏi migration.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<EOSQL
CREATE ROLE app_rw LOGIN PASSWORD '${APP_RW_PASSWORD}';
CREATE ROLE app_ro LOGIN PASSWORD '${APP_RO_PASSWORD}';
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO app_rw, app_ro;
EOSQL
