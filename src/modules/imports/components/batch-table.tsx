import Link from "next/link";
import { BatchStatus } from "./batch-status";

export interface BatchRow {
  public_id: string;
  file_name: string;
  status: string;
  n_submissions: number;
  created_at: Date;
  year_code: string;
  form_code: string | null;
  form_name: string | null;
}

export function BatchTable({ rows }: { rows: BatchRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted">Chưa có lần nhập nào.</p>;
  return (
    <div className="overflow-x-auto rounded border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
          <tr>
            <th className="px-4 py-2">File</th>
            <th className="px-4 py-2">Phiếu</th>
            <th className="px-4 py-2">Năm học</th>
            <th className="px-4 py-2">Trạng thái</th>
            <th className="px-4 py-2 text-right">Số phiếu</th>
            <th className="px-4 py-2">Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.public_id} className="border-t border-border hover:bg-slate-50">
              <td className="max-w-xs truncate px-4 py-2">
                <Link href={`/nhap-du-lieu/${b.public_id}`} className="text-primary hover:underline" title={b.file_name}>{b.file_name}</Link>
              </td>
              <td className="px-4 py-2">
                {b.form_code ? (
                  <Link href={`/phieu/${b.form_code}`} className="hover:underline" title={b.form_name ?? ""}>{b.form_code}</Link>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-2">{b.year_code}</td>
              <td className="px-4 py-2"><BatchStatus status={b.status} /></td>
              <td className="px-4 py-2 text-right">{b.n_submissions.toLocaleString("vi-VN")}</td>
              <td className="px-4 py-2 text-muted">{new Date(b.created_at).toLocaleString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
