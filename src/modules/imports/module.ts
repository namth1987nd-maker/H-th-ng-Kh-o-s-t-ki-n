import { Layers, Upload } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "imports",
  name: "Nhập dữ liệu",
  description: "Nhập file Google Form: nhận diện cột Đối tượng và câu hỏi đánh số, xem trước, lưu theo lô, hoàn tác",
  enabled: true,
  nav: [
    { group: "data", order: 10, href: "/nhap-du-lieu", label: "Nhập dữ liệu", icon: Upload, permission: "import:write" },
    { group: "data", order: 20, href: "/lo-nhap", label: "Lô nhập", icon: Layers, permission: "import:write" },
  ],
});
