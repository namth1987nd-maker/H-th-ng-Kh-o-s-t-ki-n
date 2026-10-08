import { RefreshCw } from "lucide-react";
import { defineModule } from "@/core/module";

export default defineModule({
  id: "pdca",
  name: "PDCA",
  description: "Theo dõi hành động cải tiến: nguyên nhân, giải pháp, người phụ trách, hạn",
  enabled: true,
  nav: [{ group: "improve", order: 10, href: "/pdca", label: "PDCA", icon: RefreshCw, permission: "analysis:read" }],
});
