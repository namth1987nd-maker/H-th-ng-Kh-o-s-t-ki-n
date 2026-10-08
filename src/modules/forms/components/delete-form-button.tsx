"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { deleteFormAction } from "../server/actions";

interface Props {
  form: { id: number; code: string; name: string; nRounds: number; nResponses: number };
  /** compact = chỉ biểu tượng (dùng trong bảng danh sách). */
  compact?: boolean;
}

/**
 * Xóa phiếu. Chưa có dữ liệu: hỏi xác nhận. Đã có dữ liệu: phải gõ đúng mã phiếu,
 * vì xóa phiếu sẽ xóa luôn toàn bộ các đợt và câu trả lời đã nhập.
 */
export function DeleteFormButton({ form, compact }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  function onClick() {
    const fd = new FormData();
    fd.set("id", String(form.id));

    if (form.nRounds > 0) {
      const typed = window.prompt(
        `Phiếu ${form.code} đã có ${form.nRounds} đợt, ${form.nResponses.toLocaleString("vi-VN")} phiếu trả lời.\n` +
          `Xóa phiếu sẽ XÓA LUÔN toàn bộ dữ liệu này và không khôi phục được.\n\nGõ mã phiếu ${form.code} để xác nhận:`,
      );
      if (typed === null) return;
      if (typed.trim().toUpperCase() !== form.code) {
        setError(`Mã xác nhận không đúng (cần gõ ${form.code}).`);
        return;
      }
      fd.set("confirm", typed);
    } else if (!window.confirm(`Xóa phiếu ${form.code} · ${form.name}?`)) {
      return;
    }

    setError(undefined);
    start(async () => {
      const res = await deleteFormAction(fd); // thành công thì server chuyển về /phieu
      if (res?.error) setError(res.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title={`Xóa phiếu ${form.code}`}
        aria-label={`Xóa phiếu ${form.code}`}
        className={cn(
          "inline-flex items-center gap-2 rounded text-danger disabled:opacity-50",
          compact ? "p-1.5 hover:bg-danger/10" : "border border-danger/40 px-4 py-2 text-sm hover:bg-danger/5",
        )}
      >
        <Trash2 size={compact ? 16 : 16} />
        {!compact && (pending ? "Đang xóa…" : form.nRounds > 0 ? "Xóa phiếu và toàn bộ dữ liệu" : "Xóa phiếu")}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
