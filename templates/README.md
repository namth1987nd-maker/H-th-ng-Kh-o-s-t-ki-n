# Mẫu báo cáo

Đặt mẫu `.docx` / `.xlsx` vào đây (mẫu hiện có: `../MẪU BÁO CÁO .docx`).
12313d2132456
Thẻ docxtemplater dùng trong mẫu Word:

| Thẻ | Ý nghĩa |
|---|---|
| `{tenTruong}`, `{namHoc}` | Giá trị đơn |
| `{#linhVuc} … {/linhVuc}` | Lặp cho từng lĩnh vực |
| `{%bieuDo1}` | Ảnh biểu đồ (image module) |

Số liệu điền vào mẫu lấy từ `report_run.data_snapshot` (đóng băng), không truy vấn lại DB.
Ghi phiên bản mẫu vào `report_run.template_ver`.
