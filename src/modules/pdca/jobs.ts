import { defineJob } from "@/core/module";
import { generatePdcaBelowThreshold } from "./server/queries";

export const pdcaJobs = [
  defineJob<{ yearId: number }>({
    name: "pdca-generate",
    async handler({ yearId }) {
      const created = await generatePdcaBelowThreshold(yearId);
      console.log(`[pdca-generate] năm ${yearId}: ${created} hành động mới`);
    },
  }),
];
