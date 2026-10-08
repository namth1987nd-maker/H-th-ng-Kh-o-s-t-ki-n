import { Settings } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "settings",
  name: "Cấu hình",
  description: "Quy tắc cỡ mẫu, ngưỡng, bộ câu hỏi, ánh xạ cột, danh mục, người dùng",
  enabled: true,
  nav: [{ group: "system", order: 10, href: "/cau-hinh", label: "Cấu hình", icon: Settings, permission: "config:write" }],
});
