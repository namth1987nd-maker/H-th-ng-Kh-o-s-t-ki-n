import { describe, expect, it } from "vitest";
import { buildNav, MODULES } from "./registry";

describe("module registry", () => {
  it("mã module không trùng", () => {
    const ids = MODULES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("đường dẫn menu không trùng", () => {
    const hrefs = MODULES.flatMap((m) => m.nav.map((n) => n.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("ADMIN thấy Cấu hình, VIEWER thì không", () => {
    const labels = (role: Parameters<typeof buildNav>[0]) => buildNav(role).flatMap((g) => g.items.map((i) => i.label));
    expect(labels("ADMIN")).toContain("Cấu hình");
    expect(labels("VIEWER")).not.toContain("Cấu hình");
    expect(labels("VIEWER")).not.toContain("Nhập dữ liệu");
    expect(labels("VIEWER")).toContain("Tổng quan");
  });
});
