import { PageHeader } from "@/core/ui/page-header";
import { FIELDS } from "@/modules/results";
import { fieldSummaryByYear, type FieldYearRow } from "@/modules/results/server";
import { formatRate, isDeclined } from "@/modules/alerts";

async function load(): Promise<{ rows: FieldYearRow[]; error?: string }> {
  try {
    return { rows: await fieldSummaryByYear() };
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function OverviewPage() {
  const { rows, error } = await load();

  // Năm học mới nhất có dữ liệu của từng lĩnh vực (rows đã sắp theo năm tăng dần)
  const latest = new Map<number, FieldYearRow>();
  for (const r of rows) latest.set(r.fieldId, r);

  return (
    <>
      <PageHeader title="Tổng quan" description="Tỷ lệ hài lòng (Rất hài lòng + Hài lòng) theo 8 lĩnh vực, năm học mới nhất có dữ liệu." />
      {error && <p className="mb-4 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Không đọc được số liệu: {error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {FIELDS.map((f) => {
          const r = latest.get(f.id);
          const declined = r && r.prevNAnswers !== null && r.prevNSatisfied !== null
            ? isDeclined({ nSatisfied: r.nSatisfied, nAnswers: r.nAnswers }, { nSatisfied: r.prevNSatisfied, nAnswers: r.prevNAnswers })
            : false;
          return (
            <section key={f.id} className="rounded border border-border bg-card p-4">
              <h2 className="text-sm text-muted">{f.name}</h2>
              {r ? (
                <>
                  <p className={`mt-2 text-3xl font-semibold ${r.belowThreshold ? "text-danger" : "text-ok"}`}>
                    {formatRate(r.nSatisfied, r.nAnswers)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {r.yearCode} · {r.nSubmissions.toLocaleString("vi-VN")} phiếu
                  </p>
                  {(r.belowThreshold || declined) && (
                    <p className="mt-2 text-xs font-medium text-danger">
                      {[r.belowThreshold && "Dưới ngưỡng", declined && "Giảm so với năm trước"].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-sm text-muted">Chưa có dữ liệu</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
