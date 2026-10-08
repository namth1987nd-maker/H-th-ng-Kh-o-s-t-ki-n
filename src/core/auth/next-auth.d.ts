import type { DefaultSession } from "next-auth";
import type { Role } from "@/core/lib/rbac";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: Role; unitId: number | null } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: number;
    role?: Role;
    unitId?: number | null;
  }
}
