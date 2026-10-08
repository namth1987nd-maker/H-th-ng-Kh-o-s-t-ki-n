"use client";

import { useActionState } from "react";
import { saveFormAction, type FormState } from "../server/actions";

interface Props {
  fields: readonly { id: number; name: string }[];
  initial?: { id: number; name: string; fieldId: number; description: string | null };
}

const input = "rounded border border-border px-3 py-2 text-sm";

/** Thông tin phiếu: tên, lĩnh vực, mô tả. Câu hỏi + đáp án nhập ở trang riêng (/phieu/[ma]/cau-hoi). */
export function FormEditor({ fields, initial }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveFormAction, {});

  return (
    <form action={action} className="flex flex-col gap-5 rounded border border-border bg-card p-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Tên phiếu đánh giá</span>
          <input name="name" required defaultValue={initial?.name} className={input} placeholder="vd. Phiếu khảo sát học viên sau khóa học" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Lĩnh vực</span>
          <select name="fieldId" required defaultValue={initial?.fieldId ?? ""} className={input}>
            <option value="" disabled>— Chọn lĩnh vực —</option>
            {fields.map((f) => (
              <option key={f.id} value={f.id}>{f.id}. {f.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Mô tả (không bắt buộc)</span>
        <input name="description" defaultValue={initial?.description ?? ""} className={input} />
      </label>

      {state.error && (
        <div className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <p className="font-medium">{state.error}</p>
          {state.details && <ul className="mt-1 list-disc pl-5">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>}
        </div>
      )}

      <div>
        <button disabled={pending} className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
          {pending ? "Đang lưu…" : initial ? "Lưu thay đổi" : "Tạo phiếu → nhập câu hỏi"}
        </button>
      </div>
    </form>
  );
}
