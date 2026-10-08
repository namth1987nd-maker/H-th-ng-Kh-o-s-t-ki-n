import { describe, expect, it } from "vitest";
import { parseQuestionLines } from "@/modules/forms";
import type { SubjectGroup } from "./google-form";
import {
  answerValueMapping,
  applyFormQuestions,
  draftQuestionsFromFile,
  questionAnswerCounts,
  unmatchedCounts,
} from "./mapping";

const form = parseQuestionLines(`1. Chuẩn đầu ra được phổ biến
a. Đầy đủ, kịp thời
b. Đầy đủ nhưng còn chậm
c. Chưa đầy đủ, chưa kịp thời
d. Không phổ biến
29. Ấn tượng tốt nhất (lựa chọn)
a. Môi trường học tập
b. Đội ngũ giảng viên
32. Ý kiến góp ý`).questions;

const row = (rowNo: number, answers: [number, string, number | null][]) => ({
  rowNo, submittedAt: null, extra: {},
  answers: answers.map(([qNo, valueText, score]) => ({ qNo, valueText, score })),
});

const groups: SubjectGroup[] = [
  {
    key: "học viên",
    name: "Học viên",
    rows: [
      row(2, [[1, "Đầy đủ, kịp thời", null], [29, "Đội ngũ giảng viên", null], [32, "Không", null], [99, "x", null]]),
      row(3, [[1, "Ý kiến lạ", null]]),
      row(4, [[99, "chỉ có câu ngoài phiếu", null]]),
    ],
  },
  { key: "khác", name: "Khác", rows: [row(5, [[99, "z", null]])] },
];

describe("applyFormQuestions", () => {
  const r = applyFormQuestions(groups, form);

  it("bỏ câu ngoài phiếu, bỏ phiếu rỗng, bỏ đối tượng rỗng", () => {
    expect(r).toHaveLength(1);
    expect(r[0]!.rows.map((x) => x.rowNo)).toEqual([2, 3]);
  });

  it("gán đáp án + điểm: thang → a = 5; lựa chọn → có đáp án, không điểm; tự luận → không đáp án", () => {
    expect(r[0]!.rows[0]!.answers).toEqual([
      { qNo: 1, valueText: "Đầy đủ, kịp thời", score: 5, optKey: "a" },
      { qNo: 29, valueText: "Đội ngũ giảng viên", score: null, optKey: "b" },
      { qNo: 32, valueText: "Không", score: null, optKey: null },
    ]);
  });

  it("không khớp đáp án → vẫn lưu nguyên văn, không đáp án, không điểm", () => {
    expect(r[0]!.rows[1]!.answers).toEqual([{ qNo: 1, valueText: "Ý kiến lạ", score: null, optKey: null }]);
  });
});

describe("answerValueMapping — đối chiếu từng giá trị trong file với đáp án", () => {
  const m = answerValueMapping(groups, form);
  it("giá trị chưa khớp đứng đầu, rồi theo đáp án", () => {
    expect(m.get(1)).toEqual([
      { value: "Ý kiến lạ", n: 1, optKey: null },
      { value: "Đầy đủ, kịp thời", n: 1, optKey: "a" },
    ]);
  });
  it("câu tự luận không đối chiếu", () => {
    expect(m.has(32)).toBe(false);
  });
});

describe("unmatchedCounts", () => {
  it("đếm câu trả lời không khớp đáp án theo câu", () => {
    const c = unmatchedCounts(groups, form);
    expect(c.get(1)).toBe(1);
    expect(c.get(29)).toBeUndefined();
    expect(c.get(32)).toBeUndefined();
  });
});

describe("draftQuestionsFromFile — tạo câu hỏi + đáp án từ file", () => {
  const many = (qNo: number, values: string[]) => values.map((v, i) => row(100 + i, [[qNo, v, null]]));
  const fileGroups: SubjectGroup[] = [{
    key: "hv", name: "HV", rows: [
      ...many(1, ["Hài lòng", "Rất hài lòng", "Hài lòng", "Không hài lòng", "rất hài lòng"]),
      ...many(2, ["Đầy đủ, kịp thời", "Đầy đủ, kịp thời", "Không phổ biến", "Đầy đủ, kịp thời"]),
      ...many(32, ["Không", "Tốt", "Cần thêm sân tập", "Phòng ở chật", "Wifi yếu", "Ổn"]),
    ],
  }];
  const draft = draftQuestionsFromFile({
    questions: [{ col: 3, qNo: 1, text: "Hài lòng chung" }, { col: 4, qNo: 2, text: "Phổ biến chuẩn đầu ra" }, { col: 5, qNo: 32, text: "Góp ý" }],
    groups: fileGroups,
  });

  it("mức nhận ra được sắp từ tốt đến kém; gộp giá trị khác hoa thường", () => {
    expect(draft[0]!.options.map((o) => o.text)).toEqual(["Rất hài lòng", "Hài lòng", "Không hài lòng"]);
    expect(draft[0]!.kind).toBe("SCALE");
  });
  it("mức không nhận ra → theo số lần chọn giảm dần", () => {
    expect(draft[1]!.options.map((o) => [o.key, o.text])).toEqual([["a", "Đầy đủ, kịp thời"], ["b", "Không phổ biến"]]);
  });
  it("nhiều giá trị khác nhau → tự luận", () => {
    expect(draft[2]).toEqual({ qNo: 32, text: "Góp ý", kind: "TEXT", options: [] });
  });
});

describe("questionAnswerCounts", () => {
  it("đếm số trả lời và số có điểm theo câu", () => {
    const c = questionAnswerCounts({ groups: [{ key: "k", name: "K", rows: [row(2, [[1, "5", 5], [9, "x", null]]), row(3, [[9, "y", null]])] }] });
    expect(c.get(1)).toEqual({ answers: 1, scored: 1 });
    expect(c.get(9)).toEqual({ answers: 2, scored: 0 });
  });
});
