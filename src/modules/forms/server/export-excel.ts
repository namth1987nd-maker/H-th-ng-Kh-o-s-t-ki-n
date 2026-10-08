// Xuất Excel "Thống kê số lượng câu trả lời theo từng đáp án" của một phiếu.
// Định dạng văn phòng: Times New Roman, kẻ khung, tiêu đề cột nền xám, A4 vừa trang, có số trang.
import ExcelJS from "exceljs";
import { KIND_LABEL } from "../domain/questions";
import type { QuestionStat } from "./queries";

export interface StatsExportInput {
  formCode: string;
  formName: string;
  fieldLabel: string;
  /** "Tất cả các đợt (3 đợt)" hoặc "Học viên · Đợt 2 · 2024-2025". */
  scopeLabel: string;
  nResponses: number;
  stats: QuestionStat[];
}

const FONT = "Times New Roman";
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" },
};
const FILL_HEADER: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
const FILL_QUESTION: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEBF7" } };
const PCT = "0.00%";

const font = (o: Partial<ExcelJS.Font> = {}): Partial<ExcelJS.Font> => ({ name: FONT, size: 12, ...o });
const ratio = (n: number, total: number) => (total > 0 ? n / total : 0);

/** Khối tiêu đề báo cáo (trộn ô qua `lastCol` cột). Trả về số dòng tiếp theo. */
function writeTitle(ws: ExcelJS.Worksheet, input: StatsExportInput, lastCol: number): number {
  const exportedAt = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const lines: [string, Partial<ExcelJS.Font>][] = [
    ["BÁO CÁO THỐNG KÊ KẾT QUẢ KHẢO SÁT", font({ bold: true, size: 14 })],
    [input.formName, font({ bold: true })],
    [`Mã phiếu: ${input.formCode}   ·   Lĩnh vực: ${input.fieldLabel}`, font()],
    [`Phạm vi: ${input.scopeLabel}   ·   Tổng số phiếu trả lời: ${input.nResponses.toLocaleString("vi-VN")}`, font()],
    [`Ngày xuất: ${exportedAt}`, font({ italic: true, size: 11 })],
  ];
  lines.forEach(([text, f], i) => {
    const r = i + 1;
    ws.mergeCells(r, 1, r, lastCol);
    const c = ws.getCell(r, 1);
    c.value = text;
    c.font = f;
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  ws.getRow(1).height = 22;
  return lines.length + 2; // chừa 1 dòng trống
}

function styleHeaderCell(c: ExcelJS.Cell) {
  c.font = font({ bold: true });
  c.fill = FILL_HEADER;
  c.border = BORDER;
  c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
}

function pageSetup(ws: ExcelJS.Worksheet, orientation: "portrait" | "landscape", headerRows: string) {
  ws.pageSetup = {
    paperSize: 9, // A4
    orientation,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    printTitlesRow: headerRows,
    horizontalCentered: true,
  };
  ws.headerFooter = { oddFooter: "&C&\"Times New Roman\"&10Trang &P / &N" };
}

/** Sheet 1: mỗi câu hỏi một khối — dòng câu hỏi + các dòng đáp án (số lượng, tỷ lệ). */
function detailSheet(wb: ExcelJS.Workbook, input: StatsExportInput) {
  const ws = wb.addWorksheet("Chi tiết theo đáp án", { properties: { defaultRowHeight: 18 } });
  ws.columns = [{ width: 7 }, { width: 72 }, { width: 13 }, { width: 13 }, { width: 24 }];

  const headerRow = writeTitle(ws, input, 5);
  ["STT", "Nội dung câu hỏi / đáp án", "Số lượng", "Tỷ lệ (%)", "Ghi chú"].forEach((h, i) => {
    styleHeaderCell(ws.getCell(headerRow, i + 1));
    ws.getCell(headerRow, i + 1).value = h;
  });
  ws.getRow(headerRow).height = 24;

  let r = headerRow + 1;
  const put = (values: (string | number | null)[], o: { bold?: boolean; italic?: boolean; fill?: ExcelJS.Fill; indent?: number } = {}) => {
    values.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v;
      c.font = font({ bold: o.bold, italic: o.italic });
      c.border = BORDER;
      if (o.fill) c.fill = o.fill;
      c.alignment =
        i === 1
          ? { vertical: "middle", wrapText: true, indent: o.indent ?? 0 }
          : { vertical: "middle", horizontal: i === 4 ? "left" : "center", wrapText: true };
    });
    ws.getCell(r, 4).numFmt = PCT;
    ws.getCell(r, 3).numFmt = "#,##0";
    r++;
  };

  for (const q of input.stats) {
    const note =
      q.kind === "SCALE" && q.nScored > 0
        ? `Hài lòng: ${(ratio(q.nSatisfied, q.nScored) * 100).toFixed(2).replace(".", ",")}%`
        : KIND_LABEL[q.kind];
    put([q.qNo, q.text, q.n, q.options.length > 0 ? 1 : null, note], { bold: true, fill: FILL_QUESTION });

    for (const o of q.options) put([null, `${o.key}. ${o.text}`, o.n, ratio(o.n, q.n), null], { indent: 2 });
    if (q.nOther > 0) put([null, "Câu trả lời không khớp đáp án", q.nOther, ratio(q.nOther, q.n), null], { italic: true, indent: 2 });
  }

  // ghi chú cuối bảng
  r++;
  ws.mergeCells(r, 1, r, 5);
  const note = ws.getCell(r, 1);
  note.value =
    "Ghi chú: Tỷ lệ (%) = Số lượng / Tổng số câu trả lời của câu hỏi. " +
    "Hài lòng = (đáp án a + đáp án b) / số câu trả lời có điểm (chỉ áp dụng câu thang đánh giá). " +
    "Câu bỏ trống không được tính.";
  note.font = font({ italic: true, size: 11 });
  note.alignment = { wrapText: true, vertical: "top" };
  ws.getRow(r).height = 36;

  ws.views = [{ state: "frozen", ySplit: headerRow }];
  pageSetup(ws, "portrait", `${headerRow}:${headerRow}`);
}

