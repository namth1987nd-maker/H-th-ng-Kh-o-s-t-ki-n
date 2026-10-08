import Link from "next/link";
import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { FIELDS } from "@/modules/results";
import { FormEditor } from "../components/form-editor";

export default async function FormNewPage() {
  await requirePermission("import:write");
  return (
    <>
      <Link href="/phieu" className="text-sm text-primary hover:underline">← Phiếu đánh giá</Link>
      <PageHeader title="Tạo phiếu đánh giá" description="Mã phiếu (PHxxxx) được cấp tự động, cố định, không trùng." />
      <FormEditor fields={FIELDS} />
    </>
  );
}
