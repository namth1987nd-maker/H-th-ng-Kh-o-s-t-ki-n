import { sql } from "kysely";
import { db, num } from "@/core/db";

/** Truy vấn mẫu: mỗi module chỉ đọc/ghi các bảng của mình qua file này. */
export async function exampleSummary() {
  const { rows } = await sql<{ n: string }>`SELECT count(*) AS n FROM field`.execute(db());
  return { fields: num(rows[0]?.n) };
}
