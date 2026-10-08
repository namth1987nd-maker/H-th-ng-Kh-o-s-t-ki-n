import { requirePermission } from "@/core/auth/session";
import { PageHeader, Todo } from "@/core/ui/page-header";

export default async function SettingsPage() {
  await requirePermission("config:write");

  return (
    <>
      <PageHeader title="Cấu hình" description="Quy tắc cỡ mẫu, ngưỡng, bộ câu hỏi và phiên bản, ánh xạ cột, danh mục, người dùng." />
      <Todo>Mọi thay đổi ghi audit_log (RULE_CHANGE).</Todo>
    </>
  );
}
