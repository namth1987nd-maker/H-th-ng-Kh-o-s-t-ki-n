// Hợp đồng chung cho mọi module nghiệp vụ (xem src/modules/README.md).
// File này phải "client-safe": không import gì chạy riêng phía server (pg, fs...).
import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/core/lib/rbac";

/** Nhóm menu trên sidebar, theo thứ tự hiển thị. */
export const NAV_GROUPS = [
  { id: "main", title: undefined },
  { id: "data", title: "Dữ liệu" },
  { id: "analysis", title: "Phân tích" },
  { id: "improve", title: "Cải tiến & báo cáo" },
  { id: "system", title: "Hệ thống" },
] as const;
export type NavGroupId = (typeof NAV_GROUPS)[number]["id"];

export interface NavLink {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Mục con (vd. 8 lĩnh vực); khi có, mục cha chỉ để mở/đóng. */
  children?: { href: string; label: string }[];
  /** Quyền tối thiểu để thấy mục này; bỏ trống = ai đăng nhập cũng thấy. */
  permission?: Permission;
}

export interface ModuleNavItem extends NavLink {
  group: NavGroupId;
  /** Thứ tự trong nhóm, nhỏ đứng trước. */
  order: number;
}

export interface ModuleManifest {
  /** Mã module, trùng tên thư mục trong src/modules. */
  id: string;
  name: string;
  description: string;
  /** false = ẩn khỏi menu (route vẫn còn, nên chặn thêm ở trang nếu cần). */
  enabled: boolean;
  nav: ModuleNavItem[];
}

export const defineModule = (m: ModuleManifest): ModuleManifest => m;

/** Tác vụ nền của module, chạy bởi src/jobs/worker.ts (pg-boss). */
export interface JobContext {
  /** Gửi tác vụ khác (kể cả của module khác) mà không import trực tiếp module đó. */
  send: (name: string, data?: object) => Promise<void>;
}

export interface JobDefinition<T extends object = object> {
  /** Tên hàng đợi, quy ước "<module>-<việc>", vd. "results-refresh-views". */
  name: string;
  handler: (data: T, ctx: JobContext) => Promise<void>;
}

export const defineJob = <T extends object>(j: JobDefinition<T>): JobDefinition => j as unknown as JobDefinition;
