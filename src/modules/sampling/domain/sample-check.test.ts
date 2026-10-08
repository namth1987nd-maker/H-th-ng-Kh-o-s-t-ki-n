import { describe, expect, it } from "vitest";
import { checkMinCount, checkMinRatio } from "./sample-check";

describe("checkMinCount", () => {
  it("đúng bằng ngưỡng → đạt", () => expect(checkMinCount(50, 50)).toMatchObject({ passed: true, missing: 0 }));
  it("thiếu 1 phiếu → chưa đạt", () => expect(checkMinCount(49, 50)).toMatchObject({ passed: false, missing: 1 }));
});

describe("checkMinRatio (30%)", () => {
  it("đúng 30% → đạt", () => expect(checkMinRatio(30, 100, 3000)).toMatchObject({ passed: true, missing: 0 }));
  it("29/100 → chưa đạt, thiếu 1", () => expect(checkMinRatio(29, 100, 3000)).toMatchObject({ passed: false, required: 30, missing: 1 }));
  it("làm tròn lên số cần có", () => expect(checkMinRatio(3, 10, 2000)).toMatchObject({ passed: true, required: 2 }));
});
