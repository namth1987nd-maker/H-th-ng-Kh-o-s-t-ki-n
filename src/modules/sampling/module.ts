import { ClipboardCheck } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "sampling",
  name: "Kiểm tra mẫu",
  description: "Đối chiếu cỡ mẫu tối thiểu theo quy định từng lĩnh vực",
  enabled: true,
  nav: [{ group: "analysis", order: 20, href: "/kiem-tra-mau", label: "Kiểm tra mẫu", icon: ClipboardCheck, permission: "analysis:read" }],
});
