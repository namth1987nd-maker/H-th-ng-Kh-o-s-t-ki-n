import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { cn } from "@/core/lib/utils";
import { PageHeader } from "@/core/ui/page-header";
import { KIND_LABEL, matchQuestions, type FormQuestion } from "@/modules/forms";
import { getForm } from "@/modules/forms/server";
import { FIELDS } from "@/modules/results";
import { lookupSubjects } from "@/modules/subjects/server";
import { BatchStatus } from "../components/batch-status";
import { answerValueMapping, questionAnswerCounts, type ValueMapping } from "../domain/mapping";
import { adoptFromFileAction, cancelAction, commitAction, rollbackAction } from "../server/actions";
import { analyzeBatch, loadBatch } from "../server/queries";

const th = "px-4 py-2";
const td = "px-4 py-2";

type ColStatus = "ok" | "differs" | "missing" | "extra";
const COL_STATUS: Record<ColStatus, { label: string; cls: string }> = {
  ok: { label: "Khớp câu hỏi", cls: "bg-green-100 text-green-800" },
  differs: { label: "Khác nội dung — vẫn ghép theo số", cls: "bg-amber-100 text-amber-800" },
  missing: { label: "File không có cột này", cls: "bg-slate-100 text-slate-600" },
  extra: { label: "Phiếu không có câu này — bỏ qua", cls: "bg-red-100 text-red-700" },
};

