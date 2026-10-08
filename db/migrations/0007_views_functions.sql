-- Up Migration

-- Tổng hợp theo lĩnh vực × năm
CREATE MATERIALIZED VIEW mv_sat_field_year AS
SELECT s.year_id, s.field_id,
       count(DISTINCT s.id)                  AS n_submissions,
       count(*)                              AS n_answers,
       count(*) FILTER (WHERE a.score >= 4)  AS n_satisfied
FROM answer a JOIN submission s ON s.id = a.submission_id
GROUP BY s.year_id, s.field_id;
CREATE UNIQUE INDEX ON mv_sat_field_year (year_id, field_id);

-- Theo tiêu chí × năm, kèm phân phối 5 mức (ghép theo criterion.code giữa các năm)
CREATE MATERIALIZED VIEW mv_sat_criterion_year AS
SELECT s.year_id, s.field_id, c.code AS criterion_code,
       count(*)                              AS n_answers,
       count(*) FILTER (WHERE a.score >= 4)  AS n_satisfied,
       count(*) FILTER (WHERE a.score = 5)   AS n5,
       count(*) FILTER (WHERE a.score = 4)   AS n4,
       count(*) FILTER (WHERE a.score = 3)   AS n3,
       count(*) FILTER (WHERE a.score = 2)   AS n2,
       count(*) FILTER (WHERE a.score = 1)   AS n1
FROM answer a
JOIN submission s ON s.id = a.submission_id
JOIN criterion  c ON c.id = a.criterion_id
GROUP BY s.year_id, s.field_id, c.code;
CREATE UNIQUE INDEX ON mv_sat_criterion_year (year_id, field_id, criterion_code);

-- Theo đơn vị × năm (khóa 0 = không có đơn vị, để chỉ mục duy nhất làm mới đồng thời được)
CREATE MATERIALIZED VIEW mv_sat_unit_year AS
SELECT s.year_id, s.field_id, COALESCE(s.unit_id, 0) AS unit_key,
       count(DISTINCT s.id)                  AS n_submissions,
       count(*)                              AS n_answers,
       count(*) FILTER (WHERE a.score >= 4)  AS n_satisfied
FROM answer a JOIN submission s ON s.id = a.submission_id
GROUP BY s.year_id, s.field_id, COALESCE(s.unit_id, 0);
CREATE UNIQUE INDEX ON mv_sat_unit_year (year_id, field_id, unit_key);

-- Theo nhà giáo × học phần × năm (một phiếu thuộc đúng một nhà giáo × học phần nên cộng được)
CREATE MATERIALIZED VIEW mv_sat_staff_course_year AS
SELECT s.year_id, s.field_id,
       COALESCE(s.staff_id, 0)  AS staff_key,
       COALESCE(s.course_id, 0) AS course_key,
       count(DISTINCT s.id)                  AS n_submissions,
       count(*)                              AS n_answers,
       count(*) FILTER (WHERE a.score >= 4)  AS n_satisfied
FROM answer a JOIN submission s ON s.id = a.submission_id
GROUP BY s.year_id, s.field_id, COALESCE(s.staff_id, 0), COALESCE(s.course_id, 0);
CREATE UNIQUE INDEX ON mv_sat_staff_course_year (year_id, field_id, staff_key, course_key);

-- Làm mới tất cả view (worker gọi sau mỗi lô nhập hoặc hoàn tác).
-- SECURITY DEFINER: app_rw không sở hữu view nên không tự REFRESH được.
CREATE FUNCTION refresh_all_mv() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sat_field_year;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sat_criterion_year;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sat_unit_year;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sat_staff_course_year;
END $$;

-- Hoàn tác một lô: xóa phiếu (câu trả lời xóa theo cascade), giữ lại bản ghi lô
CREATE FUNCTION rollback_batch(p_batch bigint) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM submission WHERE batch_id = p_batch;
  UPDATE import_batch SET status = 'ROLLED_BACK', n_submissions = 0, n_answers = 0
   WHERE id = p_batch AND status = 'COMMITTED';
END $$;
