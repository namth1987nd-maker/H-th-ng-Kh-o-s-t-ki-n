import { PageHeader, Todo } from "@/core/ui/page-header";

export default function PdcaPage() {
  return (
    <>
      <PageHeader title="PDCA" description="Nguyên nhân, giải pháp, người phụ trách, hạn, trạng thái." />
      <Todo>Bảng pdca_action dạng danh sách hoặc kanban (OPEN → IN_PROGRESS → DONE → VERIFIED); soạn Plan / Check / Act.</Todo>
    </>
  );
}
