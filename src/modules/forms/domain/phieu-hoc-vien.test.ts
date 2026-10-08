// Kiểm tra trên đúng nội dung phiếu học viên thật (32 câu) mà người dùng dán vào hệ thống.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { duplicateErrors, mergeQuestions, parseQuestionLines } from "./questions";

const text = readFileSync(path.resolve(__dirname, "fixtures/phieu-hoc-vien.txt"), "utf8");
const { questions, errors } = parseQuestionLines(text);
const q = (n: number) => questions.find((x) => x.qNo === n)!;

describe("phiếu học viên — 32 câu", () => {
  it("đọc đủ 32 câu, không lỗi, không báo trùng nhầm", () => {
    expect(errors).toEqual([]);
    expect(questions.map((x) => x.qNo)).toEqual(Array.from({ length: 32 }, (_, i) => i + 1));
  });

  it("câu 1–30: mỗi câu lưu đủ 4 đáp án a–d", () => {
    for (let n = 1; n <= 30; n++) expect(q(n).options.map((o) => o.key)).toEqual(["a", "b", "c", "d"]);
  });

  it("câu 31: lưu đủ 5 đáp án a–e, đúng nội dung", () => {
    expect(q(31).options.map((o) => [o.key, o.text])).toEqual([
      ["a", "Rất hài lòng"],
      ["b", "Hài lòng"],
      ["c", "Phân vân"],
      ["d", "Không hài lòng"],
      ["e", "Rất không hài lòng"],
    ]);
  });

  it("câu 32: không có đáp án → vẫn lưu câu hỏi bình thường (tự luận)", () => {
    expect(q(32).kind).toBe("TEXT");
    expect(q(32).options).toEqual([]);
    expect(q(32).text).toMatch(/^Những ý kiến phản ánh, góp ý/);
  });

  it("tổng 125 đáp án (30 × 4 + 5)", () => {
    expect(questions.reduce((s, x) => s + x.options.length, 0)).toBe(125);
  });

  it("các câu dùng chung bộ đáp án (7–8, 16–19, 22–23) không bị báo trùng", () => {
    expect(q(16).options.map((o) => o.text)).toEqual(q(19).options.map((o) => o.text));
    expect(duplicateErrors(questions)).toEqual([]);
  });

  it("dán lại cả bộ để ghi đè lên chính nó → không sinh trùng", () => {
    const merged = mergeQuestions(questions, questions, "UPSERT");
    expect(merged).toHaveLength(32);
    expect(duplicateErrors(merged)).toEqual([]);
  });

  it("dán thêm một câu trùng nội dung với câu đã có (khác số) → chặn", () => {
    const extra = parseQuestionLines("33. Phòng học phục vụ tốt nhu cầu học tập, nghiên cứu, thực hành... cho học viên").questions;
    expect(duplicateErrors(mergeQuestions(questions, extra, "UPSERT"))).toEqual(["Câu 33 trùng nội dung với câu 16."]);
  });
});
