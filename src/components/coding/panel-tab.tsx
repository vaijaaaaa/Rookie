"use client";

import { cn } from "@/lib/utils";

/** Underlined tab button used by the workspace panels (role="tab"). */
export function PanelTab({
  active,
  onSelect,
  children,
  controls,
  id,
}: {
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  controls?: string;
  id?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const list = e.currentTarget.parentElement;
        const tabs = list ? Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]')) : [];
        const i = tabs.indexOf(e.currentTarget);
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next?.focus();
        next?.click();
        e.preventDefault();
      }}
      className={cn(
        "relative inline-flex h-9 shrink-0 items-center gap-1.5 px-1 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:text-foreground focus-visible:underline",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        active && "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand",
      )}
    >
      {children}
    </button>
  );
}
