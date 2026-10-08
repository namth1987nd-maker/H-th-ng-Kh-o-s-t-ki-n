import { defineJob } from "@/core/module";

export const reportsJobs = [
  defineJob<{ reportType: string; yearId: number; format: "docx" | "xlsx" | "pdf" }>({
    name: "reports-export",
    async handler() {
      throw new Error("reports-export chưa cài đặt (cần mẫu .docx, xem templates/README.md)");
    },
  }),
];
