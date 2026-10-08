import { sql } from "kysely";
import { db } from "@/core/db";
import { analyzeSheet, type Analysis } from "../domain/google-form";
import { readSheetTable } from "./read-workbook";
import { extOf, uploadPath } from "./storage";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function loadBatch(publicId: string) {
  if (!UUID.test(publicId)) return undefined;
  return db()
    .selectFrom("import_batch as b")
    .innerJoin("academic_year as y", "y.id", "b.year_id")
    .select([
      "b.id", "b.public_id", "b.year_id", "b.form_id", "b.file_name", "b.file_sha256", "b.status",
      "b.n_submissions", "b.n_answers", "b.created_at", "b.committed_at", "y.code as year_code",
    ])
    .where("b.public_id", "=", publicId)
    .executeTakeFirst();
}
export type Batch = NonNullable<Awaited<ReturnType<typeof loadBatch>>>;

/** Đọc lại file gốc của lô và phân tích (dùng cho trang xem trước và lúc lưu). */
export async function analyzeBatch(batch: Pick<Batch, "file_sha256" | "file_name">): Promise<Analysis> {
  const p = uploadPath(batch.file_sha256.toString("hex"), extOf(batch.file_name));
  return analyzeSheet(await readSheetTable(p));
}

export async function recentBatches(limit = 20) {
  return db()
    .selectFrom("import_batch as b")
    .innerJoin("academic_year as y", "y.id", "b.year_id")
    .leftJoin("form as f", "f.id", "b.form_id")
    .select([
      "b.public_id", "b.file_name", "b.status", "b.n_submissions", "b.created_at", "y.code as year_code",
      "f.code as form_code", "f.name as form_name",
    ])
    .orderBy("b.created_at", "desc")
    .limit(limit)
    .execute();
}

export async function academicYears() {
  return db().selectFrom("academic_year").select(["id", "code"]).orderBy("start_date", "desc").execute();
}

/** Hoàn tác lô: xóa các đợt và phiếu tạo từ lô, giữ bản ghi lô ở trạng thái ROLLED_BACK. */
export async function rollbackBatch(batchId: string): Promise<void> {
  await sql`SELECT rollback_batch(${batchId}::bigint)`.execute(db());
}
