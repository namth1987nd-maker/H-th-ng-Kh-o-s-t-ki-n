-- Up Migration
CREATE TABLE submission (                                  -- MỘT PHIẾU = MỘT NGƯỜI TRẢ LỜI
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id         bigint   NOT NULL REFERENCES import_batch ON DELETE CASCADE,
  year_id          smallint NOT NULL REFERENCES academic_year,
  semester         smallint CHECK (semester BETWEEN 1 AND 3),
  field_id         smallint NOT NULL REFERENCES field,
  questionnaire_id int      NOT NULL,
  group_code       text     NOT NULL REFERENCES respondent_group,
  unit_id          int      REFERENCES org_unit,         -- chụp lại tại thời điểm khảo sát
  staff_id         int      REFERENCES staff,
  course_id        int      REFERENCES course,
  program_id       int      REFERENCES program,
  employer_id      int      REFERENCES employer,
  channel          text     NOT NULL CHECK (channel IN ('PAPER','ONLINE','MEETING')),
  respondent_hash  bytea,                                -- HMAC-SHA256(mã người học); không lưu danh tính
  submitted_at     timestamptz,
  source_row       int      NOT NULL,                    -- dòng trong Excel gốc → truy ngược
  attrs            jsonb,                                -- chỉ cho lĩnh vực 8
  -- phiếu phải dùng đúng phiên bản bộ câu hỏi của lĩnh vực đó
  FOREIGN KEY (questionnaire_id, field_id) REFERENCES questionnaire (id, field_id),
  UNIQUE (id, questionnaire_id),
  -- đối tượng bắt buộc theo lĩnh vực (chỉnh lại sau khi thấy file Excel thật)
  CONSTRAINT ck_target_f1 CHECK (field_id <> 1 OR (staff_id IS NOT NULL AND course_id IS NOT NULL)),
  CONSTRAINT ck_target_f5 CHECK (field_id <> 5 OR employer_id IS NOT NULL),
  CONSTRAINT ck_target_f6 CHECK (field_id <> 6 OR program_id IS NOT NULL),
  CONSTRAINT ck_attrs_f8  CHECK (attrs IS NULL OR field_id = 8)
);
CREATE INDEX ix_sub_year_field_group ON submission (year_id, field_id, group_code);
CREATE INDEX ix_sub_staff            ON submission (staff_id, year_id) WHERE staff_id IS NOT NULL;
CREATE INDEX ix_sub_batch            ON submission (batch_id);
-- một người không đánh giá cùng một đối tượng hai lần trong cùng kỳ
CREATE UNIQUE INDEX ux_sub_dedupe ON submission
  (field_id, year_id, semester, respondent_hash, staff_id, course_id, program_id, employer_id)
  NULLS NOT DISTINCT
  WHERE respondent_hash IS NOT NULL;

CREATE TABLE answer (
  submission_id    bigint   NOT NULL,
  criterion_id     int      NOT NULL,
  questionnaire_id int      NOT NULL,
  score_raw        smallint NOT NULL CHECK (score_raw BETWEEN 1 AND 5),
  score            smallint NOT NULL CHECK (score     BETWEEN 1 AND 5),   -- 5 = Rất hài lòng
  PRIMARY KEY (submission_id, criterion_id),
  -- câu trả lời phải thuộc đúng phiên bản mà phiếu đã dùng
  FOREIGN KEY (submission_id, questionnaire_id) REFERENCES submission (id, questionnaire_id) ON DELETE CASCADE,
  FOREIGN KEY (criterion_id,  questionnaire_id) REFERENCES criterion  (id, questionnaire_id)
);
CREATE INDEX ix_answer_criterion ON answer (criterion_id) INCLUDE (submission_id, score);