export default async function PreviewPage({ params }: { params: Promise<{ ma: string }> }) {
  await requirePermission("import:write");
  const { ma } = await params;
  const batch = await loadBatch(ma);
  if (!batch) notFound();

  const [a, form] = await Promise.all([analyzeBatch(batch), batch.form_id ? getForm({ id: batch.form_id }) : undefined]);
  const existing = await lookupSubjects(a.groups.map((g) => g.key), batch.form_id);
  const counts = questionAnswerCounts(a);
  const staged = batch.status === "STAGED";
  const field = form && FIELDS.find((f) => f.id === form.field_id);
  const formEmpty = !!form && form.questions.length === 0;

  // ── Ghép cột câu hỏi trong file ↔ câu hỏi của phiếu theo SỐ câu, rồi từng giá trị ↔ đáp án ──
  const m = matchQuestions(form?.questions ?? [], a.questions);
  const formBy = new Map((form?.questions ?? []).map((q) => [q.qNo, q]));
  const valueMap: Map<number, ValueMapping[]> = form ? answerValueMapping(a.groups, form.questions) : new Map();
  type Row = { qNo: number; status: ColStatus; formQ?: FormQuestion; fileText: string | null };
  const rows: Row[] = [
    ...m.matched.map((x): Row => ({ qNo: x.qNo, status: x.textDiffers ? "differs" : "ok", formQ: formBy.get(x.qNo), fileText: x.fileText })),
    ...m.missingInFile.map((x): Row => ({ qNo: x.qNo, status: "missing", formQ: formBy.get(x.qNo), fileText: null })),
    ...m.extraInFile.map((x): Row => ({ qNo: x.qNo, status: "extra", fileText: x.text })),
  ].sort((x, y) => x.qNo - y.qNo);

  const unmatchedOf = (qNo: number) => (valueMap.get(qNo) ?? []).filter((v) => v.optKey === null);
  const nMapped = m.matched.length;
  const nUnmatchedValues = m.matched.reduce((s, x) => s + unmatchedOf(x.qNo).length, 0);
  const nUnmatchedAnswers = m.matched.reduce((s, x) => s + unmatchedOf(x.qNo).reduce((t, v) => t + v.n, 0), 0);
  const fullyMapped = !formEmpty && nMapped === a.questions.length && nUnmatchedValues === 0;
  const fixHref = form ? `/phieu/${form.code}/cau-hoi?quay-lai=/nhap-du-lieu/${batch.public_id}` : "#";

  const canSave = staged && !!form && a.fatal.length === 0 && a.groups.length > 0 && (formEmpty || nMapped > 0);

  return (
    <>
      <Link href="/nhap-du-lieu" className="text-sm text-primary hover:underline">← Nhập dữ liệu</Link>
      <PageHeader title={batch.file_name} description={`Năm học ${batch.year_code} · sheet “${a.sheet}” · ${a.totals.rows} dòng dữ liệu`} />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <BatchStatus status={batch.status} />
        {form ? (
          <span>
            Phiếu <Link href={`/phieu/${form.code}`} className="font-medium text-primary hover:underline">{form.code} · {form.name}</Link>
            <span className="text-muted"> — lĩnh vực {field?.id}. {field?.name}</span>
          </span>
        ) : (
          <span className="text-danger">Lô chưa gắn phiếu đánh giá.</span>
        )}
        {batch.status === "COMMITTED" && (
          <span className="text-muted">
            · Đã lưu {batch.n_submissions.toLocaleString("vi-VN")} phiếu, {batch.n_answers.toLocaleString("vi-VN")} câu trả lời
            {batch.committed_at && ` lúc ${new Date(batch.committed_at).toLocaleString("vi-VN")}`}.
          </span>
        )}
      </div>

      {a.fatal.length > 0 && (
        <div className="mb-6 rounded border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <p className="font-medium">File chưa đúng cấu trúc, không thể lưu:</p>
          <ul className="mt-1 list-disc pl-5">{a.fatal.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
      )}

      {/* ── Kết quả đối chiếu ── */}
      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Đối chiếu câu hỏi và đáp án</h2>

        {formEmpty ? (
          <div className="mb-4 rounded border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-medium">Phiếu chưa có câu hỏi.</p>
            <p className="mt-1">
              File có {a.questions.length} cột câu hỏi (“1. …”, “2. …”). Tạo câu hỏi + đáp án cho phiếu từ chính file này, sau đó soát lại:
              bổ sung đáp án chưa ai chọn, sắp thứ tự (a là tốt nhất), đổi loại câu nếu cần — rồi quay lại đây.
            </p>
            {staged && (
              <form action={adoptFromFileAction} className="mt-3">
                <input type="hidden" name="batch" value={batch.public_id} />
                <button className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Tạo câu hỏi + đáp án từ file này</button>
              </form>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "mb-4 flex flex-wrap items-center justify-between gap-3 rounded border p-4 text-sm",
              fullyMapped ? "border-green-300 bg-green-50 text-green-900" : "border-amber-300 bg-amber-50 text-amber-900",
            )}
          >
            <div>
              <p className="font-medium">
                {fullyMapped
                  ? `Đã ghép đủ: ${nMapped}/${a.questions.length} câu, mọi câu trả lời đều khớp đáp án.`
                  : `Ghép ${nMapped}/${a.questions.length} cột câu hỏi · ${nUnmatchedValues} giá trị (${nUnmatchedAnswers} câu trả lời) chưa khớp đáp án.`}
              </p>
              {!fullyMapped && (
                <p className="mt-1">
                  Giá trị chưa khớp vẫn được lưu nguyên văn nhưng <b>không tính vào đáp án và % hài lòng</b>. Sửa đáp án của phiếu cho giống hệt
                  Google Form, lưu xong sẽ tự quay lại đây để kiểm tra lại.
                </p>
              )}
            </div>
            {!fullyMapped && form && (
              <Link href={fixHref} className="shrink-0 rounded border border-amber-400 bg-white px-4 py-2 font-medium">
                Sửa câu hỏi & đáp án của phiếu
              </Link>
            )}
          </div>
        )}

        <p className="mb-3 text-xs text-muted">
          Cột đối tượng: <b>{a.subjectHeader ?? "—"}</b> · Cột thời gian: <b>{a.timestampHeader ?? "không có"}</b>
          {a.extraHeaders.length > 0 && <> · Lưu kèm phiếu: {a.extraHeaders.join(", ")}</>}
          {a.personalHeaders.length > 0 && <> · Không lưu (thông tin cá nhân): {a.personalHeaders.join(", ")}</>}
        </p>

        {!formEmpty && (
          <ol className="space-y-2">
            {rows.map((r) => {
              const values = r.status === "extra" ? undefined : valueMap.get(r.qNo);
              const bad = unmatchedOf(r.qNo).length;
              const optText = (k: string | null) => r.formQ?.options.find((o) => o.key === k)?.text;
              return (
                <li key={`${r.qNo}-${r.status}`} className="rounded border border-border bg-card">
                  <details open={bad > 0}>
                    <summary className="flex cursor-pointer list-none flex-wrap items-start gap-2 p-3 text-sm">
                      <span className="w-8 font-mono text-muted">{r.qNo}.</span>
                      <span className="min-w-0 flex-1">
                        {r.formQ?.text ?? <span className="text-muted">{r.fileText}</span>}
                        {r.status === "differs" && <span className="mt-0.5 block text-xs text-muted">Cột trong file: {r.fileText}</span>}
                      </span>
                      <span className={cn("whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", COL_STATUS[r.status].cls)}>
                        {COL_STATUS[r.status].label}
                      </span>
                      {r.formQ && <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-0.5 text-xs">{KIND_LABEL[r.formQ.kind]}</span>}
                      {r.fileText && <span className="w-24 text-right text-xs text-muted">{counts.get(r.qNo)?.answers ?? 0} trả lời</span>}
                      {values && r.fileText && (
                        <span className={cn("w-28 text-right text-xs font-medium", bad > 0 ? "text-amber-700" : "text-ok")}>
                          {bad > 0 ? `${bad} giá trị chưa khớp` : "Khớp đủ đáp án"}
                        </span>
                      )}
                    </summary>

                    {values && values.length > 0 && (
                      <table className="mb-3 ml-11 mr-3 w-[calc(100%-3.5rem)] text-xs">
                        <thead className="text-left text-muted">
                          <tr>
                            <th className="py-1 font-normal">Giá trị trong file</th>
                            <th className="py-1 font-normal">→ Đáp án của phiếu</th>
                            <th className="py-1 text-right font-normal">Số lần</th>
                          </tr>
                        </thead>
                        <tbody>
                          {values.map((v) => (
                            <tr key={v.value} className={cn("border-t border-border", v.optKey === null && "bg-amber-50")}>
                              <td className="py-1 pr-3">{v.value}</td>
                              <td className="py-1 pr-3">
                                {v.optKey ? (
                                  <span><b className="font-mono">{v.optKey}.</b> {optText(v.optKey)}</span>
                                ) : (
                                  <span className="font-medium text-amber-700">⚠ Chưa khớp đáp án nào</span>
                                )}
                              </td>
                              <td className="py-1 text-right tabular-nums">{v.n}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── Đối tượng → đợt ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Đối tượng trong file</h2>
        <div className="overflow-x-auto rounded border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className={th}>Đối tượng</th>
                <th className={th}>Mã</th>
                <th className={th}>{staged ? "Sẽ lưu thành" : "Số đợt hiện có của phiếu"}</th>
                <th className={`${th} text-right`}>Số phiếu</th>
              </tr>
            </thead>
            <tbody>
              {a.groups.map((g) => {
                const s = existing.get(g.key);
                return (
                  <tr key={g.key} className="border-t border-border">
                    <td className={td}>{g.name}</td>
                    <td className={`${td} font-mono`}>
                      {s ? <Link href={`/doi-tuong/${s.code}`} className="text-primary hover:underline">{s.code}</Link> : <span className="text-muted">—</span>}
                    </td>
                    <td className={td}>
                      {staged
                        ? s
                          ? <>Đợt {s.nRounds + 1} <span className="text-muted">(phiếu này đã có {s.nRounds} đợt của đối tượng)</span></>
                          : <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Đối tượng mới · Đợt 1</span>
                        : `${s?.nRounds ?? 0} đợt`}
                    </td>
                    <td className={`${td} text-right`}>{g.rows.length.toLocaleString("vi-VN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {a.rowIssues.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Dòng bị bỏ qua ({a.rowIssues.length})</h2>
          <ul className="max-h-60 overflow-y-auto rounded border border-border bg-card p-4 text-sm">
            {a.rowIssues.map((r) => <li key={r.rowNo}>Dòng {r.rowNo}: {r.message}</li>)}
          </ul>
        </section>
      )}

      {/* ── Hành động ── */}
      <div className="flex flex-wrap items-center gap-3">
        {canSave && (
          <form action={commitAction}>
            <input type="hidden" name="batch" value={batch.public_id} />
            <button className={cn("rounded px-4 py-2 text-sm font-medium", fullyMapped || formEmpty ? "bg-primary text-primary-foreground" : "border border-amber-400 bg-amber-50 text-amber-900")}>
              {fullyMapped || formEmpty
                ? `Lưu ${a.totals.responses.toLocaleString("vi-VN")} phiếu thành ${a.groups.length} đợt mới`
                : `Vẫn lưu (${nUnmatchedAnswers} câu trả lời chưa khớp đáp án)`}
            </button>
          </form>
        )}
        {staged && (
          <form action={cancelAction}>
            <input type="hidden" name="batch" value={batch.public_id} />
            <button className="rounded border border-border px-4 py-2 text-sm">Hủy</button>
          </form>
        )}
        {batch.status === "COMMITTED" && (
          <form action={rollbackAction}>
            <input type="hidden" name="batch" value={batch.public_id} />
            <button className="rounded border border-danger/40 px-4 py-2 text-sm text-danger">Hoàn tác lô này (xóa các đợt đã tạo)</button>
          </form>
        )}
      </div>
    </>
  );
}
