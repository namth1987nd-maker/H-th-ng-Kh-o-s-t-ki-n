import { describe, expect, it } from "vitest";
import { formatRate, isBelowThreshold, isDeclined, toBasisPoints } from "./alerts";

const BP70 = toBasisPoints("0.70");

describe("isBelowThreshold", () => {
  it("đúng 70,00% không cảnh báo", () => expect(isBelowThreshold(70, 100, BP70)).toBe(false));
  it("69,99% cảnh báo", () => expect(isBelowThreshold(6999, 10000, BP70)).toBe(true));
  it("tập rỗng không cảnh báo", () => expect(isBelowThreshold(0, 0, BP70)).toBe(false));
  it("toàn mức 5 không cảnh báo", () => expect(isBelowThreshold(50, 50, BP70)).toBe(false));
  it("toàn mức 1 cảnh báo", () => expect(isBelowThreshold(0, 50, BP70)).toBe(true));
});

describe("isDeclined", () => {
  const prev = { nSatisfied: 80, nAnswers: 100 };
  it("thiếu dữ liệu năm trước → không", () => expect(isDeclined({ nSatisfied: 10, nAnswers: 100 }, null)).toBe(false));
  it("năm trước rỗng → không", () => expect(isDeclined({ nSatisfied: 10, nAnswers: 100 }, { nSatisfied: 0, nAnswers: 0 })).toBe(false));
  it("bằng nhau → không", () => expect(isDeclined({ nSatisfied: 160, nAnswers: 200 }, prev)).toBe(false));
  it("giảm 1 câu trả lời → có", () => expect(isDeclined({ nSatisfied: 79, nAnswers: 100 }, prev)).toBe(true));
  it("tăng → không", () => expect(isDeclined({ nSatisfied: 81, nAnswers: 100 }, prev)).toBe(false));
  it("trong dung sai 2 điểm % → không", () => expect(isDeclined({ nSatisfied: 79, nAnswers: 100 }, prev, 2)).toBe(false));
  it("vượt dung sai → có", () => expect(isDeclined({ nSatisfied: 77, nAnswers: 100 }, prev, 2)).toBe(true));
});

describe("toBasisPoints / formatRate", () => {
  it("0.70 → 7000", () => expect(BP70).toBe(7000));
  it("định dạng tiếng Việt", () => expect(formatRate(2, 3)).toBe("66,67%"));
  it("rỗng → gạch ngang", () => expect(formatRate(0, 0)).toBe("—"));
});
