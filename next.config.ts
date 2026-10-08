import type { NextConfig } from "next";

const config: NextConfig = {
  // Tự host bằng Docker: image gọn, chạy bằng `node server.js`
  output: "standalone",
  // Các gói chạy phía Node, không bó vào bundle
  serverExternalPackages: ["pg", "pg-boss", "exceljs", "pizzip", "docxtemplater"],
  experimental: {
    serverActions: { bodySizeLimit: "25mb" }, // file Excel tải lên
    // Trình duyệt giữ trang đã xem 30 giây (bấm lại menu, Back/Forward → hiện ngay, không gọi server).
    // Mọi thao tác lưu/sửa/xóa gọi revalidatePath nên dữ liệu vẫn luôn mới sau khi thay đổi.
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default config;
