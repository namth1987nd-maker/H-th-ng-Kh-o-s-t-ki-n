import { sql } from "kysely";
import { db } from "@/core/db";

export const dynamic = "force-dynamic";

/** Kiểm tra sống + kết nối DB, dùng cho Docker healthcheck và Playwright. */
export async function GET() {
  try {
    await sql`SELECT 1`.execute(db());
    return Response.json({ status: "ok", db: "ok" });
  } catch (e) {
    return Response.json({ status: "degraded", db: "down", error: String(e) }, { status: 503 });
  }
}
