import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { exampleSummary } from "../server/queries";

export default async function ExamplePage() {
  await requirePermission("analysis:read");
  const data = await exampleSummary();

  return (
    <>
      <PageHeader title="Module mẫu" description="Trang mẫu: kiểm quyền → đọc dữ liệu từ server/queries.ts → hiển thị." />
      <pre className="rounded border border-border bg-card p-4 text-xs">{JSON.stringify(data, null, 2)}</pre>
    </>
  );
}
