import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/core/auth/password";

describe("password", () => {
  const stored = hashPassword("Admin@123");
  it("đúng mật khẩu", () => expect(verifyPassword("Admin@123", stored)).toBe(true));
  it("sai mật khẩu", () => expect(verifyPassword("admin@123", stored)).toBe(false));
  it("chưa đặt mật khẩu → không vào được", () => expect(verifyPassword("Admin@123", null)).toBe(false));
  it("băm khác nhau mỗi lần (có salt)", () => expect(hashPassword("x")).not.toBe(hashPassword("x")));
});
