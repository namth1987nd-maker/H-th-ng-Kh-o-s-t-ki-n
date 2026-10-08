import { resolveAnswer, textKey, withKind, type FormQuestion } from "@/modules/forms";
import { toScore, type Analysis, type SubjectGroup } from "./google-form";

/**
 * Ghép câu trả lời trong file với câu hỏi + đáp án của phiếu:
 *  - chỉ giữ câu trả lời của các câu có trong `questions`;
 *  - câu có đáp án → gán đáp án (a, b…) và điểm của đáp án; không khớp → không đáp án, không điểm;
 *  - phiếu trả lời không còn câu nào thì bỏ, đối tượng không còn phiếu nào thì bỏ.
 */
export function applyFormQuestions(groups: SubjectGroup[], questions: FormQuestion[]): SubjectGroup[] {
  const byNo = new Map(questions.map((q) => [q.qNo, q]));
  return groups
    .map((g) => ({
      ...g,
      rows: g.rows
        .map((r) => ({
          ...r,
          answers: r.answers.flatMap((a) => {
            const q = byNo.get(a.qNo);
            if (!q) return [];
            const { optKey, score } = resolveAnswer(q, a.valueText, a.score);
            return [{ ...a, optKey, score }];
          }),
        }))
        .filter((r) => r.answers.length > 0),
    }))
    .filter((g) => g.rows.length > 0);
}

export interface ValueMapping {
  /** Giá trị trong file (lần xuất hiện đầu tiên). */
  value: string;
  /** Số câu trả lời có giá trị này. */
  n: number;
  /** Đáp án khớp (a, b…); null = chưa khớp đáp án nào của phiếu. */
  optKey: string | null;
}

/** Giá trị khác nhau trong file → câu trả lời của mỗi câu hỏi (gộp theo nội dung, bỏ qua hoa thường/dấu câu). */
function distinctValues(groups: SubjectGroup[]): Map<number, { value: string; n: number }[]> {
  const acc = new Map<number, Map<string, { value: string; n: number }>>();
  for (const g of groups)
    for (const r of g.rows)
      for (const a of r.answers) {
        const perQ = acc.get(a.qNo) ?? new Map<string, { value: string; n: number }>();
        const k = textKey(a.valueText);
        const v = perQ.get(k) ?? { value: a.valueText, n: 0 };
        v.n++;
        perQ.set(k, v);
        acc.set(a.qNo, perQ);
      }
  return new Map([...acc].map(([qNo, m]) => [qNo, [...m.values()]]));
}

/**
 * ĐỐI CHIẾU ĐÁP ÁN: với mỗi câu có đáp án, mỗi giá trị khác nhau trong file khớp vào đáp án nào.
 * Giá trị chưa khớp đứng đầu (để sửa), sau đó theo thứ tự đáp án a, b, c…
 */
export function answerValueMapping(groups: SubjectGroup[], questions: FormQuestion[]): Map<number, ValueMapping[]> {
  const values = distinctValues(groups);
  const out = new Map<number, ValueMapping[]>();
  for (const q of questions) {
    if (q.kind === "TEXT" || q.options.length === 0) continue;
    const list = (values.get(q.qNo) ?? []).map((v) => ({ ...v, optKey: resolveAnswer(q, v.value, null).optKey }));
    list.sort((a, b) => (a.optKey ?? "").localeCompare(b.optKey ?? "") || b.n - a.n);
    out.set(q.qNo, list);
  }
  return out;
}

/** Số câu trả lời KHÔNG khớp đáp án nào, theo từng câu hỏi có đáp án. */
export function unmatchedCounts(groups: SubjectGroup[], questions: FormQuestion[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const [qNo, list] of answerValueMapping(groups, questions)) {
    const n = list.filter((v) => v.optKey === null).reduce((s, v) => s + v.n, 0);
    if (n > 0) out.set(qNo, n);
  }
  return out;
}

/**
 * Bản nháp câu hỏi + đáp án lấy từ file (khi phiếu chưa có câu hỏi):
 *  - câu hỏi = tiêu đề cột "1. …", "2. …";
 *  - câu có ít giá trị khác nhau (≤ 8, mỗi giá trị trung bình ≥ 2 lần chọn) → các giá trị đó là đáp án;
 *    sắp mức nhận ra được (Rất hài lòng → Không hài lòng) trước, còn lại theo số lần chọn giảm dần;
 *  - câu có nhiều giá trị khác nhau → tự luận.
 * Đáp án chưa ai chọn sẽ không có trong file — người dùng bổ sung và soát thứ tự (a là tốt nhất) trước khi dùng.
 */
export function draftQuestionsFromFile(a: Pick<Analysis, "questions" | "groups">): FormQuestion[] {
  const values = distinctValues(a.groups);
  return a.questions.map((q): FormQuestion => {
    const list = values.get(q.qNo) ?? [];
    const total = list.reduce((s, v) => s + v.n, 0);
    // ≤ 8 giá trị khác nhau và mỗi giá trị trung bình được chọn ≥ 2 lần → câu chọn đáp án
    const isChoice = list.length > 0 && list.length <= 8 && list.length * 2 <= total + 1;
    if (!isChoice) return { qNo: q.qNo, text: q.text, kind: "TEXT", options: [] };

    const sorted = [...list].sort((x, y) => (toScore(y.value) ?? 0) - (toScore(x.value) ?? 0) || y.n - x.n);
    const options = sorted.map((v, i) => ({ key: "abcdefgh"[i]!, text: v.value, score: null }));
    return withKind({ qNo: q.qNo, text: q.text, kind: "SCALE", options }, "SCALE");
  });
}

/** Số câu trả lời và số câu quy đổi được điểm của từng câu hỏi trong file. */
export function questionAnswerCounts(a: Pick<Analysis, "groups">): Map<number, { answers: number; scored: number }> {
  const out = new Map<number, { answers: number; scored: number }>();
  for (const g of a.groups)
    for (const r of g.rows)
      for (const x of r.answers) {
        const c = out.get(x.qNo) ?? { answers: 0, scored: 0 };
        c.answers++;
        if (x.score !== null) c.scored++;
        out.set(x.qNo, c);
      }
  return out;
}
