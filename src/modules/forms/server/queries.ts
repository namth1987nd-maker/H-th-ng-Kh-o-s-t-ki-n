import { sql, type Kysely } from "kysely";
import { db, num, type DB } from "@/core/db";
import type { FormQuestion, QuestionKind } from "../domain/questions";

/** db() hoặc một transaction (Transaction<DB> kế thừa Kysely<DB>). */
type Executor = Kysely<DB>;

export interface FormListItem {
  id: number;
  code: string;
  name: string;
  fieldId: number;
  active: boolean;
  nQuestions: number;
  nRounds: number;
  nResponses: number;
}

export async function listForms(fieldId?: number): Promise<FormListItem[]> {
  const { rows } = await sql<{
    id: number; code: string; name: string; field_id: number; active: boolean;
    n_questions: string; n_rounds: string; n_responses: string;
  }>`
    SELECT f.id, f.code, f.name, f.field_id, f.active,
           (SELECT count(*) FROM form_question q WHERE q.form_id = f.id)                    AS n_questions,
           (SELECT count(*) FROM survey_round r WHERE r.form_id = f.id)                     AS n_rounds,
           (SELECT coalesce(sum(r.n_responses), 0) FROM survey_round r WHERE r.form_id = f.id) AS n_responses
    FROM form f
    ${fieldId ? sql`WHERE f.field_id = ${fieldId}` : sql``}
    ORDER BY f.field_id, f.code
  `.execute(db());
  return rows.map((r) => ({
    id: r.id, code: r.code, name: r.name, fieldId: r.field_id, active: r.active,
    nQuestions: num(r.n_questions), nRounds: num(r.n_rounds), nResponses: num(r.n_responses),
  }));
}

export async function formHasData(ex: Executor, formId: number): Promise<boolean> {
  const r = await ex.selectFrom("survey_round").select("id").where("form_id", "=", formId).limit(1).executeTakeFirst();
  return !!r;
}

/** Câu hỏi + đáp án của phiếu, theo thứ tự câu. */
export async function loadQuestions(ex: Executor, formId: number): Promise<FormQuestion[]> {
  const [questions, options] = await Promise.all([
    ex.selectFrom("form_question").select(["q_no", "text", "kind"]).where("form_id", "=", formId).orderBy("q_no").execute(),
    ex.selectFrom("form_option").select(["q_no", "opt_key", "text", "score"]).where("form_id", "=", formId).orderBy("q_no").orderBy("opt_key").execute(),
  ]);
  return questions.map((q) => ({
    qNo: q.q_no,
    text: q.text,
    kind: q.kind as QuestionKind,
    options: options.filter((o) => o.q_no === q.q_no).map((o) => ({ key: o.opt_key, text: o.text, score: o.score })),
  }));
}

/** Phiếu + câu hỏi + đáp án. Tra theo mã (PH0001) hoặc id. */
export async function getForm(by: { code: string } | { id: number }) {
  let q = db().selectFrom("form").select(["id", "code", "name", "field_id", "description", "active", "created_at"]);
  q = "code" in by ? q.where("code", "=", by.code) : q.where("id", "=", by.id);
  const form = await q.executeTakeFirst();
  if (!form) return undefined;

  const [questions, counts] = await Promise.all([
    loadQuestions(db(), form.id),
    db()
      .selectFrom("survey_round")
      .select((eb) => [eb.fn.countAll<string>().as("n_rounds"), eb.fn.sum<string | null>("n_responses").as("n_responses")])
      .where("form_id", "=", form.id)
      .executeTakeFirst(),
  ]);
  const nRounds = num(counts?.n_rounds);

  return {
    ...form,
    questions,
    nRounds,
    nResponses: num(counts?.n_responses),
    /** Phiếu đã có dữ liệu trả lời (≥ 1 đợt). */
    hasData: nRounds > 0,
  };
}
export type FormDetail = NonNullable<Awaited<ReturnType<typeof getForm>>>;

export interface QuestionStat {
  qNo: number;
  text: string;
  kind: QuestionKind;
  /** Tổng số câu trả lời của câu hỏi này. */
  n: number;
  /** Số câu trả lời có điểm, và số câu hài lòng (điểm ≥ 4) — để tính % hài lòng. */
  nScored: number;
  nSatisfied: number;
  /** Số lượng theo từng đáp án (a, b, c…). */
  options: { key: string; text: string; score: number | null; n: number }[];
  /** Câu trả lời không khớp đáp án nào (với câu có đáp án). */
  nOther: number;
}

/** THỐNG KÊ SỐ LƯỢNG: mỗi câu hỏi → tổng trả lời, số lượng theo từng đáp án, % hài lòng. Lọc theo một đợt nếu có. */
export async function formQuestionStats(formId: number, roundId?: string): Promise<QuestionStat[]> {
  const roundFilter = roundId ? sql`AND r.id = ${roundId}::bigint` : sql``;

  const [questions, options] = await Promise.all([
    sql<{ q_no: number; text: string; kind: QuestionKind; n: string; n_scored: string; n_satisfied: string }>`
      SELECT q.q_no, q.text, q.kind,
             count(a.q_no)                        AS n,
             count(a.score)                       AS n_scored,
             count(*) FILTER (WHERE a.score >= 4) AS n_satisfied
      FROM form_question q
      LEFT JOIN survey_round r ON r.form_id = q.form_id ${roundFilter}
      LEFT JOIN round_answer a ON a.round_id = r.id AND a.q_no = q.q_no
      WHERE q.form_id = ${formId}
      GROUP BY q.q_no, q.text, q.kind
      ORDER BY q.q_no
    `.execute(db()),
    sql<{ q_no: number; opt_key: string; text: string; score: number | null; n: string }>`
      SELECT o.q_no, o.opt_key, o.text, o.score, count(a.q_no) AS n
      FROM form_option o
      LEFT JOIN survey_round r ON r.form_id = o.form_id ${roundFilter}
      LEFT JOIN round_answer a ON a.round_id = r.id AND a.q_no = o.q_no AND a.opt_key = o.opt_key
      WHERE o.form_id = ${formId}
      GROUP BY o.q_no, o.opt_key, o.text, o.score
      ORDER BY o.q_no, o.opt_key
    `.execute(db()),
  ]);

  return questions.rows.map((q) => {
    const opts = options.rows
      .filter((o) => o.q_no === q.q_no)
      .map((o) => ({ key: o.opt_key, text: o.text, score: o.score, n: num(o.n) }));
    const n = num(q.n);
    return {
      qNo: q.q_no, text: q.text, kind: q.kind, n,
      nScored: num(q.n_scored), nSatisfied: num(q.n_satisfied),
      options: opts,
      nOther: opts.length > 0 ? n - opts.reduce((s, o) => s + o.n, 0) : 0,
    };
  });
}

/** Các đợt đã nhập cho phiếu (mới nhất trước). */
export async function formRounds(formId: number) {
  return db()
    .selectFrom("survey_round as r")
    .innerJoin("survey_subject as s", "s.id", "r.subject_id")
    .innerJoin("academic_year as y", "y.id", "r.year_id")
    .innerJoin("import_batch as b", "b.id", "r.batch_id")
    .select([
      "r.id", "r.round_no", "r.n_responses", "r.created_at",
      "s.code as subject_code", "s.name as subject_name", "y.code as year_code", "b.file_name", "b.public_id as batch_public_id",
    ])
    .where("r.form_id", "=", formId)
    .orderBy("r.created_at", "desc")
    .execute();
}
