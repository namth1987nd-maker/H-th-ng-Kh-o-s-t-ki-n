import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/core/auth/session";
import { PageHeader } from "@/core/ui/page-header";
import { FIELDS } from "@/modules/results";
import { QuestionsEditor } from "../components/questions-editor";
import { formatQuestionLines } from "../domain/questions";
import { getForm } from "../server/queries";

export default async function FormQuestionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ ma: string }>;
  searchParams: Promise<{ "quay-lai"?: string }>;
}) {
  await requirePermission("import:write");
  const { ma } = await params;
  const sp = await searchParams;
  const form = await getForm({ code: decodeURIComponent(ma) });
  if (!form) notFound();
  const field = FIELDS.find((f) => f.id === form.field_id);

  // mở từ trang xem trước lô nhập → lưu xong quay lại đó (chỉ nhận đường dẫn lô nhập hợp lệ)
  const back = sp["quay-lai"];
  const returnTo = back && /^\/nhap-du-lieu\/[0-9a-f-]{36}$/i.test(back) ? back : undefined;

  return (
    <>
      {returnTo ? (
        <Link href={returnTo} className="text-sm text-primary hover:underline">← Quay lại kiểm tra file Excel</Link>
      ) : (
        <Link href={`/phieu/${form.code}`} className="text-sm text-primary hover:underline">← {form.code} · {form.name}</Link>
      )}
      <PageHeader
        title="Câu hỏi và đáp án"
        description={`Phiếu ${form.code} · ${form.name} · lĩnh vực ${field?.id}. ${field?.name} · hiện có ${form.questions.length} câu`}
      />
      {returnTo && (
        <p className="mb-4 rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900">
          Số câu phải trùng đầu số cột trong file Excel (“1. …” ↔ câu 1), và nội dung đáp án phải giống đáp án trên Google Form
          (không phân biệt hoa thường, dấu câu) thì câu trả lời mới được xếp đúng đáp án. Lưu xong sẽ tự quay lại trang kiểm tra file.
        </p>
      )}
      <QuestionsEditor
        formId={form.id}
        initialText={formatQuestionLines(form.questions)}
        existing={form.questions}
        nRounds={form.nRounds}
        returnTo={returnTo}
      />
    </>
  );
}
