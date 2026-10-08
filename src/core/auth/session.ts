import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "./auth";
import { can, type Permission, type Role } from "@/core/lib/rbac";

export interface CurrentUser {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  unitId: number | null;
}

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Quản trị",
  OFFICER: "Cán bộ",
  LEADER: "Lãnh đạo",
  VIEWER: "Người xem",
};

/** AUTH_DISABLED=true: bỏ qua đăng nhập (giai đoạn phát triển). Đọc lúc chạy, không đóng băng lúc build. */
export async function isAuthDisabled(): Promise<boolean> {
  await connection();
  return process.env.AUTH_DISABLED === "true";
}

const GUEST: CurrentUser = { id: "0", name: "Khách", email: null, role: "ADMIN", unitId: null };

/** Người dùng hiện tại; null = chưa đăng nhập. Khi tắt đăng nhập, trả tài khoản khách quyền ADMIN. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (await isAuthDisabled()) return GUEST;
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? session.user.email ?? "",
    email: session.user.email ?? null,
    role: session.user.role,
    unitId: session.user.unitId,
  };
}

/** Dùng đầu mỗi trang/Server Action cần quyền: chưa đăng nhập → /dang-nhap, thiếu quyền → 404. */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  if (!can(user.role, permission)) notFound();
  return user;
}
