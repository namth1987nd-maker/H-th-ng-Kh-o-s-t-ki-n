import { Users } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "subjects",
  name: "Đối tượng",
  description: "Đối tượng khảo sát (mã cố định DTxxxx) và các đợt kết quả trả lời, mỗi lần nhập là một đợt riêng",
  enabled: true,
  nav: [{ group: "data", order: 30, href: "/doi-tuong", label: "Đối tượng", icon: Users, permission: "analysis:read" }],
});
