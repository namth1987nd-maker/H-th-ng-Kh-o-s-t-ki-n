// Chạy trên PostgreSQL thật (Testcontainers). Cần Docker: `npm run test:db`.
import path from "node:path";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { runner } from "node-pg-migrate";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!run)("schema PostgreSQL", () => {
  let container: StartedPostgreSqlContainer;
  let client: pg.Client;

  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16").start();
    const url = container.getConnectionUri();
    await runner({
      databaseUrl: url,
      dir: path.resolve(__dirname, "../../db/migrations"),
      direction: "up",
      migrationsTable: "pgmigrations",
      log: () => {},
    });
    client = new pg.Client({ connectionString: url });
    await client.connect();

    // dữ liệu tối thiểu: 2 năm học, bộ câu hỏi lĩnh vực 3 (không bắt buộc đối tượng), 2 tiêu chí
    await client.query(`
      INSERT INTO academic_year (code, start_date, end_date) VALUES
        ('2023-2024','2023-09-01','2024-08-31'), ('2024-2025','2024-09-01','2025-08-31');
      INSERT INTO questionnaire (field_id, version, valid_from_year) VALUES
        (3, 1, 1), (2, 1, 1);
      INSERT INTO criterion (questionnaire_id, code, text, sort_order) VALUES
        (1,'C1','Tiêu chí 1',1), (1,'C2','Tiêu chí 2',2), (2,'X1','Tiêu chí khác lĩnh vực',1);
      INSERT INTO import_batch (year_id, file_name, file_sha256, status)
        VALUES (2, 'a.xlsx', decode('aa','hex'), 'COMMITTED');
    `);
  });

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  });

  const newSubmission = (extra = "") =>
    client.query<{ id: string }>(
      `INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row ${extra ? "," + extra.split("|")[0] : ""})
       VALUES (1, 2, 3, 1, 'NGUOI_HOC', 'ONLINE', 2 ${extra ? "," + extra.split("|")[1] : ""}) RETURNING id`,
    );

  it("migration + dữ liệu tham chiếu: 8 lĩnh vực", async () => {
    const { rows } = await client.query("SELECT count(*)::int AS n FROM field");
    expect(rows[0].n).toBe(8);
  });

  it("chặn điểm ngoài 1–5", async () => {
    const { rows } = await newSubmission();
    await expect(
      client.query(`INSERT INTO answer VALUES ($1, 1, 1, 6, 6)`, [rows[0].id]),
    ).rejects.toThrow(/check/i);
  });

  it("chặn câu trả lời thuộc tiêu chí của phiên bản khác", async () => {
    const { rows } = await newSubmission();
    await expect(
      client.query(`INSERT INTO answer VALUES ($1, 3, 1, 5, 5)`, [rows[0].id]), // tiêu chí 3 thuộc questionnaire 2
    ).rejects.toThrow(/foreign key/i);
  });

  it("chặn phiếu dùng bộ câu hỏi của lĩnh vực khác", async () => {
    await expect(
      client.query(`INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row)
                    VALUES (1, 2, 3, 2, 'NGUOI_HOC', 'ONLINE', 3)`), // questionnaire 2 thuộc lĩnh vực 2
    ).rejects.toThrow(/foreign key/i);
  });

  it("lĩnh vực 1 thiếu giảng viên/học phần bị chặn", async () => {
    await client.query(`INSERT INTO questionnaire (field_id, version, valid_from_year) VALUES (1, 1, 1)`);
    await expect(
      client.query(`INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row)
                    SELECT 1, 2, 1, id, 'NGUOI_HOC', 'ONLINE', 4 FROM questionnaire WHERE field_id = 1`),
    ).rejects.toThrow(/ck_target_f1/);
  });

  it("chặn phiếu trùng cùng respondent_hash", async () => {
    const h = "decode('0102','hex')";
    await client.query(`INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row, respondent_hash)
                        VALUES (1, 2, 3, 1, 'NGUOI_HOC', 'ONLINE', 10, ${h})`);
    await expect(
      client.query(`INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row, respondent_hash)
                    VALUES (1, 2, 3, 1, 'NGUOI_HOC', 'ONLINE', 11, ${h})`),
    ).rejects.toThrow(/ux_sub_dedupe/);
  });

  it("rule_value và setting_for theo năm học", async () => {
    await client.query(`
      INSERT INTO setting (key, value, valid_from_year) VALUES
        ('satisfaction_threshold','0.70',1), ('satisfaction_threshold','0.75',2);
      INSERT INTO sample_rule (field_id, group_code, kind, min_value, valid_from_year) VALUES
        (1,'NGUOI_HOC','MIN_PER_STAFF',50,1), (1,'NGUOI_HOC','MIN_PER_STAFF',60,2);
    `);
    const t = await client.query(`SELECT setting_for('satisfaction_threshold', 1::smallint) #>> '{}' AS a,
                                         setting_for('satisfaction_threshold', 2::smallint) #>> '{}' AS b`);
    expect([t.rows[0].a, t.rows[0].b]).toEqual(["0.70", "0.75"]);
    const r = await client.query(`SELECT rule_value(1::smallint,'NGUOI_HOC','MIN_PER_STAFF',1::smallint)::int AS a,
                                         rule_value(1::smallint,'NGUOI_HOC','MIN_PER_STAFF',2::smallint)::int AS b`);
    expect([r.rows[0].a, r.rows[0].b]).toEqual([50, 60]);
  });

  it("rollback_batch xóa phiếu + câu trả lời, giữ bản ghi lô, cho nhập lại file", async () => {
    await client.query(`INSERT INTO import_batch (year_id, file_name, file_sha256, status) VALUES (2,'b.xlsx',decode('bb','hex'),'COMMITTED')`);
    const s = await client.query<{ id: string }>(
      `INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row)
       VALUES (2, 2, 3, 1, 'NGUOI_HOC', 'ONLINE', 2) RETURNING id`);
    await client.query(`INSERT INTO answer VALUES ($1, 1, 1, 5, 5)`, [s.rows[0]!.id]);

    await client.query(`SELECT rollback_batch(2)`);

    expect((await client.query(`SELECT count(*)::int n FROM submission WHERE batch_id = 2`)).rows[0].n).toBe(0);
    expect((await client.query(`SELECT status FROM import_batch WHERE id = 2`)).rows[0].status).toBe("ROLLED_BACK");
    // cùng hash được nhập lại sau khi hoàn tác
    await client.query(`INSERT INTO import_batch (year_id, file_name, file_sha256, status) VALUES (2,'b.xlsx',decode('bb','hex'),'COMMITTED')`);
  });

  it("view tổng hợp + refresh_all_mv + PDCA không trùng khi sinh hai lần", async () => {
    await client.query(`INSERT INTO import_batch (year_id, file_name, file_sha256, status) VALUES (2,'c.xlsx',decode('cc','hex'),'COMMITTED')`);
    // 10 câu trả lời tiêu chí C1 trong lô 4: 6 hài lòng (60%) → dưới ngưỡng 75% của năm 2
    for (let i = 0; i < 10; i++) {
      const s = await client.query<{ id: string }>(
        `INSERT INTO submission (batch_id, year_id, field_id, questionnaire_id, group_code, channel, source_row)
         VALUES (4, 2, 3, 1, 'NGUOI_HOC', 'ONLINE', ${100 + i}) RETURNING id`);
      await client.query(`INSERT INTO answer VALUES ($1, 1, 1, $2, $2)`, [s.rows[0]!.id, i < 6 ? 5 : 2]);
    }
    await client.query(`SELECT refresh_all_mv()`);
    const mv = await client.query(`SELECT n_answers::int a, n_satisfied::int s FROM mv_sat_criterion_year WHERE year_id = 2 AND criterion_code = 'C1'`);
    expect(mv.rows[0].a).toBeGreaterThanOrEqual(10);

    const gen = `INSERT INTO pdca_action (year_id, field_id, criterion_code, trigger_type, n_answers, n_satisfied)
                 SELECT c.year_id, c.field_id, c.criterion_code, 'BELOW_THRESHOLD', c.n_answers, c.n_satisfied
                 FROM mv_sat_criterion_year c
                 WHERE c.year_id = 2 AND c.n_answers > 0
                   AND c.n_satisfied < (setting_for('satisfaction_threshold', c.year_id::smallint) #>> '{}')::numeric * c.n_answers
                 ON CONFLICT DO NOTHING`;
    const first = await client.query(gen);
    const second = await client.query(gen);
    expect(first.rowCount).toBeGreaterThan(0);
    expect(second.rowCount).toBe(0);
  });
});
