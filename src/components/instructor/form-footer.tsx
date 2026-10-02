"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Sticky-ish footer with submit button + keyboard hint. */
export function FormFooter({
  pending,
  label = "Save",
  pendingLabel = "Saving…",
  className,
  children,
}: {
  pending: boolean;
  label?: string;
  pendingLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      <span className="mr-auto hidden font-mono text-[11px] text-muted-foreground sm:inline">⌘/Ctrl + Enter to save</span>
      {children}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? pendingLabel : label}
      </Button>
    </div>
  );
}
