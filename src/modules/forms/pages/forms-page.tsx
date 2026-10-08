import Link from "next/link";
import { ListChecks, Pencil, Plus } from "lucide-react";
import { requirePermission } from "@/core/auth/session";
import { can } from "@/core/lib/rbac";
import { cn } from "@/core/lib/utils";
import { PageHeader } from "@/core/ui/page-header";
import { FIELDS, fieldByCode } from "@/modules/results";
import { DeleteFormButton } from "../components/delete-form-button";
import { listForms } from "../server/queries";

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ linhvuc?: string }> }) {
  const user = await requirePermission("analysis:read");
  const { linhvuc } = await searchParams;
  const field = linhvuc ? fieldByCode(linhvuc) : undefined;
  const forms = await listForms(field?.id);
  const editable = can(user.role, "import:write");

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Phiếu đánh giá" description="Mỗi phiếu thuộc một lĩnh vực, gồm n câu hỏi kèm đáp án; file Excel kết quả được nhập theo từng phiếu." />
        {editable && (
          <Link href="/phieu/moi" className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Plus size={16} /> Tạo phiếu
          </Link>
        )}
      </div>

      {/* lọc theo lĩnh vực */}
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/phieu" className={cn("rounded-full border px-3 py-1", !field ? "border-primary bg-primary/10 text-primary" : "border-border")}>
          Tất cả
        </Link>
        {FIELDS.map((f) => (
          <Link
            key={f.code}
            href={`/phieu?linhvuc=${f.code}`}
            className={cn("rounded-full border px-3 py-1", field?.id === f.id ? "border-primary bg-primary/10 text-primary" : "border-border")}
          >
            {f.id}. {f.name}
          </Link>
        ))}
      </div>

      {forms.length === 0 ? (
        <p className="rounded border border-dashed border-border bg-card p-6 text-sm text-muted">Chưa có phiếu nào{field ? " trong lĩnh vực này" : ""}.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Mã</th>
                <th className="px-4 py-2">Tên phiếu</th>
                <th className="px-4 py-2">Lĩnh vực</th>
                <th className="px-4 py-2 text-right">Câu hỏi</th>
                <th className="px-4 py-2 text-right">Đợt đã nhập</th>
                <th className="px-4 py-2 text-right">Phiếu trả lời</th>
                {editable && <th className="px-4 py-2 text-right">Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t border-border hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/phieu/${f.code}`} className="text-primary hover:underline">{f.code}</Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/phieu/${f.code}`} className="hover:underline">{f.name}</Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{FIELDS.find((x) => x.id === f.fieldId)?.name}</td>
                  <td className="px-4 py-2 text-right">{f.nQuestions}</td>
                  <td className="px-4 py-2 text-right">{f.nRounds}</td>
                  <td className="px-4 py-2 text-right">{f.nResponses.toLocaleString("vi-VN")}</td>
                  {editable && (
                    <td className="px-4 py-1">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/phieu/${f.code}/cau-hoi`} title="Câu hỏi & đáp án" aria-label={`Câu hỏi phiếu ${f.code}`} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-foreground">
                          <ListChecks size={16} />
                        </Link>
                        <Link href={`/phieu/${f.code}/sua`} title="Sửa thông tin" aria-label={`Sửa phiếu ${f.code}`} className="rounded p-1.5 text-muted hover:bg-slate-100 hover:text-foreground">
                          <Pencil size={16} />
                        </Link>
                        <DeleteFormButton compact form={{ id: f.id, code: f.code, name: f.name, nRounds: f.nRounds, nResponses: f.nResponses }} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
