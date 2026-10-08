-- Up Migration
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- Sắp xếp tiếng Việt cần ICU. Bản PostgreSQL không có ICU (vd. bản nhúng khi chạy local) thì
-- dùng tạm collation "C" cùng tên để schema vẫn chạy; chỉ khác thứ tự sắp xếp, không ảnh hưởng số liệu.
DO $$
BEGIN
  CREATE COLLATION IF NOT EXISTS vi_vn (provider = icu, locale = 'vi-VN');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Không có ICU, vi_vn dùng tạm collation C: %', SQLERRM;
  CREATE COLLATION IF NOT EXISTS vi_vn FROM "C";
END $$;

-- unaccent() mặc định không IMMUTABLE nên không dùng được trong chỉ mục; bọc lại
CREATE FUNCTION immutable_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$;

CREATE TABLE app_user (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL,
  full_name  text NOT NULL,
  role       text NOT NULL CHECK (role IN ('ADMIN','OFFICER','LEADER','VIEWER')),
  unit_id    int,                                         -- phạm vi xem (FK thêm bên dưới)
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_app_user_email ON app_user (lower(email));

CREATE TABLE org_unit (                                    -- khoa / ngành / bộ môn
  id        int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code      text NOT NULL UNIQUE,
  name      text NOT NULL,
  kind      text NOT NULL CHECK (kind IN ('KHOA','NGANH','BO_MON','PHONG_BAN')),
  parent_id int REFERENCES org_unit
);
ALTER TABLE app_user ADD FOREIGN KEY (unit_id) REFERENCES org_unit;

CREATE TABLE staff (                                       -- giảng viên, GVCN, lãnh đạo, cán bộ quản lý
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  full_name  text NOT NULL COLLATE vi_vn,
  staff_type text NOT NULL CHECK (staff_type IN ('GIANG_VIEN','GVCN','LANH_DAO','CAN_BO')),
  unit_id    int REFERENCES org_unit,
  active     boolean NOT NULL DEFAULT true
);
CREATE INDEX ix_staff_name_trgm ON staff USING gin (immutable_unaccent(lower(full_name)) gin_trgm_ops);

CREATE TABLE staff_alias (                                 -- khớp tên khi Excel không có mã
  alias_norm text PRIMARY KEY,                             -- đã bỏ dấu, chữ thường, NFC
  staff_id   int NOT NULL REFERENCES staff ON DELETE CASCADE
);

CREATE TABLE course (
  id      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code    text NOT NULL UNIQUE,
  name    text NOT NULL COLLATE vi_vn,
  unit_id int REFERENCES org_unit
);

CREATE TABLE program (                                     -- chương trình đào tạo
  id      int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code    text NOT NULL UNIQUE,
  name    text NOT NULL COLLATE vi_vn,
  level   text,
  unit_id int REFERENCES org_unit
);

CREATE TABLE employer (                                    -- đơn vị sử dụng lao động
  id   int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL COLLATE vi_vn
);

CREATE TABLE academic_year (
  id         smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code       text NOT NULL UNIQUE,                         -- '2024-2025'
  start_date date NOT NULL,
  end_date   date NOT NULL CHECK (end_date > start_date)
);

CREATE TABLE field (                                       -- 8 lĩnh vực
  id   smallint PRIMARY KEY CHECK (id BETWEEN 1 AND 99),
  code text NOT NULL UNIQUE,
  name text NOT NULL
);

CREATE TABLE respondent_group (
  code text PRIMARY KEY,                                   -- NGUOI_HOC, CUU_NGUOI_HOC, GIANG_VIEN, DON_VI_SDLD, ...
  name text NOT NULL
);
