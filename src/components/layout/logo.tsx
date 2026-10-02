import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex size-6 items-center justify-center rounded-md bg-brand font-mono text-xs font-bold text-brand-foreground">
        {">_"}
      </span>
      <span>rookie</span>
    </Link>
  );
}
