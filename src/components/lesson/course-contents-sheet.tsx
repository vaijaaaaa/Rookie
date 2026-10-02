"use client";

import { useState } from "react";
import { ListTree } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Mobile drawer wrapping the server-rendered course outline. Closes when a
 * link inside is clicked.
 */
export function CourseContentsSheet({
  courseTitle,
  progressLabel,
  children,
}: {
  courseTitle: string;
  progressLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <ListTree /> Course contents
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80" aria-describedby={undefined}>
        <div className="border-b px-4 py-3 pr-10">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Course contents</p>
          <SheetTitle className="mt-0.5 truncate text-sm font-semibold">{courseTitle}</SheetTitle>
          {progressLabel ? <p className="mt-0.5 font-mono text-xs text-muted-foreground">{progressLabel}</p> : null}
        </div>
        <div
          className="flex-1 overflow-y-auto p-2"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
