import { describe, expect, it } from "vitest";
import { normalizeName, toNFC } from "@/core/lib/text";
import { respondentHash } from "@/core/lib/hash";

describe("normalizeName", () => {
  it("bỏ dấu, đ→d, chữ thường", () => expect(normalizeName("Nguyễn Đức Thắng")).toBe("nguyen duc thang"));
  it("NFC và NFD cho cùng kết quả", () => {
    const nfd = "Trû̀n".normalize("NFD");
    expect(normalizeName(nfd)).toBe(normalizeName(nfd.normalize("NFC")));
  });
  it("gộp khoảng trắng", () => expect(toNFC("  Lê   Văn  A ")).toBe("Lê Văn A"));
});

describe("respondentHash", () => {
  it("cùng mã + cùng khóa → cùng băm", () => {
    expect(respondentHash("SV001", "khoa-bi-mat-123456").equals(respondentHash("sv001 ", "khoa-bi-mat-123456"))).toBe(true);
  });
  it("khác khóa → khác băm", () => {
    expect(respondentHash("SV001", "khoa-1-xxxxxxxxxxxx").equals(respondentHash("SV001", "khoa-2-xxxxxxxxxxxx"))).toBe(false);
  });
  it("thiếu khóa → lỗi", () => {
    expect(() => respondentHash("SV001", "")).toThrow();
  });
});
