"use server";

import { redirect } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { db } from "@/core/db";
import { refreshAll } from "@/core/lib/refresh";
import { toNFC } from "@/core/lib/text";
import { FIELDS } from "@/modules/results";
import {
  duplicateErrors,
  mergeQuestions,
  parseQuestionLines,
  QUESTION_KINDS,
  withKind,
  type MergeMode,
  type QuestionKind,
} from "../domain/questions";
import { deleteFormCascade, remapAnswers, replaceQuestions } from "./persist";
import { getForm } from "./queries";

export interface FormState {
  error?: string;
  details?: string[];
}

const userIdOf = (id: string) => (Number(id) > 0 ? Number(id) : null);

/** CREATE / UPDATE thông tin phiếu (tên, lĩnh vực, mô tả). Tạo mới xong chuyển sang nhập câu hỏi. */
export async function saveFormAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("import:write");

  const id = Number(fd.get("id")) || null;
  const name = toNFC(String(fd.get("name") ?? ""));
  const fieldId = Number(fd.get("fieldId"));
  const description = toNFC(String(fd.get("description") ?? "")) || null;

  if (!name) return { error: "Nhập tên phiếu." };
  if (!FIELDS.some((f) => f.id === fieldId)) return { error: "Chọn lĩnh vực của phiếu." };

  // chống trùng: không cho hai phiếu cùng tên trong một lĩnh vực
  const sameName = await db()
    .selectFrom("form")
    .select(["code", "name"])
    .where("field_id", "=", fieldId)
    .where((eb) => eb(eb.fn("lower", ["name"]), "=", name.toLowerCase()))
    .$if(!!id, (qb) => qb.where("id", "<>", id!))
    .executeTakeFirst();
  if (sameName) return { error: `Lĩnh vực này đã có phiếu cùng tên (${sameName.code}).` };

  const code = await db().transaction().execute(async (trx) => {
    const row = id
      ? await trx.updateTable("form").set({ name, field_id: fieldId, description }).where("id", "=", id).returning(["id", "code"]).executeTakeFirstOrThrow()
      : await trx.insertInto("form").values({ name, field_id: fieldId, description }).returning(["id", "code"]).executeTakeFirstOrThrow();
    await trx
      .insertInto("audit_log")
      .values({
        user_id: userIdOf(user.id), action: id ? "FORM_UPDATE" : "FORM_CREATE", entity: "form", entity_id: String(row.id),
        detail: JSON.stringify({ code: row.code, name, fieldId }),
      })
      .execute();
    return row.code;
  });

  refreshAll();
  redirect(id ? `/phieu/${code}` : `/phieu/${code}/cau-hoi`);
}

/**
 * Lưu câu hỏi + đáp án từ nội dung dán vào.
 *  - REPLACE: thay toàn bộ; UPSERT: ghi đè câu cùng số, giữ câu khác (không sinh trùng số câu).
 *  - Chống trùng CÂU HỎI (số câu, nội dung) trên bộ câu hỏi SAU KHI gộp; không kiểm tra trùng đáp án.
 *  - Phiếu đã có dữ liệu: vẫn cho ghi đè, rồi ghép lại câu trả lời cũ theo đáp án mới.
 */
export async function saveQuestionsAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("import:write");

  const form = await getForm({ id: Number(fd.get("formId")) || 0 });
  if (!form) return { error: "Không tìm thấy phiếu." };
  const mode: MergeMode = fd.get("mode") === "UPSERT" ? "UPSERT" : "REPLACE";

  const parsed = parseQuestionLines(String(fd.get("questions") ?? ""));
  if (parsed.errors.length) return { error: "Nội dung câu hỏi chưa đúng.", details: parsed.errors };
  if (parsed.questions.length === 0) return { error: "Chưa có câu hỏi nào." };

  // loại câu người dùng đổi ở bảng xem trước: { "29": "CHOICE", … }
  let overrides: Record<string, string> = {};
  try {
    overrides = JSON.parse(String(fd.get("kinds") ?? "{}"));
  } catch {
    /* bỏ qua, dùng loại tự nhận diện */
  }
  const incoming = parsed.questions.map((q) => {
    const k = overrides[String(q.qNo)];
    return k && QUESTION_KINDS.includes(k as QuestionKind) ? withKind(q, k as QuestionKind) : q;
  });

  const questions = mergeQuestions(form.questions, incoming, mode);
  const dup = duplicateErrors(questions);
  if (dup.length) return { error: "Trùng câu hỏi sau khi gộp với câu hỏi hiện có.", details: dup };

  await db().transaction().execute(async (trx) => {
    await replaceQuestions(trx, form.id, questions);
    const remapped = form.hasData ? await remapAnswers(trx, form.id, questions) : 0;
    await trx
      .insertInto("audit_log")
      .values({
        user_id: userIdOf(user.id), action: "FORM_QUESTIONS", entity: "form", entity_id: String(form.id),
        detail: JSON.stringify({
          code: form.code, mode, nQuestions: questions.length,
          nOptions: questions.reduce((s, q) => s + q.options.length, 0), remappedAnswers: remapped,
        }),
      })
      .execute();
  });

  // mở từ trang xem trước lô nhập → quay lại đó để kiểm tra lại việc ghép đáp án
  const back = String(fd.get("returnTo") ?? "");
  refreshAll();
  redirect(/^\/nhap-du-lieu\/[0-9a-f-]{36}$/i.test(back) ? back : `/phieu/${form.code}`);
}

/**
 * DELETE phiếu. Phiếu đã có dữ liệu: phải gửi kèm mã phiếu để xác nhận; xóa luôn các đợt đã nhập.
 * Gọi từ DeleteFormButton (client) — trả lỗi thay vì ném để hiện thông báo.
 */
export async function deleteFormAction(fd: FormData): Promise<FormState> {
  const user = await requirePermission("import:write");
  const form = await getForm({ id: Number(fd.get("id")) || 0 });
  if (!form) return { error: "Không tìm thấy phiếu." };

  if (form.hasData && String(fd.get("confirm") ?? "").trim().toUpperCase() !== form.code) {
    return { error: `Mã xác nhận không đúng. Gõ đúng ${form.code} để xóa phiếu và dữ liệu.` };
  }

  await db().transaction().execute(async (trx) => {
    const { rounds } = await deleteFormCascade(trx, form.id);
    await trx
      .insertInto("audit_log")
      .values({
        user_id: userIdOf(user.id), action: "FORM_DELETE", entity: "form", entity_id: String(form.id),
        detail: JSON.stringify({ code: form.code, name: form.name, deletedRounds: rounds, deletedResponses: form.nResponses }),
      })
      .execute();
  });

  refreshAll();
  redirect("/phieu");
}
