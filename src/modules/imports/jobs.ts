import type { JobDefinition } from "@/core/module";

// Nhập dữ liệu hiện chạy trực tiếp trong Server Action (một transaction). Khi file quá lớn
// cần chuyển sang chạy nền thì khai báo job "imports-commit" ở đây.
export const importsJobs: JobDefinition[] = [];
