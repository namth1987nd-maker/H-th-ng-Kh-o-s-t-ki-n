/**
 * Worker tác vụ nền. pg-boss dùng chính PostgreSQL làm hàng đợi (không cần Redis).
 * Danh sách tác vụ do các module tự khai báo, gom ở src/modules/jobs.ts.
 * pg-boss tự tạo schema `pgboss` nên kết nối bằng tài khoản owner (PGBOSS_DATABASE_URL);
 * truy vấn nghiệp vụ vẫn đi qua core/db bằng app_rw.
 */
import PgBoss from "pg-boss";
import type { JobContext } from "@/core/module";
import { JOBS } from "@/modules/jobs";

async function main() {
  const url = process.env.PGBOSS_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Thiếu PGBOSS_DATABASE_URL");

  const boss = new PgBoss(url);
  boss.on("error", (e) => console.error("[pg-boss]", e));
  await boss.start();

  const ctx: JobContext = {
    async send(name, data = {}) {
      await boss.send(name, data);
    },
  };

  for (const job of JOBS) {
    await boss.createQueue(job.name);
    await boss.work<object>(job.name, async (batch) => {
      for (const j of batch) await job.handler(j.data, ctx);
    });
  }

  console.log("Worker sẵn sàng:", JOBS.map((j) => j.name).join(", "));

  const stop = async () => {
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
