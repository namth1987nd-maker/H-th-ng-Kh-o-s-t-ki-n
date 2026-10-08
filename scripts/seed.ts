/**
 * Nạp dữ liệu khởi tạo phụ thuộc năm học: ngưỡng, quy tắc cỡ mẫu, tài khoản admin.
 * Chạy lại nhiều lần an toàn (ON CONFLICT DO NOTHING). Dùng tài khoản owner.
 *
 *   npm run db:seed
 */
import { Client } from "pg";
import { hashPassword } from "../src/core/auth/password";

/** '2024-2025' → { start: 2024-09-01, end: 2025-08-31 } */
function yearRange(code: string) {
  const m = /^(\d{4})-(\d{4})$/.exec(code);
  if (!m || Number(m[2]) !== Number(m[1]) + 1) {
    throw new Error(`SEED_FIRST_YEAR phải có dạng 2024-2025, nhận được: ${code}`);
  }
  return { start: `${m[1]}-09-01`, end: `${m[2]}-08-31` };
}

const RULES: Array<[number, string, string, number, string]> = [
  [1, "NGUOI_HOC", "MIN_PER_STAFF", 50, "Tối thiểu 50 người học / nhà giáo"],
  [3, "NGUOI_HOC", "MIN_TOTAL", 200, "Tối thiểu 200 người học"],
  [4, "CUU_NGUOI_HOC", "MIN_RATIO", 0.3, "≥ 30% đối tượng"],
  [5, "DON_VI_SDLD", "MIN_RATIO", 0.3, "≥ 30% đối tượng"],
  [6, "CUU_NGUOI_HOC", "MIN_RATIO", 0.3, "≥ 30% đối tượng"],
  [6, "NGUOI_HOC_VLVH", "MIN_RATIO", 0.3, "≥ 30% đối tượng"],
  [7, "GIANG_VIEN", "MIN_RATIO", 0.2, "≥ 20% giảng viên"],
  [7, "NGUOI_HOC", "MIN_RATIO", 0.3, "≥ 30% người học"],
];

async function main() {
  const url = process.env.MIGRATE_DATABASE_URL;
  if (!url) throw new Error("Thiếu MIGRATE_DATABASE_URL");
  const yearCode = process.env.SEED_FIRST_YEAR ?? "2024-2025";
  const { start, end } = yearRange(yearCode);

  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("BEGIN");

    await db.query(
      `INSERT INTO academic_year (code, start_date, end_date) VALUES ($1,$2,$3)
       ON CONFLICT (code) DO NOTHING`,
      [yearCode, start, end],
    );
    const { rows } = await db.query<{ id: number }>("SELECT id FROM academic_year WHERE code = $1", [yearCode]);
    const yearId = rows[0]!.id;

    await db.query(
      `INSERT INTO setting (key, value, valid_from_year) VALUES
         ('satisfaction_threshold', '0.70', $1),
         ('decline_tolerance_pp',   '0',    $1)
       ON CONFLICT DO NOTHING`,
      [yearId],
    );

    for (const [field, group, kind, min, note] of RULES) {
      await db.query(
        `INSERT INTO sample_rule (field_id, group_code, kind, min_value, valid_from_year, note)
         SELECT $1,$2,$3,$4,$5,$6
         WHERE NOT EXISTS (
           SELECT 1 FROM sample_rule
           WHERE field_id=$1 AND group_code=$2 AND kind=$3 AND valid_from_year=$5)`,
        [field, group, kind, min, yearId, note],
      );
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL;
    if (adminEmail) {
      await db.query(
        `INSERT INTO app_user (email, full_name, role)
         SELECT $1, $2, 'ADMIN'
         WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE lower(email) = lower($1))`,
        [adminEmail, process.env.SEED_ADMIN_NAME ?? "Quản trị hệ thống"],
      );
      // Chỉ đặt mật khẩu khi admin chưa có, để không ghi đè mật khẩu đã đổi
      const adminPassword = process.env.SEED_ADMIN_PASSWORD;
      if (adminPassword) {
        await db.query(
          `UPDATE app_user SET password_hash = $2 WHERE lower(email) = lower($1) AND password_hash IS NULL`,
          [adminEmail, hashPassword(adminPassword)],
        );
      }
    }

    await db.query("COMMIT");
    console.log(`Seed xong: năm học ${yearCode}, ${RULES.length} quy tắc mẫu, admin ${adminEmail ?? "(bỏ qua)"}`);
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
