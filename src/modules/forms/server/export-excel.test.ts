import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildStatsWorkbook } from "./export-excel";
import type { QuestionStat } from "./queries";

const stats: QuestionStat[] = [
  {
    qNo: 1, text: "Chuẩn đầu ra được phổ biến", kind: "SCALE", n: 100, nScored: 98, nSatisfied: 85, nOther: 2,
    options: [
      { key: "a", text: "Đầy đủ, kịp thời", score: 5, n: 60 },
      { key: "b", text: "Đầy đủ nhưng còn chậm", score: 4, n: 25 },
      { key: "c", text: "Chưa đầy đủ, chưa kịp thời", score: 2, n: 10 },
      { key: "d", text: "Không phổ biến", score: 1, n: 3 },
    ],
  },
  {
    qNo: 31, text: "Hài lòng tổng thể", kind: "SCALE", n: 50, nScored: 50, nSatisfied: 40, nOther: 0,
    options: ["Rất hài lòng", "Hài lòng", "Phân vân", "Không hài lòng", "Rất không hài lòng"].map((t, i) => ({
      key: "abcde"[i]!, text: t, score: 5 - i, n: [20, 20, 5, 3, 2][i]!,
    })),
  },
  { qNo: 32, text: "Ý kiến góp ý", kind: "TEXT", n: 30, nScored: 0, nSatisfied: 0, nOther: 0, options: [] },
];

async function load() {
  const buf = await buildStatsWorkbook({
    formCode: "PH0001", formName: "Phiếu khảo sát học viên", fieldLabel: "1. Giảng dạy",
    scopeLabel: "Tất cả các đợt (1 đợt)", nResponses: 100, stats,
  });
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb;
}

/** Tìm dòng đầu tiên có ô cột `col` bằng `value`. */
function findRow(ws: ExcelJS.Worksheet, col: number, value: unknown): ExcelJS.Row {
  let found: ExcelJS.Row | undefined;
  ws.eachRow((row) => {
    if (!found && row.getCell(col).value === value) found = row;
  });
  if (!found) throw new Error(`Không thấy ${String(value)}`);
  return found;
}

describe("xuất Excel thống kê theo đáp án", () => {
  it("có 2 sheet: chi tiết + tổng hợp", async () => {
    const wb = await load();
    expect(wb.worksheets.map((w) => w.name)).toEqual(["Chi tiết theo đáp án", "Bảng tổng hợp"]);
  });

  it("sheet chi tiết: dòng câu hỏi (tổng, % hài lòng) và dòng đáp án (số lượng, tỷ lệ)", async () => {
    const ws = (await load()).getWorksheet("Chi tiết theo đáp án")!;
    expect(ws.getCell("A1").value).toBe("BÁO CÁO THỐNG KÊ KẾT QUẢ KHẢO SÁT");

    const q1 = findRow(ws, 2, "Chuẩn đầu ra được phổ biến");
    expect(q1.getCell(1).value).toBe(1);
    expect(q1.getCell(3).value).toBe(100);
    expect(q1.getCell(5).value).toBe("Hài lòng: 86,73%"); // 85 / 98

    const a = findRow(ws, 2, "a. Đầy đủ, kịp thời");
    expect(a.getCell(3).value).toBe(60);
    expect(a.getCell(4).value).toBeCloseTo(0.6);
    expect(a.getCell(4).numFmt).toBe("0.00%");

    expect(findRow(ws, 2, "Câu trả lời không khớp đáp án").getCell(3).value).toBe(2);
    expect(findRow(ws, 2, "e. Rất không hài lòng").getCell(3).value).toBe(2);
    expect(findRow(ws, 2, "Ý kiến góp ý").getCell(5).value).toBe("Tự luận");
  });

  it("sheet tổng hợp: đủ cột đáp án a–e, % hài lòng", async () => {
    const ws = (await load()).getWorksheet("Bảng tổng hợp")!;
    const header = findRow(ws, 1, "Câu");
    const texts = header.values as unknown[];
    expect(texts).toContain("Đáp án e");
    expect(texts).toContain("% hài lòng");

    const q31 = findRow(ws, 1, 31);
    expect(q31.getCell(4).value).toBe(50); // tổng
    expect(q31.getCell(5).value).toBe(20); // a SL
    expect(q31.getCell(6).value).toBeCloseTo(0.4); // a %
  });
});
