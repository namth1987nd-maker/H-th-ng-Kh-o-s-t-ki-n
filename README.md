# Khảo sát lấy ý kiến phản hồi — khung dự án

Dựng theo `../thiet_ke_he_thong_khao_sat_nextjs_v2.md`: Next.js (App Router) + PostgreSQL 16, SQL-first (node-pg-migrate + Kysely).

> **Trạng thái**: khung đã viết tay, **chưa từng được cài đặt hay chạy** (môi trường tạo ra nó không có shell).
> Chạy các bước dưới đây theo thứ tự và sửa lỗi lặt vặt nếu có (phiên bản thư viện trong `package.json` chưa kiểm chứng).

## Cấu trúc source (theo module)

```
src/app/       chỉ định tuyến — mỗi page.tsx 1 dòng re-export
src/core/      hạ tầng dùng chung: auth, db, layout (header | sidebar | nội dung), ui, lib
src/modules/   nghiệp vụ, mỗi thư mục một module: dashboard, imports, results, sampling, alerts, pdca, reports, settings
src/jobs/      worker chạy tác vụ nền do các module khai báo
```

Quy ước, quy tắc phụ thuộc và **checklist thêm module mới**: [src/modules/README.md](src/modules/README.md).

## Phát triển hằng ngày (Windows): bấm đúp `dev.cmd`

Database chạy trong Docker, app chạy thẳng trên máy bằng `next dev` → **sửa code là trang tự cập nhật, không build**.
Migration mới (nếu có) tự chạy mỗi lần mở. Chạy bản production đầy đủ trong Docker: bấm đúp `setup-docker.cmd`.

## Chạy trên máy cá nhân (không cần cài PostgreSQL hay Docker)

```powershell
npm.cmd run local
```

Một lệnh: `npm install` → PostgreSQL nhúng (dữ liệu ở `%USERPROFILE%\.khaosat-pg`, cổng 54329) → tạo role/database
→ migration → seed → `next dev` → mở http://localhost:3000. Đăng nhập thử bằng `SEED_ADMIN_EMAIL`. Ctrl+C dừng cả app lẫn DB.
Xóa sạch dữ liệu local: dừng app rồi xóa thư mục `%USERPROFILE%\.khaosat-pg`.

Nếu PostgreSQL nhúng không khởi động được, chuyển dự án sang đường dẫn không dấu (vd. `C:\khao-sat`):
PostgreSQL trên Windows hay lỗi với đường dẫn có ký tự tiếng Việt.

Khác:

```bash
npm test                        # logic thuần, không cần DB
npm run test:db                 # schema trên PostgreSQL thật (cần Docker)
npm run worker                  # tác vụ nền (terminal khác, khi DB đang chạy)
npm run start:docker            # chạy DB bằng Docker thay cho DB nhúng
```

Triển khai đủ bộ: `docker compose up -d --build` (db → migrate → app + worker).

## Cái gì đã có / chưa có

| Phần | Trạng thái |
|---|---|
| Migration 0001–0009 (schema, view, hàm, vai trò, dữ liệu tham chiếu) | Có, **chưa chạy thử** — `test:db` sẽ kiểm |
| Logic lõi: thang đo, ngưỡng, giảm so năm trước, cỡ mẫu, chuẩn hóa tên, băm mã người học | Có + test |
| Truy vấn chuẩn a–f (`lib/db/queries/analytics.ts`) | Có |
| Đọc Excel theo luồng, gợi ý ánh xạ cột, kiểm tra điểm, ghi staging | Có |
| **Commit lô (staging → submission/answer)** | **Chưa** — chờ cấu trúc file Excel thật (xem `lib/import/commit.ts`) |
| Đăng nhập (Auth.js, vai trò từ `app_user`), RBAC, middleware | Có (khung) |
| Trang Tổng quan (đọc từ view) | Có |
| Các trang còn lại | Khung chờ, ghi rõ cần gì |
| Worker pg-boss (làm mới view, sinh PDCA) | Có; import-commit và report-export chưa |
| Xuất báo cáo Word/Excel/PDF | Chưa — cần mẫu `.docx` gắn thẻ (`templates/README.md`) |
| shadcn/ui, TanStack Table, Recharts | Đã khai báo; thêm component bằng `npx shadcn@latest add ...` khi cần |

## Sửa so với tài liệu thiết kế v2

1. **Seed `setting`/`sample_rule` không chèn được dòng nào** (lấy năm học đầu từ bảng còn rỗng) → chuyển sang `scripts/seed.ts`, tạo năm học trước.
2. **`setting.value->>0` luôn trả NULL** vì giá trị là số vô hướng → dùng `#>> '{}'` (trong truy vấn và test).
3. **Role `migrator` xung đột Docker** (`POSTGRES_USER` đã tạo rồi) → owner là `khaosat_owner`; `app_rw`/`app_ro` tạo kèm mật khẩu ở `db/init/01-roles.sh`, migration 0008 chỉ cấp quyền.
4. **Thiếu `immutable_unaccent()`** cho chỉ mục trigram → thêm ở 0001.
5. **Kiểm tra mẫu theo tỷ lệ đếm phiếu** → đếm số người (hash), phiếu không hash tính một người.
6. Thêm bảng `column_mapping` (mẫu ánh xạ cột lưu lại, mục 7 tài liệu).
7. pg-boss cần quyền DDL (schema `pgboss`) → worker dùng `PGBOSS_DATABASE_URL` (owner).

## Còn mở (cần bạn quyết)

- Cấu trúc Excel thật: dạng ngang/dọc, có mã giảng viên/học phần/người học không, chiều thang đo (mục 5.12).
- Lĩnh vực 1: "≥ 50 người học / nhà giáo" tính theo nhà giáo hay theo từng lớp học phần? Hiện cộng mọi học phần của một giảng viên.
- Các điểm ở mục 2.4 tài liệu (lĩnh vực 3, 6, dung sai "giảm so với năm trước").
