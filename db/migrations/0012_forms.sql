-- Up Migration
-- Module forms: PHIẾU ĐÁNH GIÁ (thuộc 1 lĩnh vực) gồm n CÂU HỎI. File Excel được nhập cho một phiếu;
-- cột câu hỏi trong file ghép với câu hỏi của phiếu theo số thứ tự ("1. …" ↔ câu 1).
--   field 1 ──< form 1 ──< form_question
--               form 1 ──< survey_round (đợt) ──< round_answer

CREATE SEQUENCE form_code_seq;

CREATE TABLE form (
  id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        text NOT NULL UNIQUE DEFAULT ('PH' || lpad(nextval('form_code_seq')::text, 4, '0')),  -- mã cố định PH0001…
  name        text NOT NULL,
  field_id    smallint NOT NULL REFERENCES field,          -- mỗi phiếu thuộc đúng 1 lĩnh vực
  description text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ix_form_field ON form (field_id);

CREATE TABLE form_question (
  form_id int      NOT NULL REFERENCES form ON DELETE CASCADE,
  q_no    smallint NOT NULL CHECK (q_no > 0),              -- số thứ tự câu, khớp đầu số trong file Excel
  text    text     NOT NULL,
  kind    text     NOT NULL DEFAULT 'SCALE' CHECK (kind IN ('SCALE','TEXT')),  -- thang 5 mức / tự luận
  PRIMARY KEY (form_id, q_no)
);

-- Lô nhập và đợt gắn với phiếu (NULL = dữ liệu nhập trước khi có module phiếu)
ALTER TABLE import_batch ADD COLUMN form_id int REFERENCES form;
ALTER TABLE survey_round ADD COLUMN form_id int REFERENCES form;
CREATE INDEX ix_round_form ON survey_round (form_id);

-- Đợt đánh số riêng theo (phiếu, đối tượng): đối tượng X có đợt 1, 2, 3… cho phiếu A, và đợt 1, 2… cho phiếu B
ALTER TABLE survey_round DROP CONSTRAINT survey_round_subject_id_round_no_key;
ALTER TABLE survey_round ADD CONSTRAINT ux_round_form_subject_no UNIQUE NULLS NOT DISTINCT (form_id, subject_id, round_no);

GRANT USAGE ON SEQUENCE form_code_seq TO app_rw;
