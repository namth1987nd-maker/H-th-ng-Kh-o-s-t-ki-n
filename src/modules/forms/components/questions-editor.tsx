"use client";

import { useActionState, useMemo, useState } from "react";
import { cn } from "@/core/lib/utils";
import {
  duplicateErrors,
  KIND_LABEL,
  mergeQuestions,
  parseQuestionLines,
  QUESTION_KINDS,
  withKind,
  type FormQuestion,
  type MergeMode,
  type QuestionKind,
} from "../domain/questions";
import { saveQuestionsAction, type FormState } from "../server/actions";

const KIND_CLS: Record<QuestionKind, string> = {
  SCALE: "bg-green-100 text-green-800",
  CHOICE: "bg-blue-100 text-blue-800",
  TEXT: "bg-slate-100 text-slate-700",
};

type RowStatus = "new" | "overwrite" | "keep";
const STATUS: Record<RowStatus, { label: string; cls: string }> = {
  new: { label: "Mới", cls: "bg-blue-100 text-blue-800" },
  overwrite: { label: "Ghi đè", cls: "bg-amber-100 text-amber-800" },
  keep: { label: "Giữ nguyên", cls: "bg-slate-100 text-slate-600" },
};

const PLACEHOLDER = `1. Chuẩn đầu ra của khóa học đã được phổ biến đầy đủ, kịp thời tới học viên
a. Đầy đủ, kịp thời
b. Đầy đủ nhưng còn chậm
c. Chưa đầy đủ, chưa kịp thời
d. Không phổ biến
2. …
32. Những ý kiến phản ánh, góp ý cho Nhà trường…`;

interface Props {
  formId: number;
  initialText: string;
  /** Câu hỏi hiện có của phiếu — để gộp khi ghi đè theo số câu và chống trùng. */
  existing: FormQuestion[];
  /** Số đợt dữ liệu đã nhập — > 0 thì cảnh báo ghi đè sẽ ghép lại câu trả lời cũ. */
  nRounds: number;
  /** Mở từ trang xem trước lô nhập: lưu xong quay lại đó. */
  returnTo?: string;
}

