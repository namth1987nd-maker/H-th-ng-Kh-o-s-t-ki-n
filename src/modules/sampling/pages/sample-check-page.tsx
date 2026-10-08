import { PageHeader, Todo } from "@/core/ui/page-header";

export default function SampleCheckPage() {
  return (
    <>
      <PageHeader title="Kiểm tra mẫu" description="Đạt / chưa đạt cỡ mẫu theo lĩnh vực, còn thiếu bao nhiêu." />
      <Todo>Dùng teachingSampleCheck, ratioSampleCheck (server/queries.ts) và checkMinCount / checkMinRatio (domain). Cần nhập bảng population (tổng thể) ở trang Cấu hình.</Todo>
    </>
  );
}
