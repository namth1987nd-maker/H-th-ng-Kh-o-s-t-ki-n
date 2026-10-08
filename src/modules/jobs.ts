// ĐĂNG KÝ TÁC VỤ NỀN của các module — worker (src/jobs/worker.ts) đọc danh sách này.
// Server-only: được phép import code chạy DB.
import type { JobDefinition } from "@/core/module";
import { importsJobs } from "./imports/jobs";
import { resultsJobs } from "./results/jobs";
import { pdcaJobs } from "./pdca/jobs";
import { reportsJobs } from "./reports/jobs";

export const JOBS: readonly JobDefinition[] = [...importsJobs, ...resultsJobs, ...pdcaJobs, ...reportsJobs];
