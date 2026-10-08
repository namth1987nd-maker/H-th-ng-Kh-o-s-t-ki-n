// Kiểm tra cỡ mẫu (mục 5.7 c, d).
import { sql } from "kysely";
import { db, num } from "@/core/db";

/** c) Lĩnh vực 1: số phiếu / nhà giáo so với mức tối thiểu của năm học. */
export async function teachingSampleCheck(yearId: number) {
  const { rows } = await sql<{
    code: string; full_name: string; n_submissions: string; required: string | null; passed: boolean | null;
  }>`
    SELECT st.code, st.full_name,
           SUM(m.n_submissions) AS n_submissions,
           rule_value(1::smallint, 'NGUOI_HOC', 'MIN_PER_STAFF', ${yearId}::smallint) AS required,
           SUM(m.n_submissions) >= rule_value(1::smallint, 'NGUOI_HOC', 'MIN_PER_STAFF', ${yearId}::smallint) AS passed
    FROM mv_sat_staff_course_year m
    JOIN staff st ON st.id = m.staff_key
    WHERE m.year_id = ${yearId} AND m.field_id = 1 AND m.staff_key <> 0
    GROUP BY st.id, st.code, st.full_name
    ORDER BY passed, st.full_name
  `.execute(db());
  return rows.map((r) => ({
    staffCode: r.code, fullName: r.full_name, nSubmissions: num(r.n_submissions),
    required: r.required === null ? null : num(r.required), passed: r.passed,
  }));
}

/**
 * d) Lĩnh vực 4–7: số NGƯỜI trả lời / tổng thể. Đếm theo người (hash) chứ không theo phiếu,
 * phiếu không có hash thì mỗi phiếu tính một người.
 */
export async function ratioSampleCheck(yearId: number) {
  const { rows } = await sql<{
    field_id: number; group_code: string; n_respondents: string; population: string;
    required: string | null; passed: boolean | null;
  }>`
    SELECT s.field_id, s.group_code,
           count(DISTINCT COALESCE(s.respondent_hash, int8send(s.id))) AS n_respondents,
           p.total AS population,
           rule_value(s.field_id, s.group_code, 'MIN_RATIO', s.year_id) AS required,
           count(DISTINCT COALESCE(s.respondent_hash, int8send(s.id)))::numeric / p.total
             >= rule_value(s.field_id, s.group_code, 'MIN_RATIO', s.year_id) AS passed
    FROM submission s
    JOIN population p ON p.year_id = s.year_id AND p.group_code = s.group_code AND p.unit_id IS NULL
    WHERE s.year_id = ${yearId} AND s.field_id IN (4,5,6,7)
    GROUP BY s.field_id, s.group_code, s.year_id, p.total
    ORDER BY s.field_id, s.group_code
  `.execute(db());
  return rows.map((r) => ({
    fieldId: r.field_id, groupCode: r.group_code,
    nRespondents: num(r.n_respondents), population: num(r.population),
    required: r.required === null ? null : Number(r.required), passed: r.passed,
  }));
}
