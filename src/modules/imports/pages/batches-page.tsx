import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { BatchTable } from "../components/batch-table";
import { recentBatches } from "../server/queries";

export default async function BatchesPage() {
  await requirePermission("import:write");
  const batches = await recentBatches(200);

  return (
    <>
      <PageHeader title="Lô nhập" description="Lịch sử các lần nhập; mở một lô để xem chi tiết, lưu hoặc hoàn tác." />
      <BatchTable rows={batches} />
    </>
  );
}
