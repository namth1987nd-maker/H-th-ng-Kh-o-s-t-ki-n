"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { uploadAction, type UploadState } from "../server/actions";

interface Props {
  years: { id: number; code: string }[];
  /** Phiếu đánh giá, gom theo lĩnh vực. */
  formGroups: { field: string; forms: { id: number; code: string; name: string }[] }[];
  defaultFormId?: number;
}

const input = "rounded border border-border px-3 py-2";

export function UploadForm({ years, formGroups, defaultFormId }: Props) {
  const [state, action, pending] = useActionState<UploadState, FormData>(uploadAction, {});
  const noForms = formGroups.length === 0;

  return (
    <form action={action} className="flex flex-col gap-4 rounded border border-border bg-card p-5">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">Phiếu đánh giá</span>
        <select name="formId" required defaultValue={defaultFormId ?? ""} className={input}>
          <option value="" disabled>— Chọn phiếu —</option>
          {formGroups.map((g) => (
            <optgroup key={g.field} label={g.field}>
              {g.forms.map((f) => (
                <option key={f.id} value={f.id}>{f.code} · {f.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">File kết quả (Google Form)</span>
          <input
            name="file"
            type="file"
            accept=".xlsx,.csv"
            required
            className={`${input} file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Năm học</span>
          <select name="yearId" required className={input} defaultValue={years[0]?.id}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.code}</option>
            ))}
          </select>
        </label>
      </div>

      {state.error && (
        <div className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          <p className="font-medium">{state.error}</p>
          {state.details && (
            <ul className="mt-1 list-disc pl-5">
              {state.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      <div>
        <button
          disabled={pending || years.length === 0 || noForms}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <Upload size={16} />
          {pending ? "Đang đọc file…" : "Tải lên và kiểm tra"}
        </button>
      </div>
    </form>
  );
}
