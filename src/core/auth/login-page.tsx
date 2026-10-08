import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "./auth";
import { isAuthDisabled } from "./session";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ loi?: string }> }) {
  if ((await isAuthDisabled()) || (await auth())) redirect("/tong-quan");
  const { loi } = await searchParams;

  const sso = [
    process.env.AUTH_GOOGLE_ID ? { id: "google", label: "Đăng nhập bằng Google" } : null,
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID ? { id: "microsoft-entra-id", label: "Đăng nhập bằng Microsoft" } : null,
  ].filter((p): p is { id: string; label: string } => p !== null);

  const devLogin = process.env.ENABLE_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Đăng nhập</h1>
      {loi && <p className="rounded border border-danger/30 bg-danger/5 p-3 text-sm text-danger">Sai email hoặc mật khẩu, hoặc tài khoản không có quyền truy cập.</p>}

      <form
        className="flex flex-col gap-2"
        action={async (fd: FormData) => {
          "use server";
          try {
            await signIn("password", { email: String(fd.get("email")), password: String(fd.get("password")), redirectTo: "/tong-quan" });
          } catch (e) {
            if (e instanceof AuthError) redirect("/dang-nhap?loi=1");
            throw e; // redirect của Next cũng là exception, phải ném lại
          }
        }}
      >
        <input name="email" type="email" required placeholder="Email" autoComplete="username" className="rounded border border-border px-3 py-2" />
        <input name="password" type="password" required placeholder="Mật khẩu" autoComplete="current-password" className="rounded border border-border px-3 py-2" />
        <button className="rounded bg-primary px-4 py-2 text-primary-foreground">Đăng nhập</button>
      </form>

      {sso.map((p) => (
        <form key={p.id} action={async () => { "use server"; await signIn(p.id, { redirectTo: "/tong-quan" }); }}>
          <button className="w-full rounded bg-primary px-4 py-2 text-primary-foreground">{p.label}</button>
        </form>
      ))}

      {devLogin && (
        <form
          className="flex flex-col gap-2 rounded border border-dashed border-border p-4"
          action={async (fd: FormData) => {
            "use server";
            try {
              await signIn("dev", { email: String(fd.get("email")), redirectTo: "/tong-quan" });
            } catch (e) {
              if (e instanceof AuthError) redirect("/dang-nhap?loi=1");
              throw e;
            }
          }}
        >
          <label className="text-sm text-muted" htmlFor="email">Đăng nhập thử (chỉ môi trường phát triển)</label>
          <input id="email" name="email" type="email" required placeholder="email trong bảng app_user" className="rounded border border-border px-3 py-2" />
          <button className="rounded border border-border px-4 py-2">Vào hệ thống</button>
        </form>
      )}
    </main>
  );
}
