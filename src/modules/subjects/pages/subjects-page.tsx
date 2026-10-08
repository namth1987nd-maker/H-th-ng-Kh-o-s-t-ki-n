import Link from "next/link";
import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { listSubjects } from "../server/queries";

export default async function SubjectsPage() {
  await requirePermission("analysis:read");
  const subjects = await listSubjects();

  return (
    <>
      <PageHeader title="Đối tượng" description="Mỗi đối tượng có một mã cố định; mỗi lần nhập dữ liệu tạo một đợt riêng." />
      {subjects.length === 0 ? (
        <p className="rounded border border-dashed border-border bg-card p-6 text-sm text-muted">
          Chưa có đối tượng nào. Vào <Link href="/nhap-du-lieu" className="text-primary underline">Nhập dữ liệu</Link> để tải file kết quả.
        </p>
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Mã</th>
                <th className="px-4 py-2">Đối tượng</th>
                <th className="px-4 py-2 text-right">Số đợt</th>
                <th className="px-4 py-2 text-right">Tổng phiếu</th>
                <th className="px-4 py-2">Lần nhập gần nhất</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => (
                <tr key={s.code} className="border-t border-border hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/doi-tuong/${s.code}`} className="text-primary hover:underline">{s.code}</Link>
                  </td>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2 text-right">{s.nRounds}</td>
                  <td className="px-4 py-2 text-right">{s.nResponses.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-2 text-muted">{s.lastAt ? new Date(s.lastAt).toLocaleString("vi-VN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
