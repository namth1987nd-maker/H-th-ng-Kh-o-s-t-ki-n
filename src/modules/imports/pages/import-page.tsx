import Link from "next/link";
import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { listForms } from "@/modules/forms/server";
import { FIELDS } from "@/modules/results";
import { BatchTable } from "../components/batch-table";
import { UploadForm } from "../components/upload-form";
import { academicYears, recentBatches } from "../server/queries";

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ phieu?: string }> }) {
  await requirePermission("import:write");
  const { phieu } = await searchParams;
  const [years, batches, forms] = await Promise.all([academicYears(), recentBatches(10), listForms()]);

  const formGroups = FIELDS.map((f) => ({
    field: `${f.id}. ${f.name}`,
    forms: forms.filter((x) => x.fieldId === f.id && x.active).map((x) => ({ id: x.id, code: x.code, name: x.name })),
  })).filter((g) => g.forms.length > 0);

  return (
    <>
      <PageHeader
        title="Nhập dữ liệu"
        description="Chọn phiếu đánh giá rồi tải file kết quả Google Form. Câu hỏi trong file được ghép với câu hỏi của phiếu theo số thứ tự."
      />

      {forms.length === 0 && (
        <p className="mb-6 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Chưa có phiếu đánh giá nào. <Link href="/phieu/moi" className="font-medium underline">Tạo phiếu</Link> trước khi nhập dữ liệu.
        </p>
      )}
      {years.length === 0 && (
        <p className="mb-6 rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Chưa có năm học nào — chạy <code>npm run db:seed</code>.</p>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <UploadForm years={years} formGroups={formGroups} defaultFormId={forms.find((f) => f.code === phieu)?.id} />
        <aside className="rounded border border-border bg-card p-5 text-sm">
          <p className="mb-2 font-medium">Yêu cầu file</p>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>Dòng 1 là tiêu đề, có cột <b>Đối tượng</b> (không phân biệt hoa thường, dấu).</li>
            <li>Cột câu hỏi có đầu số <i>“1. …”, “2. …”</i> — khớp với số câu của phiếu.</li>
            <li>Phiếu chưa có câu hỏi: lấy câu hỏi từ file này.</li>
            <li>Mỗi đối tượng lưu thành một <b>đợt mới</b> của phiếu.</li>
            <li>Email, họ tên, SĐT không được lưu.</li>
          </ul>
        </aside>
      </div>

      <h2 className="mb-3 text-lg font-semibold">Lần nhập gần đây</h2>
      <BatchTable rows={batches} />
    </>
  );
}
