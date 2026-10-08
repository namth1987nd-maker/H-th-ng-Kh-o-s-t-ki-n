// MẪU module mới: sao chép cả thư mục _template thành modules/<ten-module>, sửa id/tên/menu,
// rồi làm theo checklist trong src/modules/README.md. Thư mục này KHÔNG được đăng ký nên không hiện trên menu.
import { Box } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "_template",
  name: "Module mẫu",
  description: "Mô tả ngắn module làm gì",
  enabled: true,
  nav: [{ group: "analysis", order: 99, href: "/mau", label: "Module mẫu", icon: Box, permission: "analysis:read" }],
});
