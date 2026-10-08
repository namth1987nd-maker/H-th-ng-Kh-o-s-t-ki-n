"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GraduationCap, LogOut, Menu, X } from "lucide-react";
import type { Role } from "@/core/lib/rbac";
import { cn } from "@/core/lib/utils";
import { AppNav } from "./app-nav";

interface Props {
  user: { name: string; role: Role; roleLabel: string };
  authDisabled: boolean;
  onSignOut?: () => Promise<void>;
  children: React.ReactNode;
}

/**
 * Khung giao diện 3 phần:
 *  ┌──────────────── header ────────────────┐
 *  │ sidebar │          nội dung            │
 *  └─────────┴──────────────────────────────┘
 * Màn hình nhỏ (< lg): sidebar ẩn, mở bằng nút ☰ trên header.
 */
export function AppShell({ user, authDisabled, onSignOut, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // đóng menu trên điện thoại sau khi chuyển trang
  useEffect(() => setOpen(false), [pathname]);

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-background">
      {/* ───── Header ───── */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded p-2 text-muted hover:bg-slate-100 lg:hidden"
          aria-label={open ? "Đóng menu" : "Mở menu"}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link href="/tong-quan" className="flex min-w-0 items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap size={18} />
          </span>
          <span className="truncate font-semibold">Khảo sát lấy ý kiến phản hồi</span>
        </Link>
        <span className="hidden truncate text-sm text-muted xl:inline">· Kiểm định &amp; bảo đảm chất lượng</span>

        <div className="ml-auto flex items-center gap-3">
          {authDisabled && (
            <span className="hidden rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 sm:inline">
              Chưa bật đăng nhập
            </span>
          )}
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted">{user.roleLabel}</p>
          </div>
          <span className="grid size-8 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
            {initials || "?"}
          </span>
          {onSignOut && (
            <form action={onSignOut}>
              <button className="rounded p-2 text-muted hover:bg-slate-100" title="Đăng xuất" aria-label="Đăng xuất">
                <LogOut size={18} />
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="flex">
        {/* nền mờ khi mở menu trên điện thoại */}
        {open && (
          <div className="fixed inset-0 top-14 z-20 bg-slate-900/30 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
        )}

        {/* ───── Sidebar ───── */}
        <aside
          className={cn(
            "fixed bottom-0 left-0 top-14 z-20 w-64 shrink-0 overflow-y-auto border-r border-border bg-card transition-transform duration-200",
            "lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <AppNav role={user.role} />
        </aside>

        {/* ───── Nội dung ───── */}
        <main className="min-w-0 flex-1 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
