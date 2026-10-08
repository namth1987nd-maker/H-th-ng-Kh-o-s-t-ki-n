"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { db } from "@/core/db";
import { refreshAll } from "@/core/lib/refresh";
import { matchQuestions, type FormQuestion } from "@/modules/forms";
import { getForm, replaceQuestions } from "@/modules/forms/server";
import { saveRounds } from "@/modules/subjects/server";
import { analyzeSheet } from "../domain/google-form";
import { applyFormQuestions, draftQuestionsFromFile } from "../domain/mapping";
import { analyzeBatch, loadBatch, rollbackBatch } from "./queries";
import { readSheetTable, sha256 } from "./read-workbook";
import { extOf, saveUpload } from "./storage";

export interface UploadState {
  error?: string;
  details?: string[];
}

const ALLOWED = [".xlsx", ".csv"];
const userIdOf = (id: string) => (Number(id) > 0 ? Number(id) : null); // khách (tắt đăng nhập) → null

/** Bước 1: chọn phiếu + nhận file → lưu file gốc → phân tích → tạo lô STAGED → sang trang xem trước. */
export async function uploadAction(_prev: UploadState, fd: FormData): Promise<UploadState> {
  const user = await requirePermission("import:write");

  const form = await getForm({ id: Number(fd.get("formId")) || 0 });
  if (!form) return { error: "Chọn phiếu đánh giá cho file này." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Chưa chọn file." };
  const ext = extOf(file.name);
  if (!ALLOWED.includes(ext)) return { error: "Chỉ nhận file .xlsx hoặc .csv (Google Form → Xem trong Trang tính → Tải xuống)." };
  const yearId = Number(fd.get("yearId"));
  if (!yearId) return { error: "Chọn năm học." };

  const buf = Buffer.from(await file.arrayBuffer());
  const hash = sha256(buf);

  const dup = await db()
    .selectFrom("import_batch")
    .select("file_name")
    .where("file_sha256", "=", hash)
    .where("status", "=", "COMMITTED")
    .executeTakeFirst();
  if (dup) return { error: `File này đã được nhập trước đó (${dup.file_name}). Muốn nhập lại thì hoàn tác lô cũ trước.` };

  const filePath = await saveUpload(hash.toString("hex"), ext, buf);

  let analysis: ReturnType<typeof analyzeSheet>;
  try {
    analysis = analyzeSheet(await readSheetTable(filePath));
  } catch (e) {
    return { error: `Không đọc được file: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (analysis.fatal.length) return { error: "File chưa đúng cấu trúc.", details: analysis.fatal };

  if (form.questions.length > 0 && matchQuestions(form.questions, analysis.questions).matched.length === 0) {
    return {
      error: `File không khớp phiếu ${form.code}: không có cột câu hỏi nào trùng số câu với phiếu.`,
      details: [`Phiếu có câu ${form.questions.map((q) => q.qNo).join(", ")}; file có câu ${analysis.questions.map((q) => q.qNo).join(", ")}.`],
    };
  }

  const batch = await db()
    .insertInto("import_batch")
    .values({
      year_id: yearId, form_id: form.id, file_name: file.name, file_sha256: hash,
      status: "STAGED", created_by: userIdOf(user.id), committed_at: null,
    })
    .returning("public_id")
    .executeTakeFirstOrThrow();

  refreshAll();
  redirect(`/nhap-du-lieu/${batch.public_id}`);
}

/**
 * Bước 2: lưu. Trong MỘT transaction:
 *  - phiếu chưa có câu hỏi → lấy câu hỏi từ file (câu có điểm = thang 5 mức, không có điểm = tự luận);
 *  - ghép cột file với câu hỏi phiếu theo số câu, chỉ lưu câu thuộc phiếu;
 *  - ghép từng câu trả lời với đáp án (a, b, c…) của câu hỏi → lưu đáp án + điểm;
 *  - mỗi đối tượng trong file → một đợt mới của (phiếu, đối tượng).
 */
export async function commitAction(fd: FormData): Promise<void> {
  const user = await requirePermission("import:write");
  const batch = await loadBatch(String(fd.get("batch")));
  if (!batch) redirect("/nhap-du-lieu");
  if (batch.status !== "STAGED") redirect(`/nhap-du-lieu/${batch.public_id}`);

  const form = batch.form_id ? await getForm({ id: batch.form_id }) : undefined;
  if (!form) throw new Error("Lô chưa gắn phiếu đánh giá.");

  const analysis = await analyzeBatch(batch);
  if (analysis.fatal.length) throw new Error(analysis.fatal.join(" "));

  await db().transaction().execute(async (trx) => {
    // phiếu chưa có câu hỏi → lấy câu hỏi + đáp án từ chính file này
    let formQuestions: FormQuestion[] = form.questions;
    if (formQuestions.length === 0) {
      formQuestions = draftQuestionsFromFile(analysis);
      await replaceQuestions(trx, form.id, formQuestions);
    }

    const { matched } = matchQuestions(formQuestions, analysis.questions);
    if (matched.length === 0) throw new Error(`File không khớp phiếu ${form.code}.`);

    const matchedNos = new Set(matched.map((m) => m.qNo));
    const saved = await saveRounds(trx, {
      formId: form.id,
      batchId: batch.id,
      yearId: batch.year_id,
      questions: matched.map((m) => ({ qNo: m.qNo, text: m.formText })),
      groups: applyFormQuestions(analysis.groups, formQuestions.filter((q) => matchedNos.has(q.qNo))),
    });

    await trx
      .updateTable("import_batch")
      .set({ status: "COMMITTED", n_submissions: saved.nResponses, n_answers: saved.nAnswers, committed_at: new Date() })
      .where("id", "=", batch.id)
      .where("status", "=", "STAGED")
      .execute();
    await trx
      .insertInto("audit_log")
      .values({
        user_id: userIdOf(user.id), action: "IMPORT_COMMIT", entity: "import_batch", entity_id: batch.id,
        detail: JSON.stringify({ file: batch.file_name, form: form.code, rounds: saved.rounds }),
      })
      .execute();
  });

  refreshAll();
  redirect(`/nhap-du-lieu/${batch.public_id}`);
}

/**
 * Phiếu chưa có câu hỏi: tạo câu hỏi + đáp án từ file của lô này, rồi chuyển sang trang câu hỏi
 * để người dùng soát (bổ sung đáp án chưa ai chọn, thứ tự a = tốt nhất, loại câu) và quay lại lô.
 */
export async function adoptFromFileAction(fd: FormData): Promise<void> {
  const user = await requirePermission("import:write");
  const batch = await loadBatch(String(fd.get("batch")));
  if (!batch) redirect("/nhap-du-lieu");
  const form = batch.form_id ? await getForm({ id: batch.form_id }) : undefined;
  if (!form) redirect(`/nhap-du-lieu/${batch.public_id}`);

  const back = `/phieu/${form.code}/cau-hoi?quay-lai=/nhap-du-lieu/${batch.public_id}`;
  if (form.questions.length > 0) redirect(back); // đã có câu hỏi: không ghi đè, chỉ mở trang sửa

  const analysis = await analyzeBatch(batch);
  if (analysis.fatal.length) throw new Error(analysis.fatal.join(" "));
  const questions = draftQuestionsFromFile(analysis);

  await db().transaction().execute(async (trx) => {
    await replaceQuestions(trx, form.id, questions);
    await trx
      .insertInto("audit_log")
      .values({
        user_id: userIdOf(user.id), action: "FORM_QUESTIONS", entity: "form", entity_id: String(form.id),
        detail: JSON.stringify({ code: form.code, source: batch.file_name, nQuestions: questions.length }),
      })
      .execute();
  });

  refreshAll();
  redirect(back);
}

/** Hủy lô chưa lưu. */
export async function cancelAction(fd: FormData): Promise<void> {
  await requirePermission("import:write");
  const batch = await loadBatch(String(fd.get("batch")));
  if (batch?.status === "STAGED") {
    await db().updateTable("import_batch").set({ status: "FAILED" }).where("id", "=", batch.id).execute();
  }
  refreshAll();
  redirect("/nhap-du-lieu");
}

/** Hoàn tác lô đã lưu: xóa các đợt tạo từ lô (đối tượng và câu hỏi của phiếu vẫn giữ). */
export async function rollbackAction(fd: FormData): Promise<void> {
  const user = await requirePermission("import:write");
  const batch = await loadBatch(String(fd.get("batch")));
  if (batch?.status === "COMMITTED") {
    await rollbackBatch(batch.id);
    await db()
      .insertInto("audit_log")
      .values({ user_id: userIdOf(user.id), action: "IMPORT_ROLLBACK", entity: "import_batch", entity_id: batch.id, detail: null })
      .execute();
  }
  refreshAll();
  redirect(batch ? `/nhap-du-lieu/${batch.public_id}` : "/nhap-du-lieu");
}
