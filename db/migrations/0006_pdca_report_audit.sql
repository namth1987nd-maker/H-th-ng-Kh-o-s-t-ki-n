-- Up Migration
CREATE TABLE pdca_action (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year_id        smallint NOT NULL REFERENCES academic_year,
  field_id       smallint NOT NULL REFERENCES field,
  criterion_code text,
  unit_id        int REFERENCES org_unit,
  staff_id       int REFERENCES staff,
  course_id      int REFERENCES course,
  program_id     int REFERENCES program,
  trigger_type   text NOT NULL CHECK (trigger_type IN ('BELOW_THRESHOLD','DECLINED')),
  n_answers      int NOT NULL,
  n_satisfied    int NOT NULL,
  prev_n_answers int,
  prev_n_satisfied int,
  cause          text,                                    -- Plan: nguyên nhân
  solution       text,                                    -- Plan: giải pháp
  owner_id       int REFERENCES app_user,
  due_date       date,
  status         text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','DONE','VERIFIED')),
  check_note     text,                                    -- Check
  act_note       text,                                    -- Act
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- không sinh trùng cảnh báo cho cùng phạm vi
CREATE UNIQUE INDEX ux_pdca_scope ON pdca_action
  (year_id, field_id, criterion_code, unit_id, staff_id, course_id, program_id, trigger_type)
  NULLS NOT DISTINCT;

CREATE TABLE report_run (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_id     uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  year_id       smallint NOT NULL REFERENCES academic_year,
  type          text NOT NULL,
  format        text NOT NULL CHECK (format IN ('docx','xlsx','pdf')),
  params        jsonb NOT NULL,
  data_snapshot jsonb NOT NULL,                           -- toàn bộ số liệu đã dùng, đóng băng
  batch_ids     bigint[] NOT NULL,                        -- các lô dữ liệu đã dùng (không FK, để còn dấu vết sau hoàn tác)
  template_ver  text,
  app_version   text,
  file_path     text NOT NULL,
  file_sha256   bytea NOT NULL,
  created_by    int REFERENCES app_user,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    int REFERENCES app_user,
  action     text NOT NULL,                               -- IMPORT_COMMIT, IMPORT_ROLLBACK, REPORT_EXPORT, RULE_CHANGE...
  entity     text NOT NULL,
  entity_id  text,
  detail     jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_time ON audit_log (created_at DESC);
