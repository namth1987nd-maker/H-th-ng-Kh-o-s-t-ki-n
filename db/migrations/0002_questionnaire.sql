-- Up Migration
CREATE TABLE questionnaire (
  id              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  field_id        smallint NOT NULL REFERENCES field,
  version         int NOT NULL,
  valid_from_year smallint NOT NULL REFERENCES academic_year,
  valid_to_year   smallint REFERENCES academic_year,      -- NULL = đang dùng
  UNIQUE (field_id, version),
  UNIQUE (id, field_id)                                   -- để submission tham chiếu ghép
);

CREATE TABLE criterion (
  id               int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  questionnaire_id int NOT NULL REFERENCES questionnaire ON DELETE CASCADE,
  code             text NOT NULL,                         -- ổn định giữa các phiên bản
  grp              text,                                  -- nhóm: đề cương, phương pháp, kiểm tra đánh giá...
  text             text NOT NULL,
  sort_order       smallint NOT NULL,
  UNIQUE (questionnaire_id, code),
  UNIQUE (id, questionnaire_id)                           -- để answer tham chiếu ghép
);
