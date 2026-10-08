import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { DB } from "./types";

// bigint (OID 20) mặc định về chuỗi; count() trả bigint nên ép về number bằng num() khi cần.
// numeric (OID 1700) giữ chuỗi để không mất độ chính xác.

declare global {
  // eslint-disable-next-line no-var
  var __db: Kysely<DB> | undefined;
  // eslint-disable-next-line no-var
  var __dbRo: Kysely<DB> | undefined;
}

function create(url: string, max: number): Kysely<DB> {
  return new Kysely<DB>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url, max }) }),
  });
}

/** Kết nối đọc/ghi (app_rw). Giữ một thể hiện duy nhất khi hot-reload ở dev. */
export function db(): Kysely<DB> {
  if (!globalThis.__db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Thiếu DATABASE_URL");
    globalThis.__db = create(url, 10);
  }
  return globalThis.__db;
}

/** Kết nối chỉ đọc (app_ro) cho xuất báo cáo; rơi về db() nếu chưa cấu hình. */
export function dbRo(): Kysely<DB> {
  const url = process.env.DATABASE_URL_RO;
  if (!url) return db();
  if (!globalThis.__dbRo) globalThis.__dbRo = create(url, 5);
  return globalThis.__dbRo;
}

export const num = (v: string | number | bigint | null | undefined): number => Number(v ?? 0);

export type { DB } from "./types";
