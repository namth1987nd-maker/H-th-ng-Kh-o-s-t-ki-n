import { describe, expect, it } from "vitest";
import {
  analyzeSheet,
  isPersonalHeader,
  isSubjectHeader,
  parseQuestionHeader,
  parseTimestamp,
  subjectKey,
  toScore,
  type SheetTable,
} from "./google-form";

describe("isSubjectHeader — so khớp tiêu đề dòng 1 không phân biệt hoa thường, dấu", () => {
  it.each(["Đối tượng", "đối tượng", "ĐỐI TƯỢNG", " Đối tượng: ", "Doi tuong", "Đối tượng *"])("%s → có", (h) =>
    expect(isSubjectHeader(h)).toBe(true));
  it.each(["Đối tượng khảo sát khác", "Tên đối tượng", "1. Đối tượng"])("%s → không", (h) =>
    expect(isSubjectHeader(h)).toBe(false));
});

describe("parseQuestionHeader — đầu số của Google Form", () => {
  it("1. …", () =>
    expect(parseQuestionHeader("1. Chuẩn đầu ra của khóa học đã được phổ biến đầy đủ, kịp thời tới học viên ")).toEqual({
      qNo: 1,
      text: "Chuẩn đầu ra của khóa học đã được phổ biến đầy đủ, kịp thời tới học viên",
    }));
  it("12) …", () => expect(parseQuestionHeader("12) Giảng viên đúng giờ")).toEqual({ qNo: 12, text: "Giảng viên đúng giờ" }));
  it("dạng lưới: Tiêu đề [3. …]", () =>
    expect(parseQuestionHeader("Đánh giá chung [3. Học liệu đầy đủ]")).toEqual({ qNo: 3, text: "Học liệu đầy đủ" }));
  it.each(["Dấu thời gian", "Đối tượng", "Ý kiến khác", "1."])("%s → không phải câu hỏi", (h) =>
    expect(parseQuestionHeader(h)).toBeNull());
});

describe("toScore", () => {
  it.each([
    [5, 5], ["5", 5], ["Rất hài lòng", 5], ["rất hài lòng", 5], ["Hài lòng", 4], ["Bình thường", 3],
    ["Trung bình", 3], ["Chưa hài lòng", 2], ["Không hài lòng", 1], ["5 - Rất hài lòng", 5], ["Hoàn toàn đồng ý", 5],
  ] as const)("%s → %s", (v, s) => expect(toScore(v)).toBe(s));
  it.each([0, 6, 3.5, "Giảng viên nhiệt tình", ""])("%s → null (tự luận / ngoài thang)", (v) => expect(toScore(v)).toBeNull());
});

describe("phụ trợ", () => {
  it("không lưu cột cá nhân", () => {
    expect(isPersonalHeader("Địa chỉ email")).toBe(true);
    expect(isPersonalHeader("Họ và tên")).toBe(true);
    expect(isPersonalHeader("Ý kiến khác")).toBe(false);
  });
  it("khóa đối tượng: chữ thường + gộp khoảng trắng, giữ dấu", () => {
    expect(subjectKey("  Học   Viên ")).toBe(subjectKey("học viên"));
    expect(subjectKey("Học viên")).not.toBe(subjectKey("Hoc vien"));
  });
  it("dấu thời gian Google Form", () => {
    const d = parseTimestamp("02/10/2026 10:15:30")!;
    expect([d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()]).toEqual([2026, 10, 2, 10]);
  });
});

describe("analyzeSheet", () => {
  const table: SheetTable = {
    sheet: "Câu trả lời biểu mẫu 1",
    headers: ["Dấu thời gian", "Địa chỉ email", "ĐỐI TƯỢNG", "1. Chuẩn đầu ra được phổ biến", "2. Nắm rõ mục tiêu", "Ý kiến khác"],
    rows: [
      { rowNo: 2, cells: ["02/10/2026 10:00:00", "a@x.vn", "Học viên", "Rất hài lòng", 4, "Tốt"] },
      { rowNo: 3, cells: ["02/10/2026 10:05:00", "b@x.vn", "học  viên", "Hài lòng", null, null] },
      { rowNo: 4, cells: ["02/10/2026 10:06:00", "c@x.vn", "Giảng viên", "Không hài lòng", "Ý kiến riêng", null] },
      { rowNo: 5, cells: ["02/10/2026 10:07:00", "d@x.vn", null, "Hài lòng", 5, null] },
      { rowNo: 6, cells: ["02/10/2026 10:08:00", "e@x.vn", "Giảng viên", null, null, "chỉ góp ý"] },
    ],
  };
  const a = analyzeSheet(table);

  it("nhận đúng cột", () => {
    expect(a.fatal).toEqual([]);
    expect(a.subjectHeader).toBe("ĐỐI TƯỢNG");
    expect(a.timestampHeader).toBe("Dấu thời gian");
    expect(a.questions.map((q) => q.qNo)).toEqual([1, 2]);
    expect(a.personalHeaders).toEqual(["Địa chỉ email"]);
    expect(a.extraHeaders).toEqual(["Ý kiến khác"]);
  });

  it("nhóm theo đối tượng, không phân biệt hoa thường / khoảng trắng", () => {
    expect(a.groups.map((g) => [g.name, g.rows.length])).toEqual([["Học viên", 2], ["Giảng viên", 1]]);
  });

  it("câu trống không lưu; câu tự luận lưu nhưng không có điểm", () => {
    const gv = a.groups[1]!.rows[0]!;
    expect(gv.answers).toEqual([
      { qNo: 1, valueText: "Không hài lòng", score: 1 },
      { qNo: 2, valueText: "Ý kiến riêng", score: null },
    ]);
    expect(a.groups[0]!.rows[1]!.answers).toHaveLength(1);
  });

  it("bỏ dòng trống đối tượng và dòng không trả lời câu nào", () => {
    expect(a.rowIssues.map((r) => r.rowNo)).toEqual([5, 6]);
    expect(a.totals).toEqual({ rows: 5, responses: 3, answers: 5, scored: 4 });
  });

  it("thiếu cột Đối tượng → lỗi cấu trúc", () => {
    expect(analyzeSheet({ ...table, headers: ["Dấu thời gian", "Email", "Lớp", "1. A", "2. B", "X"] }).fatal[0]).toMatch(/Đối tượng/);
  });

  it("trùng số câu hỏi → lỗi cấu trúc", () => {
    const t = { ...table, headers: ["Dấu thời gian", "Email", "Đối tượng", "1. A", "1. B", "X"] };
    expect(analyzeSheet(t).fatal.join()).toMatch(/Trùng số thứ tự câu hỏi: 1/);
  });
});
