import { describe, expect, it } from "vitest";
import {
  defaultScores,
  duplicateErrors,
  formatQuestionLines,
  matchQuestions,
  mergeQuestions,
  parseQuestionLines,
  resolveAnswer,
  withKind,
} from "./questions";

// Trích từ phiếu mẫu thật (câu 1, 13 dài, 29 lựa chọn, 31 năm mức, 32 tự luận)
const SAMPLE = `1. Chuẩn đầu ra của khóa học đã được phổ biến đầy đủ, kịp thời tới học viên
a. Đầy đủ, kịp thời
b. Đầy đủ nhưng còn chậm
c. Chưa đầy đủ, chưa kịp thời
d. Không phổ biến
13. Cán bộ quản lý (chủ nhiệm lớp - Phòng Quản lý học viên/Phòng Quản lý đào tạo và bồi dưỡng nâng cao) thực hiện đúng và đầy đủ các quy định về quản lý, giáo dục học viên
a. Đúng và đầy đủ
b. Đúng và đầy đủ nhưng chưa thường xuyên
c. Đúng và đầy đủ nhưng còn nhiều hạn chế
d. Không đúng và không đầy đủ
29. Ấn tượng tốt nhất về khóa học mà đồng chí ghi nhận được: (lựa chọn)
a. Về môi trường học tập, nghiên cứu
b. Về đội ngũ giảng viên, cán bộ phục vụ
c. Về cơ sở vật chất và chất lượng phục vụ
d. Chưa có ấn tượng gì
31. Đồng chí hài lòng như thế nào về tổng thể quá trình học tập và trải nghiệm đối với sự phát triển về kiến thức, năng lực và phẩm chất của bản thân?
a. Rất hài lòng
b. Hài lòng
c. Phân vân
d. Không hài lòng
e. Rất không hài lòng
32. Những ý kiến phản ánh, góp ý cho Nhà trường ở các lĩnh vực mà học viên quan tâm (Nếu không có ý kiến gì, vui lòng ghi chữ “Không”)
`;

