-- Up Migration
CREATE TABLE import_batch (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id     uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  year_id       smallint NOT NULL REFERENCES academic_year,
  file_name     text NOT NULL,
  file_sha256   bytea NOT NULL,
  reverse_scale boolean NOT NULL DEFAULT false,
  status        text NOT NULL CHECK (status IN ('STAGED','COMMITTED','ROLLED_BACK','FAILED')),
  n_submissions int NOT NULL DEFAULT 0,
  n_answers     int NOT NULL DEFAULT 0,
  created_by    int REFERENCES app_user,
  created_at    timestamptz NOT NULL DEFAULT now(),
  committed_at  timestamptz
);
-- chặn nhập trùng cùng một file, nhưng cho nhập lại sau khi đã hoàn tác
CREATE UNIQUE INDEX ux_batch_file ON import_batch (file_sha256) WHERE status = 'COMMITTED';

CREATE TABLE stg_row (                                     -- dữ liệu thô, chờ kiểm tra
  batch_id bigint NOT NULL REFERENCES import_batch ON DELETE CASCADE,
  sheet    text   NOT NULL,
  row_no   int    NOT NULL,
  data     jsonb  NOT NULL,
  PRIMARY KEY (batch_id, sheet, row_no)
);

CREATE TABLE import_error (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id bigint NOT NULL REFERENCES import_batch ON DELETE CASCADE,
  sheet    text NOT NULL,
  row_no   int  NOT NULL,
  col_name text,
  code     text NOT NULL,                                 -- MISSING_COLUMN, SCORE_RANGE, DUPLICATE, UNKNOWN_STAFF...
  message  text NOT NULL
);
CREATE INDEX ix_import_error_batch ON import_error (batch_id);

-- mẫu ánh xạ cột Excel, dùng lại cho các năm sau
CREATE TABLE column_mapping (
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text NOT NULL UNIQUE,
  field_id   smallint NOT NULL REFERENCES field,
  mapping    jsonb NOT NULL,
  created_by int REFERENCES app_user,
  created_at timestamptz NOT NULL DEFAULT now()
);
