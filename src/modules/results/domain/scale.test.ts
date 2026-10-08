import { describe, expect, it } from "vitest";
import { isSatisfied, normalizeScore, suspectReversedScale } from "./scale";

describe("normalizeScore", () => {
  it("giữ nguyên khi không đảo", () => {
    for (const s of [1, 2, 3, 4, 5]) expect(normalizeScore(s, false)).toBe(s);
  });
  it("đảo chiều: 1↔5, 2↔4, 3 giữ", () => {
    expect(normalizeScore(1, true)).toBe(5);
    expect(normalizeScore(2, true)).toBe(4);
    expect(normalizeScore(3, true)).toBe(3);
    expect(normalizeScore(5, true)).toBe(1);
  });
  it.each([0, 6, -1, 2.5, NaN])("từ chối giá trị ngoài khoảng: %s", (v) => {
    expect(() => normalizeScore(v, false)).toThrow(RangeError);
  });
});

describe("isSatisfied", () => {
  it("chỉ mức 4 và 5", () => {
    expect([1, 2, 3, 4, 5].map(isSatisfied)).toEqual([false, false, false, true, true]);
  });
});

describe("suspectReversedScale", () => {
  it("nghi đảo khi đa số ở mức 1–2", () => {
    expect(suspectReversedScale({ 1: 60, 2: 20, 4: 10, 5: 10 })).toBe(true);
  });
  it("bình thường khi đa số ở mức 4–5", () => {
    expect(suspectReversedScale({ 1: 2, 4: 40, 5: 58 })).toBe(false);
  });
  it("tập rỗng không nghi", () => {
    expect(suspectReversedScale({})).toBe(false);
  });
});
