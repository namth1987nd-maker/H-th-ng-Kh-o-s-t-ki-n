-- Up Migration
-- Vai trò app_rw / app_ro thường được tạo sẵn kèm mật khẩu bởi db/init/01-roles.sh (Docker).
-- Nhánh dưới chỉ để migration chạy được trên DB trống (test, CI): tạo vai trò NOLOGIN nếu chưa có.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_rw') THEN CREATE ROLE app_rw NOLOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_ro') THEN CREATE ROLE app_ro NOLOGIN; END IF;
END $$;

GRANT USAGE ON SCHEMA public TO app_rw, app_ro;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_ro;

-- nhật ký và báo cáo đã xuất: chỉ thêm, không sửa, không xóa
REVOKE UPDATE, DELETE ON audit_log, report_run FROM app_rw;

GRANT EXECUTE ON FUNCTION refresh_all_mv(), rollback_batch(bigint) TO app_rw;

-- bảng tạo ở các migration sau cũng tự cấp quyền tương tự
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO app_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_rw;
