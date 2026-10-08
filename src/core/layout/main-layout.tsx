import { redirect } from "next/navigation";
import { signOut } from "@/core/auth/auth";
import { getCurrentUser, isAuthDisabled, ROLE_LABEL } from "@/core/auth/session";
import { AppShell } from "./app-shell";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/dang-nhap");
  const authDisabled = await isAuthDisabled();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/dang-nhap" });
  }

  return (
    <AppShell
      user={{ name: user.name, role: user.role, roleLabel: ROLE_LABEL[user.role] ?? user.role }}
      authDisabled={authDisabled}
      onSignOut={authDisabled ? undefined : doSignOut}
    >
      {children}
    </AppShell>
  );
}
