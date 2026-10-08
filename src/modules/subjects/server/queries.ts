import { sql } from "kysely";
import { db, num } from "@/core/db";

export interface SubjectRef {
  id: number;
  code: string;
  name: string;
  nRounds: number;
}

/**
 * Tra đối tượng đã có theo khóa so khớp → để trang xem trước báo "đã có mã DTxxxx" hay "sẽ tạo mới".
 * nRounds = số đợt của đối tượng TRONG phiếu `formId` (đợt đánh số riêng theo phiếu).
 */
export async function lookupSubjects(keys: string[], formId: number | null): Promise<Map<string, SubjectRef>> {
  if (keys.length === 0) return new Map();
  const rows = await db()
    .selectFrom("survey_subject as s")
    .leftJoin("survey_round as r", (j) => {
      const on = j.onRef("r.subject_id", "=", "s.id");
      return formId === null ? on.on("r.form_id", "is", null) : on.on("r.form_id", "=", formId);
    })
    .select((eb) => ["s.id", "s.code", "s.name", "s.name_norm", eb.fn.count<string>("r.id").as("n_rounds")])
    .where("s.name_norm", "in", keys)
    .groupBy(["s.id", "s.code", "s.name", "s.name_norm"])
    .execute();
  return new Map(rows.map((r) => [r.name_norm, { id: r.id, code: r.code, name: r.name, nRounds: num(r.n_rounds) }]));
}

export async function listSubjects() {
  const { rows } = await sql<{
    code: string; name: string; n_rounds: string; n_responses: string; last_at: Date | null;
  }>`
    SELECT s.code, s.name,
           count(r.id)                    AS n_rounds,
           coalesce(sum(r.n_responses), 0) AS n_responses,
           max(r.created_at)              AS last_at
    FROM survey_subject s
    LEFT JOIN survey_round r ON r.subject_id = s.id
    GROUP BY s.id
    ORDER BY s.code
  `.execute(db());
  return rows.map((r) => ({ code: r.code, name: r.name, nRounds: num(r.n_rounds), nResponses: num(r.n_responses), lastAt: r.last_at }));
}

/** Đối tượng + danh sách đợt, mỗi đợt kèm số câu có điểm và số câu hài lòng (≥ 4) để tính tỷ lệ. */
export async function subjectDetail(code: string) {
  const subject = await db()
    .selectFrom("survey_subject")
    .select(["id", "code", "name", "created_at"])
    .where("code", "=", code)
    .executeTakeFirst();
  if (!subject) return undefined;

  const { rows } = await sql<{
    id: string; round_no: number; year_code: string; file_name: string; created_at: Date;
    form_code: string | null; form_name: string | null;
    n_responses: number; n_questions: string; n_scored: string; n_satisfied: string;
  }>`
    SELECT r.id, r.round_no, y.code AS year_code, b.file_name, r.created_at, r.n_responses,
           f.code AS form_code, f.name AS form_name,
           (SELECT count(*) FROM round_question q WHERE q.round_id = r.id)                        AS n_questions,
           (SELECT count(*) FROM round_answer a WHERE a.round_id = r.id AND a.score IS NOT NULL)   AS n_scored,
           (SELECT count(*) FROM round_answer a WHERE a.round_id = r.id AND a.score >= 4)          AS n_satisfied
    FROM survey_round r
    JOIN academic_year y ON y.id = r.year_id
    JOIN import_batch  b ON b.id = r.batch_id
    LEFT JOIN form     f ON f.id = r.form_id
    WHERE r.subject_id = ${subject.id}
    ORDER BY r.created_at DESC
  `.execute(db());

  return {
    ...subject,
    rounds: rows.map((r) => ({
      id: r.id, formCode: r.form_code, formName: r.form_name,
      roundNo: r.round_no, yearCode: r.year_code, fileName: r.file_name, createdAt: r.created_at,
      nResponses: r.n_responses, nQuestions: num(r.n_questions), nScored: num(r.n_scored), nSatisfied: num(r.n_satisfied),
    })),
  };
}
