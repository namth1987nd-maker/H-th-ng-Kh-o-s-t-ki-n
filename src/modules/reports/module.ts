import { FileText } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "reports",
  name: "Báo cáo",
  description: "Xuất báo cáo Word / Excel / PDF theo mẫu, đóng băng số liệu",
  enabled: true,
  nav: [{ group: "improve", order: 20, href: "/bao-cao", label: "Báo cáo", icon: FileText, permission: "analysis:read" }],
});
