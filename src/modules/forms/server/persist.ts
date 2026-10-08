import type { Transaction } from "kysely";
import type { DB } from "@/core/db";
import { resolveAnswer, type FormQuestion } from "../domain/questions";

/** Ghi toàn bộ câu hỏi + đáp án của phiếu (xóa bộ cũ rồi ghi bộ mới). */
export async function replaceQuestions(trx: Transaction<DB>, formId: number, questions: FormQuestion[]): Promise<void> {
  await trx.deleteFrom("form_question").where("form_id", "=", formId).execute(); // form_option xóa theo cascade
  if (questions.length === 0) return;

  await trx
    .insertInto("form_question")
    .values(questions.map((q) => ({ form_id: formId, q_no: q.qNo, text: q.text, kind: q.kind })))
    .execute();

  const options = questions.flatMap((q) =>
    q.options.map((o) => ({ form_id: formId, q_no: q.qNo, opt_key: o.key, text: o.text, score: o.score })),
  );
  if (options.length > 0) await trx.insertInto("form_option").values(options).execute();
}

/**
 * Sau khi GHI ĐÈ câu hỏi/đáp án của phiếu đã có dữ liệu: ghép lại các câu trả lời cũ theo đáp án mới
 * (dựa trên nội dung gốc value_text đã lưu). Trả về số câu trả lời được cập nhật.
 *  - câu tự luận → bỏ đáp án, bỏ điểm;
 *  - câu có đáp án → khớp lại từng giá trị khác nhau;
 *  - câu thang đánh giá không có đáp án → giữ nguyên điểm cũ.
 */
export async function remapAnswers(trx: Transaction<DB>, formId: number, questions: FormQuestion[]): Promise<number> {
  const rounds = trx.selectFrom("survey_round").select("id").where("form_id", "=", formId);
  let updated = 0;

  for (const q of questions) {
    if (q.kind === "TEXT") {
      const r = await trx
        .updateTable("round_answer")
        .set({ opt_key: null, score: null })
        .where("round_id", "in", rounds)
        .where("q_no", "=", q.qNo)
        .executeTakeFirst();
      updated += Number(r.numUpdatedRows);
      continue;
    }
    if (q.options.length === 0) continue;

    const values = await trx
      .selectFrom("round_answer")
      .select("value_text")
      .distinct()
      .where("round_id", "in", rounds)
      .where("q_no", "=", q.qNo)
      .execute();

    for (const { value_text } of values) {
      const { optKey, score } = resolveAnswer(q, value_text, null);
      const r = await trx
        .updateTable("round_answer")
        .set({ opt_key: optKey, score })
        .where("round_id", "in", rounds)
        .where("q_no", "=", q.qNo)
        .where("value_text", "=", value_text)
        .executeTakeFirst();
      updated += Number(r.numUpdatedRows);
    }
  }
  return updated;
}

/**
 * Xóa phiếu và TOÀN BỘ dữ liệu trả lời của phiếu: các đợt (kéo theo phiếu trả lời, câu trả lời),
 * các lô nhập của phiếu chuyển sang đã hoàn tác / đã hủy, rồi xóa phiếu (kéo theo câu hỏi, đáp án).
 * Đối tượng (DTxxxx) vẫn giữ vì có thể dùng ở phiếu khác.
 */
export async function deleteFormCascade(trx: Transaction<DB>, formId: number): Promise<{ rounds: number }> {
  const del = await trx.deleteFrom("survey_round").where("form_id", "=", formId).executeTakeFirst();
  await trx
    .updateTable("import_batch")
    .set({ status: "ROLLED_BACK", n_submissions: 0, n_answers: 0 })
    .where("form_id", "=", formId)
    .where("status", "=", "COMMITTED")
    .execute();
  await trx.updateTable("import_batch").set({ status: "FAILED" }).where("form_id", "=", formId).where("status", "=", "STAGED").execute();
  await trx.updateTable("import_batch").set({ form_id: null }).where("form_id", "=", formId).execute();
  await trx.deleteFrom("form").where("id", "=", formId).execute();
  return { rounds: Number(del.numDeletedRows) };
}
