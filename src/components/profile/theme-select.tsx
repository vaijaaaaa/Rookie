"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

const subscribe = () => () => {};

/** Radio group for light / dark / system theme (stored by next-themes in localStorage). */
export function ThemeSelect() {
  const { theme, setTheme } = useTheme();
  // Theme is only known on the client; avoid a hydration mismatch.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = mounted ? (theme ?? "system") : null;

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-3 gap-2 sm:max-w-md">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const checked = current === value;
          return (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-card px-3 py-4 text-sm transition-colors",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
                checked ? "border-brand/60 bg-brand/5" : "hover:border-foreground/20",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={checked}
                onChange={() => setTheme(value)}
                className="sr-only"
              />
              <Icon className={cn("size-5", checked ? "text-brand" : "text-muted-foreground")} aria-hidden />
              <span className={checked ? "font-medium" : "text-muted-foreground"}>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
