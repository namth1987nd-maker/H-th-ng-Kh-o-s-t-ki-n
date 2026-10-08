import { getCurrentUser } from "@/core/auth/session";
import { can } from "@/core/lib/rbac";
import { FIELDS } from "@/modules/results";
import { buildStatsWorkbook } from "./export-excel";
import { formQuestionStats, formRounds, getForm } from "./queries";

/**
 * GET /api/phieu/[ma]/xuat-excel?dot=<id đợt>
 * Tải file Excel thống kê số lượng câu trả lời theo từng đáp án (tất cả các đợt, hoặc một đợt).
 */
export async function exportStatsExcel(req: Request, { params }: { params: Promise<{ ma: string }> }): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return new Response("Chưa đăng nhập", { status: 401 });
  if (!can(user.role, "analysis:read")) return new Response("Không có quyền", { status: 403 });

  const { ma } = await params;
  const form = await getForm({ code: decodeURIComponent(ma) });
  if (!form) return new Response("Không tìm thấy phiếu", { status: 404 });

  const dot = new URL(req.url).searchParams.get("dot");
  const rounds = await formRounds(form.id);
  const round = dot ? rounds.find((r) => r.id === dot) : undefined;
  const stats = await formQuestionStats(form.id, round?.id);
  const field = FIELDS.find((f) => f.id === form.field_id);

  const buf = await buildStatsWorkbook({
    formCode: form.code,
    formName: form.name,
    fieldLabel: field ? `${field.id}. ${field.name}` : "—",
    scopeLabel: round
      ? `${round.subject_name} · Đợt ${round.round_no} · Năm học ${round.year_code}`
      : `Tất cả các đợt (${rounds.length} đợt)`,
    nResponses: round ? round.n_responses : rounds.reduce((s, r) => s + r.n_responses, 0),
    stats,
  });

  const day = new Date().toISOString().slice(0, 10);
  const asciiName = `thong-ke-${form.code}${round ? `-dot-${round.round_no}` : ""}-${day}.xlsx`;
  const viName = `Thống kê ${form.code}${round ? ` - Đợt ${round.round_no}` : ""} - ${day}.xlsx`;

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(viName)}`,
      "Cache-Control": "no-store",
    },
  });
}
