import type { NextAuthConfig } from "next-auth";

// Phần cấu hình không phụ thuộc DB. Chặn truy cập nằm ở core/layout/main-layout.tsx (getCurrentUser).
export const authConfig = {
  pages: { signIn: "/dang-nhap" },
  session: { strategy: "jwt" },
  providers: [],
} satisfies NextAuthConfig;
