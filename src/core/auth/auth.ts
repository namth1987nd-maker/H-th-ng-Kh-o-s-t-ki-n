import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import { authConfig } from "./auth.config";
import { verifyPassword } from "./password";
import { db } from "@/core/db";
import type { Role } from "@/core/lib/rbac";

async function findActiveUser(email: string) {
  return db()
    .selectFrom("app_user")
    .select(["id", "email", "full_name", "role", "unit_id", "password_hash"])
    .where((eb) => eb(eb.fn("lower", ["email"]), "=", email.toLowerCase().trim()))
    .where("active", "=", true)
    .executeTakeFirst();
}

const providers: Provider[] = [
  // Đăng nhập nội bộ: email + mật khẩu (băm scrypt trong app_user.password_hash)
  Credentials({
    id: "password",
    name: "Email và mật khẩu",
    credentials: { email: { label: "Email" }, password: { label: "Mật khẩu", type: "password" } },
    async authorize(credentials) {
      const user = await findActiveUser(String(credentials?.email ?? ""));
      if (!user || !verifyPassword(String(credentials?.password ?? ""), user.password_hash)) return null;
      return { id: String(user.id), email: user.email, name: user.full_name };
    },
  }),
];
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);
if (process.env.AUTH_MICROSOFT_ENTRA_ID_ID) providers.push(MicrosoftEntraId);

// Đăng nhập nhanh bằng email có trong app_user. CHỈ để phát triển, tuyệt đối không bật ở production.
if (process.env.ENABLE_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production") {
  providers.push(
    Credentials({
      id: "dev",
      name: "Đăng nhập thử (dev)",
      credentials: { email: { label: "Email" } },
      async authorize(credentials) {
        const user = await findActiveUser(String(credentials?.email ?? ""));
        return user ? { id: String(user.id), email: user.email, name: user.full_name } : null;
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    // Chỉ tài khoản có trong app_user (và đang hoạt động) mới vào được
    async signIn({ user }) {
      return !!user.email && !!(await findActiveUser(user.email));
    },
    // Vai trò và phạm vi đơn vị đọc từ DB, gắn vào JWT khi đăng nhập
    async jwt({ token, user }) {
      if (user?.email) {
        const row = await findActiveUser(user.email);
        if (row) {
          token.uid = row.id;
          token.role = row.role as Role;
          token.unitId = row.unit_id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = String(token.uid ?? "");
      session.user.role = token.role as Role;
      session.user.unitId = (token.unitId as number | null) ?? null;
      return session;
    },
  },
});
