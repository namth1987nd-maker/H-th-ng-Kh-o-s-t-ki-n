import { LayoutDashboard } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "dashboard",
  name: "Tổng quan",
  description: "Thẻ chỉ số 8 lĩnh vực, xu hướng nhiều năm, số cảnh báo đang mở",
  enabled: true,
  nav: [{ group: "main", order: 0, href: "/tong-quan", label: "Tổng quan", icon: LayoutDashboard }],
});
