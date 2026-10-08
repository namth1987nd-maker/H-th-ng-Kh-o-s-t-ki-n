import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { FIELDS } from "@/modules/results";
import { DeleteFormButton } from "../components/delete-form-button";
import { FormEditor } from "../components/form-editor";
import { getForm } from "../server/queries";

export default async function FormEditPage({ params }: { params: Promise<{ ma: string }> }) {
  await requirePermission("import:write");
  const { ma } = await params;
  const form = await getForm({ code: decodeURIComponent(ma) });
  if (!form) notFound();

  return (
    <>
      <Link href={`/phieu/${form.code}`} className="text-sm text-primary hover:underline">← {form.code}</Link>
      <PageHeader title={`Sửa thông tin phiếu ${form.code}`} description="Câu hỏi và đáp án sửa ở trang “Câu hỏi & đáp án”." />
      <FormEditor
        fields={FIELDS}
        initial={{ id: form.id, name: form.name, fieldId: form.field_id, description: form.description }}
      />

      <section className="mt-8 rounded border border-danger/30 p-5">
        <h2 className="mb-1 font-semibold text-danger">Xóa phiếu</h2>
        <p className="mb-3 text-sm text-muted">
          {form.hasData
            ? `Phiếu đã có ${form.nRounds} đợt, ${form.nResponses.toLocaleString("vi-VN")} phiếu trả lời. Xóa phiếu sẽ xóa luôn toàn bộ dữ liệu này (phải gõ mã phiếu để xác nhận).`
            : "Phiếu chưa có dữ liệu trả lời."}
        </p>
        <DeleteFormButton form={{ id: form.id, code: form.code, name: form.name, nRounds: form.nRounds, nResponses: form.nResponses }} />
      </section>
    </>
  );
}