/** Sheet 2: bảng tổng hợp — mỗi câu một dòng, số lượng + % của từng đáp án a, b, c… */
function summarySheet(wb: ExcelJS.Workbook, input: StatsExportInput) {
  const ws = wb.addWorksheet("Bảng tổng hợp");
  const nOpt = Math.max(4, ...input.stats.map((q) => q.options.length));
  const keys = "abcdefghij".slice(0, nOpt).split("");
  const hasOther = input.stats.some((q) => q.nOther > 0);

  // cột: Câu | Nội dung | Loại | Tổng | (SL, %) × nOpt | [Khác SL, %] | % hài lòng
  const optStart = 5;
  const otherCol = optStart + nOpt * 2;
  const satCol = otherCol + (hasOther ? 2 : 0);
  ws.columns = [
    { width: 6 }, { width: 52 }, { width: 13 }, { width: 10 },
    ...Array.from({ length: nOpt * 2 + (hasOther ? 2 : 0) }, (_, i) => ({ width: i % 2 === 0 ? 8 : 9 })),
    { width: 12 },
  ];

  const h1 = writeTitle(ws, input, satCol);
  const h2 = h1 + 1;
  const head = (row: number, col: number, text: string, mergeTo?: [number, number]) => {
    if (mergeTo) ws.mergeCells(row, col, mergeTo[0], mergeTo[1]);
    const c = ws.getCell(row, col);
    c.value = text;
    styleHeaderCell(c);
  };
  head(h1, 1, "Câu", [h2, 1]);
  head(h1, 2, "Nội dung câu hỏi", [h2, 2]);
  head(h1, 3, "Loại câu", [h2, 3]);
  head(h1, 4, "Tổng số trả lời", [h2, 4]);
  keys.forEach((k, i) => {
    const c = optStart + i * 2;
    head(h1, c, `Đáp án ${k}`, [h1, c + 1]);
    head(h2, c, "SL");
    head(h2, c + 1, "%");
  });
  if (hasOther) {
    head(h1, otherCol, "Không khớp", [h1, otherCol + 1]);
    head(h2, otherCol, "SL");
    head(h2, otherCol + 1, "%");
  }
  head(h1, satCol, "% hài lòng", [h2, satCol]);
  // ô đã trộn vẫn cần khung ở mọi ô con
  for (let c = 1; c <= satCol; c++) for (const row of [h1, h2]) ws.getCell(row, c).border = BORDER;
  ws.getRow(h1).height = 22;
  ws.getRow(h2).height = 20;

  let r = h2 + 1;
  for (const q of input.stats) {
    const row: (string | number | null)[] = [q.qNo, q.text, KIND_LABEL[q.kind], q.n];
    keys.forEach((k) => {
      const o = q.options.find((x) => x.key === k);
      row.push(o ? o.n : null, o ? ratio(o.n, q.n) : null);
    });
    if (hasOther) row.push(q.nOther || null, q.nOther ? ratio(q.nOther, q.n) : null);
    row.push(q.kind === "SCALE" && q.nScored > 0 ? ratio(q.nSatisfied, q.nScored) : null);

    row.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = v ?? (i >= 4 ? "" : null);
      c.font = font({ bold: i === row.length - 1 });
      c.border = BORDER;
      c.alignment = i === 1 ? { vertical: "middle", wrapText: true } : { vertical: "middle", horizontal: "center" };
      const isPct = (i >= optStart - 1 && i < satCol - 1 && (i - (optStart - 1)) % 2 === 1) || i === satCol - 1;
      c.numFmt = isPct ? PCT : "#,##0";
    });
    r++;
  }

  r++;
  ws.mergeCells(r, 1, r, satCol);
  const note = ws.getCell(r, 1);
  note.value = "Nội dung từng đáp án xem sheet “Chi tiết theo đáp án”. SL = số lượng; % = tỷ lệ trên tổng số trả lời của câu.";
  note.font = font({ italic: true, size: 11 });
  note.alignment = { wrapText: true };

  ws.views = [{ state: "frozen", ySplit: h2, xSplit: 2 }];
  pageSetup(ws, "landscape", `${h1}:${h2}`);
}

export async function buildStatsWorkbook(input: StatsExportInput): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Hệ thống khảo sát lấy ý kiến phản hồi";
  wb.created = new Date();
  detailSheet(wb, input);
  summarySheet(wb, input);
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
