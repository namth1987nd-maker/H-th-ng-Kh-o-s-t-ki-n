import { cn } from "@/core/lib/utils";

const STATUS: Record<string, { label: string; cls: string }> = {
  STAGED: { label: "Chờ lưu", cls: "bg-amber-100 text-amber-800" },
  COMMITTED: { label: "Đã lưu", cls: "bg-green-100 text-green-800" },
  ROLLED_BACK: { label: "Đã hoàn tác", cls: "bg-slate-200 text-slate-700" },
  FAILED: { label: "Đã hủy", cls: "bg-slate-200 text-slate-700" },
};

export function BatchStatus({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, cls: "bg-slate-100" };
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", s.cls)}>{s.label}</span>;
}
