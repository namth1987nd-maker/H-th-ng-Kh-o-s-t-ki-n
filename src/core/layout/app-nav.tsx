"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { NavLink } from "@/core/module";
import type { Role } from "@/core/lib/rbac";
import { cn } from "@/core/lib/utils";
import { buildNav } from "@/modules/registry";

// Menu KHÔNG khai báo ở đây: mỗi module tự khai báo trong modules/<id>/module.ts,
// sidebar gom lại qua modules/registry.ts.

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

const itemClass = (active: boolean) =>
  cn(
    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
    active ? "bg-primary/10 font-medium text-primary" : "text-slate-700 hover:bg-slate-100",
  );

export function AppNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const groups = buildNav(role);

  return (
    <nav className="flex flex-col gap-5 p-3" aria-label="Menu chính">
      {groups.map((group) => (
        <div key={group.id}>
          {group.title && (
            <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">{group.title}</p>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                {item.children ? (
                  <NavGroup item={item} pathname={pathname} />
                ) : (
                  <Link href={item.href} className={itemClass(isActive(pathname, item.href))}>
                    {item.icon && <item.icon size={18} className="shrink-0" />}
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavGroup({ item, pathname }: { item: NavLink; pathname: string }) {
  const active = isActive(pathname, item.href);
  const [open, setOpen] = useState(active);

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className={itemClass(active && !open)} aria-expanded={open}>
        {item.icon && <item.icon size={18} className="shrink-0" />}
        {item.label}
        <ChevronDown size={16} className={cn("ml-auto transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="ml-[1.35rem] mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
          {item.children!.map((c) => (
            <li key={c.href}>
              <Link
                href={c.href}
                className={cn(
                  "block truncate rounded-md px-3 py-1.5 text-[13px]",
                  pathname === c.href ? "bg-primary/10 font-medium text-primary" : "text-slate-600 hover:bg-slate-100",
                )}
                title={c.label}
              >
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
