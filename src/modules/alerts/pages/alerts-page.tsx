import { PageHeader, Todo } from "@/core/ui/page-header";

export default function AlertsPage() {
  return (
    <>
      <PageHeader title="Cảnh báo" description="Tiêu chí dưới 70% hoặc giảm so với năm học trước." />
      <Todo>Danh sách từ mv_sat_criterion_year + isBelowThreshold / isDeclined; nút tạo hành động PDCA.</Todo>
    </>
  );
}
