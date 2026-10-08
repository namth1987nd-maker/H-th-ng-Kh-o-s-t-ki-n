import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSpreadsheet, ListChecks, Pencil, Upload } from "lucide-react";
import { requirePermission } from "@/core/auth/session";
import { can } from "@/core/lib/rbac";
import { cn } from "@/core/lib/utils";
import { PageHeader } from "@/core/ui/page-header";
import { formatRate } from "@/modules/alerts";
import { FIELDS } from "@/modules/results";
import { KIND_LABEL, type QuestionKind } from "../domain/questions";
import { formQuestionStats, formRounds, getForm, type QuestionStat } from "../server/queries";

const KIND_CLS: Record<QuestionKind, string> = {
  SCALE: "bg-green-100 text-green-800",
  CHOICE: "bg-blue-100 text-blue-800",
  TEXT: "bg-slate-100 text-slate-700",
};

const pct = (n: number, total: number) => (total > 0 ? (n / total) * 100 : 0);
const pctText = (n: number, total: number) => `${pct(n, total).toFixed(1).replace(".", ",")}%`;

function QuestionCard({ q }: { q: QuestionStat }) {
  return (
    <li className="rounded border border-border bg-card p-4">
      <div className="flex flex-wrap items-start gap-2">
        <span className="font-mono text-sm text-muted">{q.qNo}.</span>
        <p className="flex-1 text-sm font-medium">{q.text}</p>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", KIND_CLS[q.kind])}>{KIND_LABEL[q.kind]}</span>
      </div>

      <p className="ml-6 mt-1 text-xs text-muted">
        Tổng <b className="text-foreground">{q.n.toLocaleString("vi-VN")}</b> câu trả lời
        {q.kind === "SCALE" && q.nScored > 0 && (
          <> · Hài lòng <b className={q.nSatisfied * 10 >= q.nScored * 7 ? "text-ok" : "text-danger"}>{formatRate(q.nSatisfied, q.nScored)}</b></>
        )}
      </p>

      {q.options.length > 0 && (
        <ul className="ml-6 mt-3 space-y-1.5">
          {q.options.map((o) => (
            <li key={o.key} className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(4rem,10rem)_5.5rem] items-center gap-2 text-sm">
              <span className="font-mono text-muted">{o.key}.</span>
              <span className="truncate" title={o.text}>{o.text}</span>
              <span className="h-2 overflow-hidden rounded bg-slate-100">
                <span
                  className={cn("block h-full rounded", o.score === null ? "bg-blue-500" : o.score >= 4 ? "bg-green-500" : "bg-amber-500")}
                  style={{ width: `${pct(o.n, q.n)}%` }}
                />
              </span>
              <span className="text-right tabular-nums">
                {o.n.toLocaleString("vi-VN")} <span className="text-xs text-muted">({pctText(o.n, q.n)})</span>
              </span>
            </li>
          ))}
          {q.nOther > 0 && (
            <li className="grid grid-cols-[1.25rem_minmax(0,1fr)_minmax(4rem,10rem)_5.5rem] gap-2 text-sm text-muted">
              <span />
              <span>Không khớp đáp án</span>
              <span />
              <span className="text-right tabular-nums">{q.nOther.toLocaleString("vi-VN")}</span>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

export default async function FormDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ ma: string }>;
  searchParams: Promise<{ dot?: string }>;
}) {
  const user = await requirePermission("analysis:read");
  const { ma } = await params;
  const { dot } = await searchParams;
  const form = await getForm({ code: decodeURIComponent(ma) });
  if (!form) notFound();

  const rounds = await formRounds(form.id);
  const roundId = rounds.some((r) => r.id === dot) ? dot : undefined;
  const stats = await formQuestionStats(form.id, roundId);
  const field = FIELDS.find((f) => f.id === form.field_id);
  const editable = can(user.role, "import:write");
  const nOptions = form.questions.reduce((s, q) => s + q.options.length, 0);

  return (
    <>
      <Link href="/phieu" className="text-sm text-primary hover:underline">← Phiếu đánh giá</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title={form.name}
          description={`Mã ${form.code} · Lĩnh vực ${field?.id}. ${field?.name} · ${form.questions.length} câu hỏi, ${nOptions} đáp án`}
        />
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Link href={`/phieu/${form.code}/cau-hoi`} className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm">
              <ListChecks size={16} /> Câu hỏi & đáp án
            </Link>
            <Link href={`/nhap-du-lieu?phieu=${form.code}`} className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              <Upload size={16} /> Nhập Excel
            </Link>
            <Link href={`/phieu/${form.code}/sua`} className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 text-sm">
              <Pencil size={16} /> Sửa thông tin
            </Link>
          </div>
        )}
      </div>
      {form.description && <p className="-mt-3 mb-6 text-sm text-muted">{form.description}</p>}

      {/* ── Thống kê số lượng theo câu hỏi / đáp án ── */}
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">Số lượng câu trả lời theo từng đáp án</h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <form method="get" className="flex items-center gap-2">
              <select name="dot" defaultValue={roundId ?? ""} className="rounded border border-border px-3 py-1.5">
                <option value="">Tất cả các đợt</option>
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.subject_name} · Đợt {r.round_no} ({r.year_code})
                  </option>
                ))}
              </select>
              <button className="rounded border border-border px-3 py-1.5">Xem</button>
            </form>
            {stats.length > 0 && (
              // thẻ <a> thường (không dùng Link) để trình duyệt tải file về
              <a
                href={`/api/phieu/${form.code}/xuat-excel${roundId ? `?dot=${roundId}` : ""}`}
                className="inline-flex items-center gap-2 rounded border border-green-600 bg-green-50 px-3 py-1.5 font-medium text-green-800 hover:bg-green-100"
                title={roundId ? "Xuất Excel thống kê của đợt đang xem" : "Xuất Excel thống kê tất cả các đợt"}
              >
                <FileSpreadsheet size={16} /> Xuất Excel
              </a>
            )}
          </div>
        </div>

        {stats.length === 0 ? (
          <p className="rounded border border-dashed border-border bg-card p-6 text-sm text-muted">
            Phiếu chưa có câu hỏi.{" "}
            {editable && <Link href={`/phieu/${form.code}/cau-hoi`} className="text-primary underline">Nhập câu hỏi và đáp án</Link>}
          </p>
        ) : (
          <ol className="space-y-3">
            {stats.map((q) => <QuestionCard key={q.qNo} q={q} />)}
          </ol>
        )}
        <p className="mt-2 text-xs text-muted">
          Câu thang đánh giá: % hài lòng = (đáp án a + b) / số câu trả lời có điểm. Câu lựa chọn và tự luận chỉ đếm số lượng.
        </p>
      </section>

      {/* ── Các đợt đã nhập ── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Các đợt đã nhập ({rounds.length})</h2>
        {rounds.length === 0 ? (
          <p className="text-sm text-muted">Chưa nhập dữ liệu cho phiếu này.</p>
        ) : (
          <div className="overflow-x-auto rounded border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-3 py-2">Đối tượng</th>
                  <th className="px-3 py-2">Đợt</th>
                  <th className="px-3 py-2">Năm học</th>
                  <th className="px-3 py-2">File nguồn</th>
                  <th className="px-3 py-2 text-right">Số phiếu</th>
                  <th className="px-3 py-2">Ngày nhập</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link href={`/doi-tuong/${r.subject_code}`} className="text-primary hover:underline">{r.subject_name}</Link>
                      <span className="ml-1 font-mono text-xs text-muted">{r.subject_code}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/phieu/${form.code}?dot=${r.id}`} className="hover:underline">Đợt {r.round_no}</Link>
                    </td>
                    <td className="px-3 py-2">{r.year_code}</td>
                    <td className="max-w-xs truncate px-3 py-2">
                      <Link href={`/nhap-du-lieu/${r.batch_public_id}`} className="text-muted hover:underline" title={r.file_name}>{r.file_name}</Link>
                    </td>
                    <td className="px-3 py-2 text-right">{r.n_responses.toLocaleString("vi-VN")}</td>
                    <td className="px-3 py-2 text-muted">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
