/**
 * Chạy toàn bộ hệ thống trên máy cá nhân, KHÔNG cần cài PostgreSQL hay Docker:
 *   PostgreSQL nhúng (embedded-postgres, dữ liệu ở .local-pg/) → tạo role + database
 *   → migrate → seed → next dev → mở trình duyệt. Ctrl+C dừng cả app lẫn DB.
 *
 *   npm.cmd run local
 */
import EmbeddedPostgres from "embedded-postgres";
import pg from "pg";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.LOCAL_PG_PORT ?? 54329); // khác 5432 để không đụng PostgreSQL khác trên máy
// PostgreSQL trên Windows hay lỗi với đường dẫn có dấu tiếng Việt (vd. "HỌC LẬP TRÌNH"),
// nên dữ liệu đặt trong thư mục người dùng thay vì trong dự án.
const DATA_DIR = process.env.LOCAL_PG_DIR ?? path.join(os.homedir(), ".khaosat-pg");
const SUPER_PW = "postgres"; // chỉ nghe localhost, chỉ dùng cho môi trường phát triển

const pw = {
  owner: process.env.DB_OWNER_PASSWORD || "owner_local",
  rw: process.env.APP_RW_PASSWORD || "rw_local",
  ro: process.env.APP_RO_PASSWORD || "ro_local",
};
const url = (user: string, password: string, db = "khaosat") =>
  `postgresql://${user}:${encodeURIComponent(password)}@localhost:${PORT}/${db}`;

const step = (msg: string) => console.log(`\x1b[36m==> ${msg}\x1b[0m`);

function run(cmd: string, env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, { stdio: "inherit", shell: true, env });
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`"${cmd}" thoát với mã ${code}`))));
  });
}

async function openWhenReady(target: string) {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${target}/api/health`);
      if (r.ok) break;
    } catch {
      /* server chưa lên */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  const opener = process.platform === "win32" ? `start "" "${target}"` : process.platform === "darwin" ? `open ${target}` : `xdg-open ${target}`;
  spawn(opener, { shell: true, stdio: "ignore" });
}

async function main() {
  step(`Khởi động PostgreSQL nhúng (cổng ${PORT}, dữ liệu ở ${DATA_DIR})`);
  const server = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: SUPER_PW,
    port: PORT,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
    onLog: () => {},
  });
  if (!existsSync(path.join(DATA_DIR, "PG_VERSION"))) await server.initialise();
  await server.start();

  let app: ChildProcess | undefined;
  let stopping = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    app?.kill();
    step("Dừng PostgreSQL nhúng");
    await server.stop().catch(() => {});
    process.exit(code);
  };
  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  try {
    step("Tạo role và database (nếu chưa có)");
    const admin = new pg.Client({ connectionString: url("postgres", SUPER_PW, "postgres") });
    await admin.connect();
    for (const [name, password] of [["khaosat_owner", pw.owner], ["app_rw", pw.rw], ["app_ro", pw.ro]] as const) {
      const exists = (await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [name])).rowCount;
      // luôn đặt lại mật khẩu theo .env để hai bên khớp nhau
      await admin.query(`${exists ? "ALTER" : "CREATE"} ROLE ${name} LOGIN PASSWORD ${admin.escapeLiteral(password)}`);
    }
    if (!(await admin.query("SELECT 1 FROM pg_database WHERE datname = 'khaosat'")).rowCount) {
      await admin.query("CREATE DATABASE khaosat OWNER khaosat_owner ENCODING 'UTF8' TEMPLATE template0");
    }
    await admin.query("GRANT CONNECT ON DATABASE khaosat TO app_rw, app_ro");
    await admin.end();

    // URL trỏ vào DB nhúng; ghi đè giá trị trong .env (dotenv và Next.js không đè biến đã có)
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      MIGRATE_DATABASE_URL: url("khaosat_owner", pw.owner),
      PGBOSS_DATABASE_URL: url("khaosat_owner", pw.owner),
      DATABASE_URL: url("app_rw", pw.rw),
      DATABASE_URL_RO: url("app_ro", pw.ro),
    };

    step("Migration");
    await run("npm run db:migrate", env);
    step("Seed");
    await run("npm run db:seed", env);

    step(`Chạy ứng dụng: http://localhost:3000 — đăng nhập thử bằng ${process.env.SEED_ADMIN_EMAIL ?? "(SEED_ADMIN_EMAIL)"}. Ctrl+C để dừng.`);
    void openWhenReady("http://localhost:3000");
    app = spawn("npm run dev", { stdio: "inherit", shell: true, env });
    app.on("exit", (code) => void shutdown(code ?? 0));
  } catch (e) {
    console.error("\x1b[31m" + (e instanceof Error ? e.message : String(e)) + "\x1b[0m");
    await shutdown(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
