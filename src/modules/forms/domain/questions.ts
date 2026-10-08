// Câu hỏi + đáp án của phiếu: đọc từ nội dung dán vào, và ghép câu trả lời trong file Excel với đáp án.
import { normalizeName, toNFC } from "@/core/lib/text";

/** SCALE = thang đánh giá (tính % hài lòng) · CHOICE = lựa chọn (chỉ đếm) · TEXT = tự luận. */
export type QuestionKind = "SCALE" | "CHOICE" | "TEXT";
export const QUESTION_KINDS: readonly QuestionKind[] = ["SCALE", "CHOICE", "TEXT"];
export const KIND_LABEL: Record<QuestionKind, string> = {
  SCALE: "Thang đánh giá",
  CHOICE: "Lựa chọn",
  TEXT: "Tự luận",
};

export interface FormOption {
  /** a, b, c… */
  key: string;
  text: string;
  /** Điểm 1–5 (5 = tốt nhất) với câu thang đánh giá; null với câu lựa chọn / tự luận. Hài lòng = điểm ≥ 4. */
  score: number | null;
}

export interface FormQuestion {
  qNo: number;
  text: string;
  kind: QuestionKind;
  options: FormOption[];
}

/** So sánh không phân biệt hoa thường, dấu, dấu câu. */
export const textKey = (s: string): string => normalizeName(s).replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Điểm mặc định theo vị trí đáp án (a là tốt nhất). Đáp án a, b luôn là "hài lòng" (điểm ≥ 4).
 *   5 đáp án: 5 4 3 2 1 · 4 đáp án: 5 4 2 1 (không có mức trung lập) · 3: 5 3 1 · 2: 5 1
 */
export function defaultScores(n: number): number[] {
  const table: Record<number, number[]> = { 1: [5], 2: [5, 1], 3: [5, 3, 1], 4: [5, 4, 2, 1], 5: [5, 4, 3, 2, 1] };
  if (table[n]) return table[n]!;
  return Array.from({ length: n }, (_, i) => (i === 0 ? 5 : i === 1 ? 4 : i === n - 1 ? 1 : i <= (n - 1) / 2 ? 3 : 2));
}

/** Đổi loại câu và tính lại điểm đáp án tương ứng. */
export function withKind(q: FormQuestion, kind: QuestionKind): FormQuestion {
  const scores = kind === "SCALE" ? defaultScores(q.options.length) : [];
  return { ...q, kind, options: q.options.map((o, i) => ({ ...o, score: kind === "SCALE" ? scores[i] ?? null : null })) };
}

const Q_LINE = /^\s*(\d{1,3})\s*[.):]\s*([\s\S]+)$/;
const OPT_LINE = /^\s*([a-zA-Z])\s*[.)]\s*([\s\S]+)$/;
const TRAILING_PAREN = /\s*\(([^)]*)\)\s*$/;
const MARKERS: Record<string, QuestionKind> = {
  "tu luan": "TEXT",
  "lua chon": "CHOICE",
  "chon": "CHOICE",
  "thang diem": "SCALE",
  "thang danh gia": "SCALE",
};

interface Draft {
  qNo: number;
  text: string;
  marker: QuestionKind | null;
  line: number;
  options: { key: string; text: string }[];
}

/**
 * Đọc nội dung dán vào:
 *   1. Câu hỏi…            ← dòng bắt đầu bằng số
 *   a. Đáp án…             ← dòng bắt đầu bằng chữ cái
 *   (dòng không có số / chữ cái → nối tiếp câu hỏi hoặc đáp án ngay trên)
 * Câu có đáp án → thang đánh giá; không có đáp án → tự luận.
 * Ghi "(lựa chọn)" / "(tự luận)" cuối câu hỏi để chỉ định loại khác.
 */
export function parseQuestionLines(input: string): { questions: FormQuestion[]; errors: string[] } {
  const drafts: Draft[] = [];
  const errors: string[] = [];
  let cur: Draft | null = null;

  input.split(/\r?\n/).forEach((raw, i) => {
    const line = toNFC(raw);
    if (!line) return;
    const lineNo = i + 1;

    const q = Q_LINE.exec(line);
    if (q) {
      const qNo = Number(q[1]);
      let text = toNFC(q[2]!);
      let marker: QuestionKind | null = null;
      const paren = TRAILING_PAREN.exec(text);
      const mk = paren ? MARKERS[textKey(paren[1]!)] : undefined;
      if (paren && mk) {
        marker = mk;
        text = text.slice(0, paren.index).trim();
      }
      if (drafts.some((d) => d.qNo === qNo)) {
        errors.push(`Dòng ${lineNo}: trùng số câu ${qNo}.`);
        cur = null;
        return;
      }
      cur = { qNo, text, marker, line: lineNo, options: [] };
      drafts.push(cur);
      return;
    }

    const o = OPT_LINE.exec(line);
    if (o && cur) {
      // Không kiểm tra trùng đáp án. Lỡ ghi hai dòng cùng chữ cái (vd. hai dòng "a.") thì
      // đáp án sau nhận chữ cái kế tiếp còn trống — không mất đáp án nào.
      const used = new Set(cur.options.map((x) => x.key));
      let key = o[1]!.toLowerCase();
      if (used.has(key)) key = "abcdefghijklmnopqrstuvwxyz".split("").find((c) => !used.has(c)) ?? key;
      cur.options.push({ key, text: toNFC(o[2]!) });
      return;
    }

    if (!cur) {
      errors.push(`Dòng ${lineNo}: phải bắt đầu bằng số câu, vd. "1. …".`);
      return;
    }
    // dòng nối tiếp (câu hỏi / đáp án dài bị xuống dòng)
    const last = cur.options[cur.options.length - 1];
    if (last) last.text = `${last.text} ${line}`;
    else cur.text = `${cur.text} ${line}`;
  });

  const questions = drafts.flatMap((d): FormQuestion[] => {
    if (!d.text) {
      errors.push(`Dòng ${d.line}: câu ${d.qNo} thiếu nội dung.`);
      return [];
    }
    const kind: QuestionKind = d.marker ?? (d.options.length > 0 ? "SCALE" : "TEXT");
    return [withKind({ qNo: d.qNo, text: d.text, kind, options: d.options.map((o) => ({ ...o, score: null })) }, kind)];
  });

  questions.sort((a, b) => a.qNo - b.qNo);
  return { questions, errors: [...errors, ...duplicateErrors(questions)] };
}

