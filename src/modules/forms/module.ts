import { ClipboardList } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "forms",
  name: "Phiếu đánh giá",
  description: "Quản lý phiếu đánh giá (thuộc 1 lĩnh vực) và câu hỏi; thống kê số lượng câu trả lời theo từng câu",
  enabled: true,
  nav: [{ group: "data", order: 5, href: "/phieu", label: "Phiếu đánh giá", icon: ClipboardList, permission: "analysis:read" }],
});