describe("parseQuestionLines — phiếu mẫu", () => {
  const { questions, errors } = parseQuestionLines(SAMPLE);
  const byNo = (n: number) => questions.find((q) => q.qNo === n)!;

  it("đọc đủ câu, không lỗi", () => {
    expect(errors).toEqual([]);
    expect(questions.map((q) => q.qNo)).toEqual([1, 13, 29, 31, 32]);
  });

  it("câu có đáp án → thang đánh giá, 4 đáp án a–d, điểm 5 4 2 1", () => {
    expect(byNo(1).kind).toBe("SCALE");
    expect(byNo(1).options.map((o) => [o.key, o.score])).toEqual([["a", 5], ["b", 4], ["c", 2], ["d", 1]]);
    expect(byNo(1).options[0]!.text).toBe("Đầy đủ, kịp thời");
  });

  it("câu dài có ngoặc và dấu gạch giữa câu vẫn giữ nguyên", () => {
    expect(byNo(13).text).toMatch(/^Cán bộ quản lý \(chủ nhiệm lớp - Phòng/);
    expect(byNo(13).options).toHaveLength(4);
  });

  it("(lựa chọn) → câu lựa chọn, đáp án không có điểm", () => {
    expect(byNo(29).kind).toBe("CHOICE");
    expect(byNo(29).text).toBe("Ấn tượng tốt nhất về khóa học mà đồng chí ghi nhận được:");
    expect(byNo(29).options.every((o) => o.score === null)).toBe(true);
  });

  it("5 đáp án → điểm 5 4 3 2 1", () => {
    expect(byNo(31).options.map((o) => o.score)).toEqual([5, 4, 3, 2, 1]);
  });

  it("không có đáp án → tự luận; ngoặc không phải đánh dấu thì giữ trong câu hỏi", () => {
    expect(byNo(32).kind).toBe("TEXT");
    expect(byNo(32).text).toMatch(/\(Nếu không có ý kiến gì, vui lòng ghi chữ “Không”\)$/);
  });

  it("format ↔ parse giữ nguyên", () => {
    expect(parseQuestionLines(formatQuestionLines(questions)).questions).toEqual(questions);
  });
});

describe("parseQuestionLines — trường hợp lỗi / đặc biệt", () => {
  it("dòng xuống hàng giữa chừng được nối vào câu hoặc đáp án trên", () => {
    const r = parseQuestionLines("1. Câu hỏi dài\nphần tiếp theo\na. Đáp án\nphần tiếp đáp án");
    expect(r.questions[0]!.text).toBe("Câu hỏi dài phần tiếp theo");
    expect(r.questions[0]!.options[0]!.text).toBe("Đáp án phần tiếp đáp án");
  });
  it("dòng đầu không có số câu → lỗi", () => {
    expect(parseQuestionLines("Câu hỏi không số\n1. A").errors[0]).toMatch(/Dòng 1/);
  });
  it("trùng số câu → lỗi", () => {
    expect(parseQuestionLines("1. A\n1. B").errors[0]).toMatch(/trùng số câu 1/);
  });
  it("lỡ ghi hai dòng cùng chữ cái đáp án → không lỗi, đáp án sau nhận chữ cái kế tiếp", () => {
    const r = parseQuestionLines("1. A\na. x\na. y\nc. z");
    expect(r.errors).toEqual([]);
    expect(r.questions[0]!.options.map((o) => [o.key, o.text])).toEqual([["a", "x"], ["b", "y"], ["c", "z"]]);
  });
  it("đổi loại câu tính lại điểm", () => {
    const q = parseQuestionLines("1. A\na. x\nb. y\nc. z\nd. t").questions[0]!;
    expect(withKind(q, "CHOICE").options.map((o) => o.score)).toEqual([null, null, null, null]);
    expect(withKind(withKind(q, "CHOICE"), "SCALE").options.map((o) => o.score)).toEqual([5, 4, 2, 1]);
  });
  it("điểm mặc định: a, b luôn hài lòng", () => {
    for (const n of [4, 5, 6, 7]) expect(defaultScores(n).slice(0, 2)).toEqual([5, 4]);
    expect(defaultScores(6)).toEqual([5, 4, 3, 2, 2, 1]);
  });
});

describe("chống trùng", () => {
  it("hai câu khác số, cùng nội dung (bỏ qua hoa thường, dấu câu) → lỗi", () => {
    expect(parseQuestionLines("1. Phòng học tốt\n2. phòng học  tốt.").errors).toEqual(["Câu 2 trùng nội dung với câu 1."]);
  });
  it("KHÔNG kiểm tra trùng đáp án: hai đáp án cùng nội dung trong một câu → vẫn hợp lệ, lưu đủ", () => {
    const r = parseQuestionLines("1. A\na. Phù hợp\nb. phù hợp");
    expect(r.errors).toEqual([]);
    expect(r.questions[0]!.options).toHaveLength(2);
  });
  it("các câu khác nhau dùng chung bộ đáp án → hợp lệ (vd. câu 16–19)", () => {
    const r = parseQuestionLines("16. Phòng học\na. Phục vụ rất tốt\nb. Cơ bản\n17. Phòng ở\na. Phục vụ rất tốt\nb. Cơ bản");
    expect(r.errors).toEqual([]);
  });
});

describe("mergeQuestions — sửa phiếu", () => {
  const existing = parseQuestionLines("1. A\na. x\n2. B\n3. C").questions;
  const incoming = parseQuestionLines("2. B mới\na. y\n4. D").questions;

  it("REPLACE: chỉ còn câu mới dán", () => {
    expect(mergeQuestions(existing, incoming, "REPLACE").map((q) => q.qNo)).toEqual([2, 4]);
  });
  it("UPSERT: ghi đè câu cùng số, giữ câu khác, thêm câu mới — không sinh trùng số", () => {
    const m = mergeQuestions(existing, incoming, "UPSERT");
    expect(m.map((q) => [q.qNo, q.text])).toEqual([[1, "A"], [2, "B mới"], [3, "C"], [4, "D"]]);
    expect(m[1]!.options.map((o) => o.text)).toEqual(["y"]);
  });
  it("UPSERT: câu mới trùng nội dung câu cũ khác số → phát hiện được", () => {
    const m = mergeQuestions(existing, parseQuestionLines("5. a").questions, "UPSERT");
    expect(duplicateErrors(m)).toEqual(["Câu 5 trùng nội dung với câu 1."]);
  });
});

describe("resolveAnswer — ghép câu trả lời trong Excel với đáp án", () => {
  const q = parseQuestionLines(SAMPLE).questions[0]!;
  it("khớp theo nội dung, bỏ qua hoa thường, dấu câu, khoảng trắng", () => {
    expect(resolveAnswer(q, "Đầy đủ, kịp thời", null)).toEqual({ optKey: "a", score: 5 });
    expect(resolveAnswer(q, "  đầy đủ  kịp thời. ", null)).toEqual({ optKey: "a", score: 5 });
    expect(resolveAnswer(q, "Chưa đầy đủ, chưa kịp thời", null)).toEqual({ optKey: "c", score: 2 });
  });
  it("khớp theo chữ cái đầu", () => {
    expect(resolveAnswer(q, "b", null)).toEqual({ optKey: "b", score: 4 });
    expect(resolveAnswer(q, "d. Không phổ biến", null)).toEqual({ optKey: "d", score: 1 });
  });
  it("không khớp → không đáp án, không điểm", () => {
    expect(resolveAnswer(q, "Ý kiến khác", null)).toEqual({ optKey: null, score: null });
  });
  it("tự luận → không điểm; thang không đáp án → dùng điểm tự quy đổi", () => {
    expect(resolveAnswer({ qNo: 9, text: "x", kind: "TEXT", options: [] }, "Không", 3)).toEqual({ optKey: null, score: null });
    expect(resolveAnswer({ qNo: 9, text: "x", kind: "SCALE", options: [] }, "Hài lòng", 4)).toEqual({ optKey: null, score: 4 });
  });
});

describe("matchQuestions — ghép theo số thứ tự câu", () => {
  const form = [
    { qNo: 1, text: "Chuẩn đầu ra được phổ biến" },
    { qNo: 2, text: "Nắm rõ mục tiêu" },
    { qNo: 3, text: "Giảng viên đúng giờ" },
  ];
  const file = [
    { qNo: 1, text: "chuẩn đầu ra được  phổ biến." },
    { qNo: 2, text: "Nội dung khác hẳn" },
    { qNo: 4, text: "Câu thừa" },
  ];
  const m = matchQuestions(form, file);

  it("khớp theo số; nội dung giống (bỏ qua hoa thường, dấu câu) thì không cảnh báo", () => {
    expect(m.matched.map((x) => [x.qNo, x.textDiffers])).toEqual([[1, false], [2, true]]);
  });
  it("câu thiếu trong file và cột thừa trong file", () => {
    expect(m.missingInFile.map((q) => q.qNo)).toEqual([3]);
    expect(m.extraInFile.map((q) => q.qNo)).toEqual([4]);
  });
});
