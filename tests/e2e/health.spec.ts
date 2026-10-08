import { expect, test } from "@playwright/test";

test("API sống và kết nối được DB", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok", db: "ok" });
});

test("chưa đăng nhập thì chuyển về trang đăng nhập", async ({ page }) => {
  await page.goto("/tong-quan");
  await expect(page).toHaveURL(/dang-nhap/);
});
