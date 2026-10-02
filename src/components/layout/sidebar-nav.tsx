"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav-config";
import type { UserRole } from "@/types";

export function SidebarNav({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const nav = NAV[role];

  const renderItem = (item: (typeof nav.main)[number]) => {
    const active = isActive(pathname, item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            active && "bg-accent font-medium text-foreground",
          )}
        >
          <item.icon className={cn("size-4", active && "text-brand")} />
          {item.title}
        </Link>
      </li>
    );
  };

  return (
    <nav className="flex flex-1 flex-col justify-between gap-4 overflow-y-auto px-3 py-3" aria-label="Main">
      <ul className="space-y-0.5">{nav.main.map(renderItem)}</ul>
      <ul className="space-y-0.5 border-t pt-3">{nav.footer.map(renderItem)}</ul>
    </nav>
  );
}

export function MobileBottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV[role].main.filter((i) => i.mobile).slice(0, 5);
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 grid border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-[10px] text-muted-foreground",
              active && "text-foreground",
            )}
          >
            <item.icon className={cn("size-5", active && "text-brand")} />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
