-- Up Migration
-- Module subjects: kết quả trả lời theo ĐỐI TƯỢNG, mỗi lần nhập là một ĐỢT riêng (không gộp).
--   survey_subject  1 ──< survey_round 1 ──< round_question
--                                       1 ──< round_response 1 ──< round_answer

CREATE SEQUENCE survey_subject_code_seq;

CREATE TABLE survey_subject (                              -- đối tượng
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- mã cố định, cấp một lần, không đổi, không trùng: DT0001, DT0002, ...
  code       text NOT NULL UNIQUE DEFAULT ('DT' || lpad(nextval('survey_subject_code_seq')::text, 4, '0')),
  name       text NOT NULL,                                -- tên như trong file lần đầu gặp
  name_norm  text NOT NULL UNIQUE,                         -- khóa so khớp: NFC, chữ thường, gộp khoảng trắng
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE survey_round (                                -- một đợt khảo sát của một đối tượng
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subject_id  int      NOT NULL REFERENCES survey_subject,
  batch_id    bigint   NOT NULL REFERENCES import_batch ON DELETE CASCADE,
  round_no    int      NOT NULL CHECK (round_no > 0),      -- đợt 1, 2, 3... theo từng đối tượng
  year_id     smallint NOT NULL REFERENCES academic_year,
  n_responses int      NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, round_no),
  UNIQUE (subject_id, batch_id)                            -- một lô chỉ tạo một đợt cho mỗi đối tượng
);
CREATE INDEX ix_round_batch ON survey_round (batch_id);

CREATE TABLE round_question (                              -- câu hỏi của đợt (lấy từ tiêu đề cột "1. ...")
  round_id bigint   NOT NULL REFERENCES survey_round ON DELETE CASCADE,
  q_no     smallint NOT NULL,                              -- số thứ tự đầu câu
  text     text     NOT NULL,
  PRIMARY KEY (round_id, q_no)
);

CREATE TABLE round_response (                              -- một phiếu (một dòng Excel)
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  round_id     bigint NOT NULL REFERENCES survey_round ON DELETE CASCADE,
  source_row   int    NOT NULL,                            -- dòng trong file gốc → truy ngược
  submitted_at timestamptz,                                -- cột "Dấu thời gian" của Google Form
  extra        jsonb,                                      -- cột khác không phải câu hỏi (không lưu email/họ tên)
  UNIQUE (round_id, source_row),
  UNIQUE (id, round_id)
);

CREATE TABLE round_answer (                                -- một câu trả lời
  response_id bigint   NOT NULL,
  round_id    bigint   NOT NULL,
  q_no        smallint NOT NULL,
  value_text  text     NOT NULL,                           -- giá trị gốc ("Rất hài lòng", "5", ý kiến tự do...)
  score       smallint CHECK (score BETWEEN 1 AND 5),      -- 5 = Rất hài lòng; NULL = câu tự luận / không quy đổi được
  PRIMARY KEY (response_id, q_no),
  FOREIGN KEY (response_id, round_id) REFERENCES round_response (id, round_id) ON DELETE CASCADE,
  FOREIGN KEY (round_id, q_no)        REFERENCES round_question (round_id, q_no) ON DELETE CASCADE
);
CREATE INDEX ix_round_answer_q ON round_answer (round_id, q_no) INCLUDE (score);

-- Hoàn tác lô: xóa cả dữ liệu cũ (submission) lẫn các đợt đã tạo từ lô này
CREATE OR REPLACE FUNCTION rollback_batch(p_batch bigint) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM submission   WHERE batch_id = p_batch;
  DELETE FROM survey_round WHERE batch_id = p_batch;
  UPDATE import_batch SET status = 'ROLLED_BACK', n_submissions = 0, n_answers = 0
   WHERE id = p_batch AND status = 'COMMITTED';
END $$;

GRANT USAGE ON SEQUENCE survey_subject_code_seq TO app_rw;
