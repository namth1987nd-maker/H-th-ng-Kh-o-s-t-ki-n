import { AlertTriangle } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "alerts",
  name: "Cảnh báo",
  description: "Phát hiện tỷ lệ hài lòng dưới ngưỡng hoặc giảm so với năm học trước",
  enabled: true,
  nav: [{ group: "analysis", order: 30, href: "/canh-bao", label: "Cảnh báo", icon: AlertTriangle, permission: "analysis:read" }],
});
