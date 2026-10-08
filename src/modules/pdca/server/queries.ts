import { sql } from "kysely";
import { db } from "@/core/db";

/** e) Sinh hành động PDCA tự động cho tiêu chí dưới ngưỡng; không trùng nhờ ux_pdca_scope. Trả số bản ghi mới. */
export async function generatePdcaBelowThreshold(yearId: number): Promise<number> {
  const res = await sql`
    INSERT INTO pdca_action (year_id, field_id, criterion_code, trigger_type, n_answers, n_satisfied)
    SELECT c.year_id, c.field_id, c.criterion_code, 'BELOW_THRESHOLD', c.n_answers, c.n_satisfied
    FROM mv_sat_criterion_year c
    WHERE c.year_id = ${yearId}
      AND c.n_answers > 0
      AND c.n_satisfied < (setting_for('satisfaction_threshold', c.year_id::smallint) #>> '{}')::numeric * c.n_answers
    ON CONFLICT DO NOTHING
  `.execute(db());
  return Number(res.numAffectedRows ?? 0);
}
