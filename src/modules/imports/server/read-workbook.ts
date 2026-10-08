import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { toNFC } from "@/core/lib/text";
import type { Cell, SheetTable } from "../domain/google-form";

/** Đưa giá trị ô ExcelJS (rich text, công thức, hyperlink…) về kiểu nguyên thủy. */
function flattenCell(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    const s = toNFC(v);
    return s === "" ? null : s;
  }
  if (typeof v === "number" || typeof v === "boolean" || v instanceof Date) return v;
  if (typeof v === "object") {
    if ("richText" in v) return toNFC(v.richText.map((r) => r.text).join("")) || null;
    if ("result" in v) return flattenCell(v.result as ExcelJS.CellValue);
    if ("text" in v) return toNFC(String(v.text)) || null;
  }
  return null;
}

/**
 * Đọc sheet đầu tiên có dữ liệu (file Google Form chỉ có một sheet "Câu trả lời biểu mẫu 1").
 * Giữ nguyên thứ tự cột theo chỉ số để xử lý được cả khi hai cột trùng tiêu đề.
 */
export async function readSheetTable(filePath: string): Promise<SheetTable> {
  const wb = new ExcelJS.Workbook();
  if (filePath.toLowerCase().endsWith(".csv")) await wb.csv.readFile(filePath);
  else await wb.xlsx.readFile(filePath);

  const ws = wb.worksheets.find((w) => w.actualRowCount > 0);
  if (!ws) return { sheet: "", headers: [], rows: [] };

  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  for (let c = 1; c <= headerRow.cellCount; c++) headers.push(String(flattenCell(headerRow.getCell(c).value) ?? ""));

  const rows: SheetTable["rows"] = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNo) => {
    if (rowNo === 1) return;
    const cells = headers.map((_, i) => flattenCell(row.getCell(i + 1).value));
    if (cells.some((c) => c !== null)) rows.push({ rowNo, cells });
  });

  return { sheet: ws.name, headers, rows };
}

export const sha256 = (buf: Buffer): Buffer => createHash("sha256").update(buf).digest();
