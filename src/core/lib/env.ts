import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_RO: z.string().url().optional(),
  PGBOSS_DATABASE_URL: z.string().url().optional(),
  HASH_SECRET: z.string().min(16),
  AUTH_SECRET: z.string().min(16),
  STORAGE_DIR: z.string().default("./storage"),
  AUTH_DISABLED: z.enum(["true", "false"]).default("false"),
  ENABLE_DEV_LOGIN: z.enum(["true", "false"]).default("false"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Đọc và kiểm tra biến môi trường một lần; lỗi ghi rõ biến nào thiếu. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Cấu hình môi trường không hợp lệ: ${detail}`);
    }
    cached = parsed.data;
  }
  return cached;
}
