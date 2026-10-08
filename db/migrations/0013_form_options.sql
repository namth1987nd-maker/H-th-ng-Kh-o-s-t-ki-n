-- Up Migration
-- Đáp án của từng câu hỏi trong phiếu (a, b, c, d, e…), và loại câu "lựa chọn".
--   form 1 ──< form_question 1 ──< form_option
--   round_answer.opt_key → đáp án mà người trả lời đã chọn

-- Loại câu: SCALE = thang đánh giá (tính % hài lòng), CHOICE = lựa chọn (chỉ đếm), TEXT = tự luận
ALTER TABLE form_question DROP CONSTRAINT form_question_kind_check;
ALTER TABLE form_question ADD CONSTRAINT form_question_kind_check CHECK (kind IN ('SCALE','CHOICE','TEXT'));

CREATE TABLE form_option (
  form_id int      NOT NULL,
  q_no    smallint NOT NULL,
  opt_key text     NOT NULL CHECK (opt_key ~ '^[a-z]$'),   -- a, b, c…
  text    text     NOT NULL,
  -- điểm quy đổi (5 = tốt nhất) cho câu thang đánh giá; NULL với câu lựa chọn.
  -- Hài lòng = điểm ≥ 4 (đáp án a, b).
  score   smallint CHECK (score BETWEEN 1 AND 5),
  PRIMARY KEY (form_id, q_no, opt_key),
  FOREIGN KEY (form_id, q_no) REFERENCES form_question (form_id, q_no) ON DELETE CASCADE
);

-- Đáp án đã chọn (NULL = tự luận hoặc câu trả lời không khớp đáp án nào của phiếu)
ALTER TABLE round_answer ADD COLUMN opt_key text;
CREATE INDEX ix_round_answer_opt ON round_answer (round_id, q_no, opt_key);
