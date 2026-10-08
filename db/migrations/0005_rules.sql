-- Up Migration
CREATE TABLE sample_rule (
  id              int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  field_id        smallint NOT NULL REFERENCES field,
  group_code      text     NOT NULL REFERENCES respondent_group,
  kind            text     NOT NULL CHECK (kind IN ('MIN_PER_STAFF','MIN_TOTAL','MIN_RATIO')),
  min_value       numeric(10,4) NOT NULL CHECK (min_value > 0),   -- 50, 200 hoặc 0.30
  valid_from_year smallint NOT NULL REFERENCES academic_year,
  valid_to_year   smallint REFERENCES academic_year,
  note            text
);

CREATE TABLE setting (
  key             text NOT NULL,                          -- 'satisfaction_threshold', 'decline_tolerance_pp'
  value           jsonb NOT NULL,
  valid_from_year smallint NOT NULL REFERENCES academic_year,
  PRIMARY KEY (key, valid_from_year)
);

CREATE TABLE population (                                   -- mẫu số cho quy tắc tỷ lệ
  id         int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  year_id    smallint NOT NULL REFERENCES academic_year,
  group_code text NOT NULL REFERENCES respondent_group,
  unit_id    int REFERENCES org_unit,                     -- NULL = toàn trường
  total      int NOT NULL CHECK (total > 0),
  source     text
);
CREATE UNIQUE INDEX ux_population ON population (year_id, group_code, unit_id) NULLS NOT DISTINCT;

-- lấy giá trị quy tắc đang hiệu lực tại một năm học
CREATE FUNCTION rule_value(p_field smallint, p_group text, p_kind text, p_year smallint)
RETURNS numeric LANGUAGE sql STABLE AS $$
  SELECT r.min_value
  FROM sample_rule r
  JOIN academic_year f ON f.id = r.valid_from_year
  LEFT JOIN academic_year t ON t.id = r.valid_to_year
  JOIN academic_year y ON y.id = p_year
  WHERE r.field_id = p_field AND r.group_code = p_group AND r.kind = p_kind
    AND f.start_date <= y.start_date
    AND (t.id IS NULL OR t.start_date >= y.start_date)
  ORDER BY f.start_date DESC
  LIMIT 1
$$;

CREATE FUNCTION setting_for(p_key text, p_year smallint)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT s.value
  FROM setting s
  JOIN academic_year f ON f.id = s.valid_from_year
  JOIN academic_year y ON y.id = p_year
  WHERE s.key = p_key AND f.start_date <= y.start_date
  ORDER BY f.start_date DESC
  LIMIT 1
$$;
