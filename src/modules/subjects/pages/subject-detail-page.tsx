import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { formatRate } from "@/modules/alerts";
import { subjectDetail } from "../server/queries";

export default async function SubjectDetailPage({ params }: { params: Promise<{ ma: string }> }) {
  await requirePermission("analysis:read");
  const { ma } = await params;
  const subject = await subjectDetail(decodeURIComponent(ma));
  if (!subject) notFound();

  return (
    <>
      <Link href="/doi-tuong" className="text-sm text-primary hover:underline">← Danh sách đối tượng</Link>
      <PageHeader title={subject.name} description={`Mã ${subject.code} · ${subject.rounds.length} đợt khảo sát (đợt đánh số riêng theo từng phiếu)`} />

      <div className="overflow-x-auto rounded border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2">Phiếu</th>
              <th className="px-4 py-2">Đợt</th>
              <th className="px-4 py-2">Năm học</th>
              <th className="px-4 py-2">File nguồn</th>
              <th className="px-4 py-2 text-right">Số phiếu</th>
              <th className="px-4 py-2 text-right">Số câu hỏi</th>
              <th className="px-4 py-2 text-right">Tỷ lệ hài lòng</th>
              <th className="px-4 py-2">Ngày nhập</th>
            </tr>
          </thead>
          <tbody>
            {subject.rounds.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2">
                  {r.formCode ? (
                    <Link href={`/phieu/${r.formCode}?dot=${r.id}`} className="text-primary hover:underline" title={r.formName ?? ""}>{r.formCode}</Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 font-medium">Đợt {r.roundNo}</td>
                <td className="px-4 py-2">{r.yearCode}</td>
                <td className="max-w-xs truncate px-4 py-2 text-muted" title={r.fileName}>{r.fileName}</td>
                <td className="px-4 py-2 text-right">{r.nResponses.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-2 text-right">{r.nQuestions}</td>
                <td className="px-4 py-2 text-right">{formatRate(r.nSatisfied, r.nScored)}</td>
                <td className="px-4 py-2 text-muted">{new Date(r.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">Tỷ lệ hài lòng = (Rất hài lòng + Hài lòng) / số câu trả lời có điểm của đợt; câu tự luận không tính.</p>
    </>
  );
}
