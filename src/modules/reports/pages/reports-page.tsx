import { PageHeader, Todo } from "@/core/ui/page-header";

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Báo cáo" description="Chọn loại, năm học, phạm vi, định dạng; lịch sử và tải về." />
      <Todo>Dựng dữ liệu → lưu report_run.data_snapshot (đóng băng) → docxtemplater điền templates/*.docx → LibreOffice ra PDF. Cần mẫu .docx đã gắn thẻ (xem templates/README.md).</Todo>
    </>
  );
}
