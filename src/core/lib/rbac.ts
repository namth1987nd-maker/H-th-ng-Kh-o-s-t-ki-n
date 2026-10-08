export type Role = "ADMIN" | "OFFICER" | "LEADER" | "VIEWER";

export type Permission =
  | "import:write"
  | "analysis:read"
  | "staff-detail:read" // kết quả từng giảng viên (nhạy cảm)
  | "report:create"
  | "pdca:write"
  | "config:write"
  | "user:write";

const MATRIX: Record<Role, readonly Permission[]> = {
  ADMIN: ["import:write", "analysis:read", "staff-detail:read", "report:create", "pdca:write", "config:write", "user:write"],
  OFFICER: ["import:write", "analysis:read", "staff-detail:read", "report:create", "pdca:write"],
  LEADER: ["analysis:read", "staff-detail:read", "report:create"],
  VIEWER: ["analysis:read"], // chỉ phạm vi đơn vị của mình
};

export function can(role: Role | undefined, permission: Permission): boolean {
  return !!role && MATRIX[role].includes(permission);
}

/** Viewer chỉ xem trong phạm vi đơn vị; các vai trò khác xem toàn trường. */
export function scopeUnitId(role: Role, unitId: number | null): number | null {
  return role === "VIEWER" ? unitId : null;
}
