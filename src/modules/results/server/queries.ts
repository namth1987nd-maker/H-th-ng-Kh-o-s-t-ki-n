// Truy vấn kết quả trả lời (mục 5.7 a, b). Module results sở hữu các materialized view mv_sat_*.
// Tỷ lệ = n_satisfied / n_answers; so ngưỡng bằng phép nhân trên numeric nên đúng 70,00% không bị cảnh báo.
import { sql } from "kysely";
import { db, num } from "@/core/db";

export interface FieldYearRow {
  yearId: number;
  yearCode: string;
  fieldId: number;
  nSubmissions: number;
  nAnswers: number;
  nSatisfied: number;
  prevNAnswers: number | null;
  prevNSatisfied: number | null;
  belowThreshold: boolean;
}

/** a) Theo lĩnh vực × năm, kèm số đếm năm trước để lớp trên tính "giảm" bằng số nguyên. */
export async function fieldSummaryByYear(): Promise<FieldYearRow[]> {
  const { rows } = await sql<{
    year_id: number; year_code: string; field_id: number;
    n_submissions: string; n_answers: string; n_satisfied: string;
    prev_n_answers: string | null; prev_n_satisfied: string | null; below_threshold: boolean;
  }>`
    SELECT m.year_id, y.code AS year_code, m.field_id, m.n_submissions, m.n_answers, m.n_satisfied,
           LAG(m.n_answers)   OVER w AS prev_n_answers,
           LAG(m.n_satisfied) OVER w AS prev_n_satisfied,
           m.n_satisfied < (setting_for('satisfaction_threshold', m.year_id::smallint) #>> '{}')::numeric * m.n_answers
             AS below_threshold
    FROM mv_sat_field_year m
    JOIN academic_year y ON y.id = m.year_id
    WINDOW w AS (PARTITION BY m.field_id ORDER BY y.start_date)
    ORDER BY m.field_id, y.start_date
  `.execute(db());
  return rows.map((r) => ({
    yearId: r.year_id, yearCode: r.year_code, fieldId: r.field_id,
    nSubmissions: num(r.n_submissions), nAnswers: num(r.n_answers), nSatisfied: num(r.n_satisfied),
    prevNAnswers: r.prev_n_answers === null ? null : num(r.prev_n_answers),
    prevNSatisfied: r.prev_n_satisfied === null ? null : num(r.prev_n_satisfied),
    belowThreshold: r.below_threshold,
  }));
}

/** b) Theo tiêu chí, kèm phân phối 5 mức. */
export async function criteriaByField(yearId: number, fieldId: number) {
  const { rows } = await sql<{
    criterion_code: string; n_answers: string; n_satisfied: string;
    n5: string; n4: string; n3: string; n2: string; n1: string;
  }>`
    SELECT criterion_code, n_answers, n_satisfied, n5, n4, n3, n2, n1
    FROM mv_sat_criterion_year
    WHERE year_id = ${yearId} AND field_id = ${fieldId}
    ORDER BY criterion_code
  `.execute(db());
  return rows.map((r) => ({
    criterionCode: r.criterion_code,
    nAnswers: num(r.n_answers), nSatisfied: num(r.n_satisfied),
    distribution: { 5: num(r.n5), 4: num(r.n4), 3: num(r.n3), 2: num(r.n2), 1: num(r.n1) },
  }));
}

/** Làm mới toàn bộ view tổng hợp (sau mỗi lô nhập / hoàn tác). */
export async function refreshViews(): Promise<void> {
  await sql`SELECT refresh_all_mv()`.execute(db());
}
