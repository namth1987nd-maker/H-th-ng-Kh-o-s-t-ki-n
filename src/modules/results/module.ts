import { BarChart3 } from "lucide-react";
import { defineModule } from "@/core/module";
import { FIELDS } from "./domain/fields";

export default defineModule({
  id: "results",
  name: "Kết quả trả lời",
  description: "Kết quả khảo sát theo 8 lĩnh vực: tiêu chí, phân phối 5 mức, so sánh năm học",
  enabled: true,
  nav: [
    {
      group: "analysis",
      order: 10,
      href: "/linh-vuc",
      label: "Lĩnh vực",
      icon: BarChart3,
      permission: "analysis:read",
      children: FIELDS.map((f) => ({ href: `/linh-vuc/${f.code}`, label: `${f.id}. ${f.name}` })),
    },
  ],
});
