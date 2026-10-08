import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { can } from "@/core/lib/rbac";
import { PageHeader } from "@/core/ui/page-header";
import { listForms } from "@/modules/forms/server";
import { fieldByCode } from "../domain/fields";

export default async function FieldPage({ params }: { params: Promise<{ ma: string }> }) {
  const user = await requirePermission("analysis:read");
  const { ma } = await params;
  const field = fieldByCode(ma);
  if (!field) notFound();

  const forms = await listForms(field.id);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title={field.name} description={`Lĩnh vực ${field.id} · ${forms.length} phiếu đánh giá`} />
        {can(user.role, "import:write") && (
          <Link href="/phieu/moi" className="rounded border border-border px-4 py-2 text-sm">+ Tạo phiếu</Link>
        )}
      </div>

      {forms.length === 0 ? (
        <p className="rounded border border-dashed border-border bg-card p-6 text-sm text-muted">Lĩnh vực này chưa có phiếu đánh giá.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {forms.map((f) => (
            <Link key={f.id} href={`/phieu/${f.code}`} className="rounded border border-border bg-card p-4 transition-colors hover:border-primary">
              <p className="font-mono text-xs text-muted">{f.code}</p>
              <p className="mt-1 font-medium">{f.name}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div><dt className="text-muted">Câu hỏi</dt><dd className="text-lg font-semibold">{f.nQuestions}</dd></div>
                <div><dt className="text-muted">Đợt</dt><dd className="text-lg font-semibold">{f.nRounds}</dd></div>
                <div><dt className="text-muted">Phiếu TL</dt><dd className="text-lg font-semibold">{f.nResponses.toLocaleString("vi-VN")}</dd></div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
