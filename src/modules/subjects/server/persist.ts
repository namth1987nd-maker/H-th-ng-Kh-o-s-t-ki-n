import type { Transaction } from "kysely";
import type { DB } from "@/core/db";

export interface RoundAnswerInput {
  qNo: number;
  valueText: string;
  score: number | null;
  /** Đáp án của phiếu (a, b…) mà câu trả lời khớp; null = tự luận / không khớp. */
  optKey?: string | null;
}

export interface RoundInput {
  /** Phiếu đánh giá của lô; đợt được đánh số riêng theo (phiếu, đối tượng). */
  formId: number;
  batchId: string;
  yearId: number;
  questions: { qNo: number; text: string }[];
  groups: {
    /** Khóa so khớp đối tượng (đã chuẩn hóa). */
    key: string;
    name: string;
    rows: { rowNo: number; submittedAt: Date | null; extra: Record<string, string>; answers: RoundAnswerInput[] }[];
  }[];
}

export interface SavedRound {
  subjectCode: string;
  subjectName: string;
  isNewSubject: boolean;
  roundNo: number;
  nResponses: number;
}

const chunks = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/**
 * Lưu kết quả trả lời theo đối tượng. Gọi BÊN TRONG transaction của bên nhập dữ liệu.
 *  - Đối tượng đã có (so khớp name_norm) → dùng lại mã; chưa có → tạo mới, cấp mã DTxxxx.
 *  - Mỗi đối tượng → MỘT ĐỢT MỚI của phiếu (round_no = đợt lớn nhất của (phiếu, đối tượng) + 1), không gộp với đợt cũ.
 */
export async function saveRounds(trx: Transaction<DB>, input: RoundInput) {
  const rounds: SavedRound[] = [];
  let nResponses = 0;
  let nAnswers = 0;

  for (const g of input.groups) {
    if (g.rows.length === 0) continue;

    const created = await trx
      .insertInto("survey_subject")
      .values({ name: g.name, name_norm: g.key })
      .onConflict((oc) => oc.column("name_norm").doNothing())
      .returning("id")
      .executeTakeFirst();

    // khóa dòng đối tượng để hai lần nhập đồng thời không cấp trùng số đợt
    const subject = await trx
      .selectFrom("survey_subject")
      .select(["id", "code"])
      .where("name_norm", "=", g.key)
      .forUpdate()
      .executeTakeFirstOrThrow();

    const last = await trx
      .selectFrom("survey_round")
      .select((eb) => eb.fn.max("round_no").as("max"))
      .where("subject_id", "=", subject.id)
      .where("form_id", "=", input.formId)
      .executeTakeFirst();
    const roundNo = Number(last?.max ?? 0) + 1;

    const round = await trx
      .insertInto("survey_round")
      .values({
        subject_id: subject.id, form_id: input.formId, batch_id: input.batchId,
        round_no: roundNo, year_id: input.yearId, n_responses: g.rows.length,
      })
      .returning("id")
      .executeTakeFirstOrThrow();

    await trx
      .insertInto("round_question")
      .values(input.questions.map((q) => ({ round_id: round.id, q_no: q.qNo, text: q.text })))
      .execute();

    for (const part of chunks(g.rows, 500)) {
      const inserted = await trx
        .insertInto("round_response")
        .values(part.map((r) => ({
          round_id: round.id,
          source_row: r.rowNo,
          submitted_at: r.submittedAt,
          extra: Object.keys(r.extra).length ? JSON.stringify(r.extra) : null,
        })))
        .returning(["id", "source_row"])
        .execute();
      const idByRow = new Map(inserted.map((x) => [x.source_row, x.id]));

      const answers = part.flatMap((r) =>
        r.answers.map((a) => ({
          response_id: idByRow.get(r.rowNo)!,
          round_id: round.id,
          q_no: a.qNo,
          value_text: a.valueText,
          score: a.score,
          opt_key: a.optKey ?? null,
        })),
      );
      for (const ac of chunks(answers, 1000)) await trx.insertInto("round_answer").values(ac).execute();
      nAnswers += answers.length;
    }

    nResponses += g.rows.length;
    rounds.push({ subjectCode: subject.code, subjectName: g.name, isNewSubject: !!created, roundNo, nResponses: g.rows.length });
  }

  return { rounds, nResponses, nAnswers };
}