/** Ô dán câu hỏi + đáp án, xem trước ngay khi gõ/dán; chọn chế độ ghi đè; đổi loại câu ở bảng xem trước. */
export function QuestionsEditor({ formId, initialText, existing, nRounds, returnTo }: Props) {
  const [text, setText] = useState(initialText);
  const [mode, setMode] = useState<MergeMode>("REPLACE");
  const [overrides, setOverrides] = useState<Record<number, QuestionKind>>({});
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuestionsAction, {});

  const parsed = useMemo(() => parseQuestionLines(text), [text]);
  const incoming = parsed.questions.map((q) => (overrides[q.qNo] ? withKind(q, overrides[q.qNo]!) : q));
  const result = mergeQuestions(existing, incoming, mode);
  const errors = [...new Set([...parsed.errors, ...duplicateErrors(result)])];

  const incomingNos = new Set(incoming.map((q) => q.qNo));
  const existingNos = new Set(existing.map((q) => q.qNo));
  const statusOf = (qNo: number): RowStatus => (!incomingNos.has(qNo) ? "keep" : existingNos.has(qNo) ? "overwrite" : "new");
  const removed = mode === "REPLACE" ? existing.filter((q) => !incomingNos.has(q.qNo)).length : 0;
  const count = (k: QuestionKind) => result.filter((q) => q.kind === k).length;
  const canSave = errors.length === 0 && incoming.length > 0;

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-2">
      <input type="hidden" name="formId" value={formId} />
      <input type="hidden" name="kinds" value={JSON.stringify(overrides)} />
      <input type="hidden" name="mode" value={mode} />
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {/* ── Khung nhập ── */}
      <div className="flex flex-col gap-3">
        {existing.length > 0 && (
          <fieldset className="rounded border border-border bg-card p-3 text-sm">
            <legend className="px-1 font-medium">Cách lưu</legend>
            <label className="flex items-start gap-2">
              <input type="radio" name="_mode" checked={mode === "REPLACE"} onChange={() => setMode("REPLACE")} className="mt-1" />
              <span><b>Thay toàn bộ</b> — phiếu chỉ còn đúng các câu trong khung bên dưới.</span>
            </label>
            <label className="mt-1 flex items-start gap-2">
              <input type="radio" name="_mode" checked={mode === "UPSERT"} onChange={() => setMode("UPSERT")} className="mt-1" />
              <span><b>Ghi đè theo số câu</b> — câu cùng số bị ghi đè, câu mới được thêm, các câu khác giữ nguyên. Chỉ cần dán những câu muốn sửa.</span>
            </label>
          </fieldset>
        )}

        {nRounds > 0 && (
          <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Phiếu đã có <b>{nRounds} đợt</b> dữ liệu. Khi lưu, câu trả lời cũ sẽ được <b>ghép lại theo đáp án mới</b> (dựa trên nội dung đã trả lời);
            câu trả lời không khớp đáp án mới sẽ không được tính.
          </p>
        )}

        <label htmlFor="questions" className="text-sm font-medium">Dán câu hỏi và đáp án</label>
        <p className="-mt-2 text-xs text-muted">
          Câu hỏi bắt đầu bằng số (<code>1.</code>), đáp án bắt đầu bằng chữ cái (<code>a.</code>). Dòng bị xuống hàng tự nối vào dòng trên.
          Câu có đáp án → <b>thang đánh giá</b> (a, b tính là hài lòng); không có đáp án → <b>tự luận</b>.
          Đổi sang <b>lựa chọn</b> ở bảng bên cạnh hoặc ghi <code>(lựa chọn)</code> cuối câu.
        </p>
        <textarea
          id="questions"
          name="questions"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={26}
          spellCheck={false}
          placeholder={PLACEHOLDER}
          className="rounded border border-border p-3 font-mono text-xs leading-relaxed"
        />
      </div>

      {/* ── Xem trước kết quả sau khi lưu ── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Sau khi lưu: {result.length} câu</span>
          {QUESTION_KINDS.map((k) => (
            <span key={k} className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", KIND_CLS[k])}>
              {KIND_LABEL[k]}: {count(k)}
            </span>
          ))}
          {removed > 0 && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Bỏ {removed} câu cũ</span>}
        </div>

        {errors.length > 0 && (
          <ul className="list-disc rounded border border-danger/30 bg-danger/5 p-3 pl-7 text-sm text-danger">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <div className="max-h-[40rem] overflow-y-auto rounded border border-border bg-card">
          {result.length === 0 ? (
            <p className="p-4 text-sm text-muted">Dán nội dung vào khung bên trái để xem trước.</p>
          ) : (
            <ol className="divide-y divide-border">
              {result.map((q) => {
                const st = statusOf(q.qNo);
                return (
                  <li key={q.qNo} className={cn("p-3 text-sm", st === "keep" && "opacity-60")}>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-muted">{q.qNo}.</span>
                      <span className="flex-1">{q.text}</span>
                      {existing.length > 0 && (
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS[st].cls)}>{STATUS[st].label}</span>
                      )}
                      {st === "keep" ? (
                        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium", KIND_CLS[q.kind])}>{KIND_LABEL[q.kind]}</span>
                      ) : (
                        <select
                          aria-label={`Loại câu ${q.qNo}`}
                          value={q.kind}
                          onChange={(e) => setOverrides((o) => ({ ...o, [q.qNo]: e.target.value as QuestionKind }))}
                          className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium", KIND_CLS[q.kind])}
                        >
                          {QUESTION_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
                        </select>
                      )}
                    </div>
                    {q.options.length > 0 && (
                      <ul className="ml-6 mt-1 space-y-0.5 text-xs text-slate-600">
                        {q.options.map((o) => (
                          <li key={o.key} className="flex gap-2">
                            <span className="font-mono">{o.key}.</span>
                            <span className="flex-1">{o.text}</span>
                            {o.score !== null && (
                              <span className={cn("shrink-0", o.score >= 4 ? "text-ok" : "text-muted")}>
                                {o.score >= 4 ? "hài lòng" : "chưa hài lòng"}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {state.error && (
          <div className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            <p className="font-medium">{state.error}</p>
            {state.details && <ul className="mt-1 list-disc pl-5">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>}
          </div>
        )}

        <div>
          <button disabled={!canSave || pending} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            {pending
              ? "Đang lưu…"
              : (mode === "UPSERT" && existing.length > 0
                  ? `Ghi đè ${incoming.length} câu vào phiếu`
                  : `Lưu ${result.length} câu hỏi vào phiếu`) + (returnTo ? " → quay lại kiểm tra file" : "")}
          </button>
        </div>
      </div>
    </form>
  );
}
