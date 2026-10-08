// Phân tích bảng kết quả xuất từ Google Form. Thuần TypeScript (không DB), có test cạnh file.
//
// Quy ước file:
//  - Dòng 1 là tiêu đề. So khớp tiêu đề sau khi đưa về chữ thường, bỏ dấu, bỏ ký tự đặc biệt.
//  - Cột "Đối tượng" (bắt buộc): mỗi giá trị là một đối tượng; dữ liệu nhóm theo đối tượng.
//  - Cột câu hỏi: tiêu đề có đầu số "1. …", "2) …" (hoặc dạng lưới "Tiêu đề [1. …]").
//  - Cột "Dấu thời gian" (nếu có) → thời điểm trả lời.
//  - Cột thông tin cá nhân (email, họ tên, SĐT, mã người học) → BỎ QUA, không lưu.
//  - Cột còn lại → lưu kèm phiếu (extra).
import { normalizeName, toNFC } from "@/core/lib/text";

export type Cell = string | number | boolean | Date | null;

export interface SheetTable {
  sheet: string;
  headers: string[];
  rows: { rowNo: number; cells: Cell[] }[];
}

export interface QuestionCol {
  col: number;
  qNo: number;
  text: string;
}

export interface ParsedAnswer {
  qNo: number;
  valueText: string;
  /** 1–5 (5 = Rất hài lòng); null = câu tự luận hoặc không quy đổi được. */
  score: number | null;
  /** Đáp án của phiếu (a, b, c…) mà câu trả lời khớp; gán khi ghép với phiếu (mapping.ts). */
  optKey?: string | null;
}

export interface ParsedResponse {
  rowNo: number;
  submittedAt: Date | null;
  answers: ParsedAnswer[];
  extra: Record<string, string>;
}

export interface SubjectGroup {
  /** Khóa so khớp đối tượng (subjectKey). */
  key: string;
  /** Tên hiển thị, lấy theo lần xuất hiện đầu trong file. */
  name: string;
  rows: ParsedResponse[];
}

export interface Analysis {
  sheet: string;
  subjectHeader: string | null;
  timestampHeader: string | null;
  questions: QuestionCol[];
  extraHeaders: string[];
  personalHeaders: string[];
  groups: SubjectGroup[];
  /** Lỗi cấu trúc: còn lỗi thì không cho lưu. */
  fatal: string[];
  /** Dòng bị bỏ qua và lý do. */
  rowIssues: { rowNo: number; message: string }[];
  totals: { rows: number; responses: number; answers: number; scored: number };
}

/** Tiêu đề → khóa so sánh: chữ thường, bỏ dấu, chỉ giữ chữ/số. "ĐỐI TƯỢNG:" → "doi tuong". */
export const headerKey = (h: string): string =>
  normalizeName(h).replace(/[^a-z0-9]+/g, " ").trim();

export const isSubjectHeader = (h: string): boolean => headerKey(h) === "doi tuong";

const TIMESTAMP_KEYS = new Set(["dau thoi gian", "timestamp", "thoi gian", "thoi gian tra loi"]);
export const isTimestampHeader = (h: string): boolean => TIMESTAMP_KEYS.has(headerKey(h));

const PERSONAL_KEYS = new Set([
  "email", "dia chi email", "email address", "ho va ten", "ho ten", "ten",
  "so dien thoai", "dien thoai", "ma hoc vien", "ma sinh vien", "mssv", "ma nguoi hoc",
]);
export const isPersonalHeader = (h: string): boolean => {
  const k = headerKey(h);
  return PERSONAL_KEYS.has(k) || k.includes("email");
};

/** "1. Chuẩn đầu ra …" → { qNo: 1, text: "Chuẩn đầu ra …" }. Hỗ trợ "1)", "1 -", "1:" và dạng lưới "… [1. …]". */
export function parseQuestionHeader(h: string): { qNo: number; text: string } | null {
  const inner = /\[([^\]]+)\]\s*$/.exec(h)?.[1] ?? h;
  const m = /^\s*(\d{1,3})\s*[.):\-]\s*([\s\S]+)$/.exec(inner);
  if (!m) return null;
  const text = toNFC(m[2]!);
  return text ? { qNo: Number(m[1]), text } : null;
}

/** Khóa so khớp đối tượng: NFC, gộp khoảng trắng, chữ thường (giữ dấu để không gộp nhầm tên khác nhau). */
export const subjectKey = (v: string): string => toNFC(v).toLowerCase();

/** Nhãn thang đo (đã qua headerKey) → điểm chuẩn hóa, 5 = tốt nhất. So khớp nguyên cụm, không so khớp một phần. */
const SCORE_LABELS = new Map<string, number>([
  ["rat hai long", 5], ["hoan toan hai long", 5], ["hoan toan dong y", 5], ["rat dong y", 5], ["rat tot", 5],
  ["hai long", 4], ["dong y", 4], ["tot", 4],
  ["binh thuong", 3], ["trung binh", 3], ["phan van", 3], ["khong y kien", 3],
  ["chua hai long", 2], ["khong hai long lam", 2], ["it hai long", 2], ["khong dong y", 2], ["chua tot", 2],
  ["khong hai long", 1], ["rat khong hai long", 1], ["hoan toan khong hai long", 1],
  ["hoan toan khong dong y", 1], ["rat khong dong y", 1], ["kem", 1],
]);

