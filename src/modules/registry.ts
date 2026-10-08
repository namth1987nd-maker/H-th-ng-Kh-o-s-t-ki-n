// ĐĂNG KÝ MODULE — nơi duy nhất cần sửa khi thêm/bỏ một module khỏi menu.
// Client-safe: chỉ import module.ts (manifest), không import server code.
import { NAV_GROUPS, type ModuleManifest, type NavGroupId, type NavLink } from "@/core/module";
import { can, type Role } from "@/core/lib/rbac";

import dashboard from "./dashboard/module";
import forms from "./forms/module";
import imports from "./imports/module";
import subjects from "./subjects/module";
import results from "./results/module";
import sampling from "./sampling/module";
import alerts from "./alerts/module";
import pdca from "./pdca/module";
import reports from "./reports/module";
import settings from "./settings/module";

export const MODULES: readonly ModuleManifest[] = [
  dashboard,
  forms,
  imports,
  subjects,
  results,
  sampling,
  alerts,
  pdca,
  reports,
  settings,
];

export const enabledModules = () => MODULES.filter((m) => m.enabled);

/** Menu sidebar theo vai trò: gom nav của mọi module bật, chia nhóm, sắp theo order, lọc quyền. */
export function buildNav(role: Role): { id: NavGroupId; title?: string; items: NavLink[] }[] {
  const items = enabledModules()
    .flatMap((m) => m.nav)
    .filter((n) => !n.permission || can(role, n.permission));

  return NAV_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    items: items.filter((n) => n.group === g.id).sort((a, b) => a.order - b.order),
  })).filter((g) => g.items.length > 0);
}