/**
 * CHỐNG TRÙNG CÂU HỎI: hai câu khác số nhưng cùng nội dung (không phân biệt hoa thường, dấu câu).
 * Chỉ kiểm tra câu hỏi — KHÔNG kiểm tra đáp án (các câu được dùng chung bộ đáp án, vd. câu 16–19).
 * (Trùng SỐ câu được báo ngay khi đọc nội dung dán vào.)
 */
export function duplicateErrors(questions: FormQuestion[]): string[] {
  const errors: string[] = [];
  const seen = new Map<string, number>();
  for (const q of questions) {
    const k = textKey(q.text);
    const prev = seen.get(k);
    if (prev !== undefined) errors.push(`Câu ${q.qNo} trùng nội dung với câu ${prev}.`);
    else seen.set(k, q.qNo);
  }
  return errors;
}

/** REPLACE = thay toàn bộ câu hỏi · UPSERT = ghi đè các câu cùng số, giữ nguyên các câu khác. */
export type MergeMode = "REPLACE" | "UPSERT";

export function mergeQuestions(existing: FormQuestion[], incoming: FormQuestion[], mode: MergeMode): FormQuestion[] {
  if (mode === "REPLACE") return incoming;
  const byNo = new Map(existing.map((q) => [q.qNo, q]));
  for (const q of incoming) byNo.set(q.qNo, q);
  return [...byNo.values()].sort((a, b) => a.qNo - b.qNo);
}

/** Ngược lại của parseQuestionLines — để điền vào ô soạn thảo. */
export function formatQuestionLines(questions: FormQuestion[]): string {
  return questions
    .map((q) => {
      const auto: QuestionKind = q.options.length > 0 ? "SCALE" : "TEXT";
      const marker = q.kind === auto ? "" : q.kind === "CHOICE" ? " (lựa chọn)" : q.kind === "TEXT" ? " (tự luận)" : " (thang điểm)";
      return [`${q.qNo}. ${q.text}${marker}`, ...q.options.map((o) => `${o.key}. ${o.text}`)].join("\n");
    })
    .join("\n");
}

/**
 * Ghép một câu trả lời trong file Excel với đáp án của câu hỏi.
 * Khớp theo nội dung đáp án (bỏ qua hoa thường, dấu, dấu câu) hoặc theo chữ cái đầu ("a", "a. …").
 * Câu không có đáp án: thang đánh giá dùng điểm tự quy đổi (fallbackScore), loại khác không có điểm.
 */
export function resolveAnswer(q: FormQuestion, valueText: string, fallbackScore: number | null): { optKey: string | null; score: number | null } {
  if (q.kind === "TEXT") return { optKey: null, score: null };
  if (q.options.length === 0) return { optKey: null, score: q.kind === "SCALE" ? fallbackScore : null };

  const k = textKey(valueText);
  let opt = q.options.find((o) => textKey(o.text) === k);
  if (!opt) {
    const m = /^([a-z])(?:\s|$)/.exec(k);
    if (m) opt = q.options.find((o) => o.key === m[1]);
  }
  return opt ? { optKey: opt.key, score: opt.score } : { optKey: null, score: null };
}

export interface QuestionMatch {
  qNo: number;
  formText: string;
  fileText: string;
  /** Cùng số câu nhưng nội dung khác — vẫn ghép theo số, nhưng cảnh báo để người dùng kiểm tra. */
  textDiffers: boolean;
}

/** Ghép câu hỏi của phiếu với cột câu hỏi trong file theo SỐ THỨ TỰ câu. */
export function matchQuestions(formQs: { qNo: number; text: string }[], fileQs: { qNo: number; text: string }[]) {
  const fileBy = new Map(fileQs.map((q) => [q.qNo, q]));
  const formNos = new Set(formQs.map((q) => q.qNo));

  const matched: QuestionMatch[] = formQs
    .filter((q) => fileBy.has(q.qNo))
    .map((q) => {
      const f = fileBy.get(q.qNo)!;
      return { qNo: q.qNo, formText: q.text, fileText: f.text, textDiffers: textKey(q.text) !== textKey(f.text) };
    });

  return {
    matched,
    /** Câu có trong phiếu nhưng file không có cột. */
    missingInFile: formQs.filter((q) => !fileBy.has(q.qNo)),
    /** Cột câu hỏi trong file nhưng phiếu không có câu này — bỏ qua khi lưu. */
    extraInFile: fileQs.filter((q) => !formNos.has(q.qNo)),
  };
}
