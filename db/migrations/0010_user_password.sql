-- Up Migration
-- Đăng nhập nội bộ bằng mật khẩu (khi chưa có SSO). Chỉ lưu băm scrypt, không lưu mật khẩu.
ALTER TABLE app_user ADD COLUMN password_hash text;
