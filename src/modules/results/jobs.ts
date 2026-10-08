import { defineJob } from "@/core/module";
import { refreshViews } from "./server/queries";

export const RESULTS_REFRESH_VIEWS = "results-refresh-views";

export const resultsJobs = [
  // Làm mới view tổng hợp, rồi báo cho module PDCA sinh cảnh báo (không import trực tiếp module pdca)
  defineJob<{ yearId?: number }>({
    name: RESULTS_REFRESH_VIEWS,
    async handler(data, ctx) {
      await refreshViews();
      if (data.yearId) await ctx.send("pdca-generate", { yearId: data.yearId });
    },
  }),
];