/** Giá trị ô → điểm 1–5, hoặc null nếu là câu tự luận / không nhận ra. */
export function toScore(v: Cell): number | null {
  if (v === null || typeof v === "boolean" || v instanceof Date) return null;
  if (typeof v === "number") return Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  const k = headerKey(v);
  const lead = /^([1-5])(?:\s|$)/.exec(k); // "5", "5 rat hai long"
  if (lead) return Number(lead[1]);
  return SCORE_LABELS.get(k) ?? null;
}

const cellText = (v: Cell): string => {
  if (v === null) return "";
  if (v instanceof Date) return v.toISOString();
  return typeof v === "string" ? toNFC(v) : String(v);
};

/** "02/10/2026 10:15:30" (Google Form tiếng Việt) hoặc ô ngày của Excel → Date. */
export function parseTimestamp(v: Cell): Date | null {
  if (v instanceof Date) return v;
  if (typeof v !== "string") return null;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(v.trim());
  if (!m) return null;
  const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function analyzeSheet(t: SheetTable): Analysis {
  const fatal: string[] = [];
  const rowIssues: Analysis["rowIssues"] = [];

  const subjectCols = t.headers.flatMap((h, i) => (isSubjectHeader(h) ? [i] : []));
  if (subjectCols.length === 0) fatal.push('Không tìm thấy cột "Đối tượng" ở dòng 1.');
  if (subjectCols.length > 1) fatal.push(`Có ${subjectCols.length} cột "Đối tượng" — chỉ được có một.`);
  const subjectCol = subjectCols[0] ?? -1;

  const tsCol = t.headers.findIndex(isTimestampHeader);

  const questions: QuestionCol[] = [];
  const extraCols: number[] = [];
  const personalHeaders: string[] = [];
  t.headers.forEach((h, i) => {
    if (i === subjectCol || i === tsCol || !h.trim()) return;
    const q = parseQuestionHeader(h);
    if (q) questions.push({ col: i, ...q });
    else if (isPersonalHeader(h)) personalHeaders.push(h);
    else extraCols.push(i);
  });

  if (questions.length === 0) fatal.push('Không có cột câu hỏi nào (tiêu đề phải bắt đầu bằng số thứ tự, vd. "1. …").');
  const seen = new Map<number, number>();
  for (const q of questions) seen.set(q.qNo, (seen.get(q.qNo) ?? 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1).map(([no]) => no);
  if (dup.length) fatal.push(`Trùng số thứ tự câu hỏi: ${dup.join(", ")}.`);

  const groups = new Map<string, SubjectGroup>();
  let answers = 0;
  let scored = 0;

  if (fatal.length === 0) {
    for (const row of t.rows) {
      const subjectRaw = cellText(row.cells[subjectCol] ?? null);
      if (!subjectRaw) {
        rowIssues.push({ rowNo: row.rowNo, message: 'Trống cột "Đối tượng" — bỏ qua dòng.' });
        continue;
      }
      const parsed: ParsedAnswer[] = [];
      for (const q of questions) {
        const cell = row.cells[q.col] ?? null;
        const valueText = cellText(cell);
        if (!valueText) continue; // câu bỏ trống: không lưu, không vào mẫu số
        const score = toScore(cell);
        parsed.push({ qNo: q.qNo, valueText, score });
        if (score !== null) scored++;
      }
      if (parsed.length === 0) {
        rowIssues.push({ rowNo: row.rowNo, message: "Không trả lời câu hỏi nào — bỏ qua dòng." });
        continue;
      }
      answers += parsed.length;

      const extra: Record<string, string> = {};
      for (const c of extraCols) {
        const v = cellText(row.cells[c] ?? null);
        if (v) extra[t.headers[c]!] = v;
      }

      const key = subjectKey(subjectRaw);
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { key, name: toNFC(subjectRaw), rows: [] }));
      g.rows.push({
        rowNo: row.rowNo,
        submittedAt: tsCol >= 0 ? parseTimestamp(row.cells[tsCol] ?? null) : null,
        answers: parsed,
        extra,
      });
    }
  }

  const groupList = [...groups.values()];
  return {
    sheet: t.sheet,
    subjectHeader: subjectCol >= 0 ? t.headers[subjectCol]! : null,
    timestampHeader: tsCol >= 0 ? t.headers[tsCol]! : null,
    questions: questions.sort((a, b) => a.qNo - b.qNo),
    extraHeaders: extraCols.map((c) => t.headers[c]!),
    personalHeaders,
    groups: groupList,
    fatal,
    rowIssues,
    totals: {
      rows: t.rows.length,
      responses: groupList.reduce((n, g) => n + g.rows.length, 0),
      answers,
      scored,
    },
  };
}
