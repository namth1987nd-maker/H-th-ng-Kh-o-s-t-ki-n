import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    // test đơn vị đặt cạnh code trong từng module; test DB tách riêng ở tests/db
    include: ["src/**/*.test.ts", "tests/db/**/*.test.ts"],
    testTimeout: 120_000, // test DB khởi động container
    hookTimeout: 120_000,
  },
});
