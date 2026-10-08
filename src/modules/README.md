# Kiến trúc module

```
src/
├── app/                 CHỈ định tuyến (Next.js bắt buộc). Mỗi page.tsx là 1 dòng re-export từ module.
├── core/                Hạ tầng dùng chung, KHÔNG chứa nghiệp vụ
│   ├── auth/            đăng nhập, phiên, quyền (requirePermission), mật khẩu
│   ├── db/              kết nối Kysely, kiểu bảng
│   ├── layout/          khung giao diện: header | sidebar | nội dung
│   ├── ui/              component dùng chung (PageHeader, …)
│   ├── lib/             rbac, env, text (NFC, bỏ dấu), hash, utils
│   └── module.ts        hợp đồng module: defineModule, defineJob, nhóm menu
├── modules/             Nghiệp vụ, mỗi thư mục một module khép kín
│   ├── registry.ts      đăng ký module → menu sidebar
│   ├── jobs.ts          đăng ký tác vụ nền → worker
│   ├── _template/       mẫu để sao chép khi tạo module mới
│   └── <module>/
└── jobs/worker.ts       chạy tác vụ nền (pg-boss) từ modules/jobs.ts
```

## Cấu trúc một module

```
modules/<id>/
├── module.ts       BẮT BUỘC. Manifest: id, tên, mô tả, bật/tắt, mục menu (nhóm, thứ tự, icon, quyền)
├── index.ts        API công khai client-safe (domain thuần, kiểu). Không import pg/fs.
├── server.ts       API công khai phía server (truy vấn, action) cho module khác dùng
├── pages/          Trang (Server Component), được app/ re-export
├── components/     Component riêng của module
├── server/         Truy vấn SQL, Server Action, xử lý file — chỉ chạy phía server
├── domain/         Logic thuần TypeScript (không DB, không React), kèm *.test.ts
└── jobs.ts         Tác vụ nền (defineJob), tên hàng đợi "<id>-<việc>"
```

Không bắt buộc đủ mọi thư mục: module chỉ hiển thị thì có thể chỉ có `module.ts` + `pages/`.

## Quy tắc phụ thuộc

1. `core` **không** import `modules` (ngoại lệ duy nhất: `core/layout/app-nav.tsx` đọc `modules/registry.ts` để dựng menu).
2. Module A dùng module B **chỉ qua** `@/modules/B` (index.ts) hoặc `@/modules/B/server` (server.ts) —
   không import sâu vào `@/modules/B/server/queries` hay `@/modules/B/domain/...`.
3. Client Component chỉ import `index.ts`, không bao giờ import `server.ts`.
4. Module cần module khác làm việc nền thì **gửi job** (`ctx.send("pdca-generate", …)`), không gọi trực tiếp.
5. Bảng DB: mỗi module sở hữu bảng của mình; đọc bảng module khác thì qua `server.ts` của module đó.
6. Server Action thay đổi dữ liệu phải gọi `refreshAll()` (`@/core/lib/refresh`) trước `redirect()` — trình duyệt
   giữ trang đã xem 30 giây (`staleTimes` trong next.config.ts), không gọi thì có thể thấy số liệu cũ.

## Các module hiện có

| Module | Menu | Việc |
|---|---|---|
| `dashboard` | Tổng quan | Thẻ chỉ số 8 lĩnh vực |
| `forms` | Phiếu đánh giá | Phiếu (mã PHxxxx, thuộc 1 lĩnh vực) + câu hỏi; thống kê số lượng trả lời theo từng câu, từng mức |
| `imports` | Nhập dữ liệu, Lô nhập | Đọc file Google Form, nhận diện cột "Đối tượng" + câu hỏi "1. …", xem trước, lưu, hoàn tác |
| `subjects` | Đối tượng | Đối tượng (mã cố định DTxxxx) → đợt (mỗi lần nhập một đợt riêng) → phiếu → câu trả lời |
| `results` | Lĩnh vực (8 mục con) | Kết quả trả lời theo tiêu chí; sở hữu view `mv_sat_*` |
| `sampling` | Kiểm tra mẫu | Cỡ mẫu tối thiểu theo quy định |
| `alerts` | Cảnh báo | Dưới ngưỡng / giảm so với năm trước |
| `pdca` | PDCA | Hành động cải tiến |
| `reports` | Báo cáo | Xuất Word/Excel/PDF |
| `settings` | Cấu hình | Quy tắc, ngưỡng, danh mục, người dùng |

## Checklist thêm module mới

1. Sao chép `modules/_template` → `modules/<id>`; sửa `module.ts` (id, tên, menu, quyền).
2. Đăng ký: thêm 1 dòng import + 1 phần tử vào `MODULES` trong `modules/registry.ts`.
3. Route: tạo `src/app/(main)/<duong-dan>/page.tsx` chứa đúng 1 dòng
   `export { default } from "@/modules/<id>/pages/<ten>-page";`
4. Tác vụ nền (nếu có): khai báo trong `modules/<id>/jobs.ts`, thêm vào `modules/jobs.ts`.
5. Bảng DB (nếu có): migration mới `db/migrations/NNNN_<id>_<mo-ta>.sql` (số tiếp theo, không sửa file cũ),
   thêm kiểu bảng vào `core/db/types.ts` (hoặc chạy `npm run db:codegen`).
6. Quyền mới (nếu có): thêm vào `Permission` và ma trận trong `core/lib/rbac.ts`.
7. Test: `*.test.ts` đặt cạnh file trong `domain/`; `npm test` chạy toàn bộ.

Tắt một module: đặt `enabled: false` trong `module.ts` (ẩn khỏi menu).
