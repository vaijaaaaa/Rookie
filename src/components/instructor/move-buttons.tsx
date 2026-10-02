"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/types";

/** Up/down reorder buttons calling a server action with the direction. */
export function MoveButtons({
  action,
  isFirst,
  isLast,
  label = "item",
}: {
  action: (direction: "up" | "down") => Promise<ActionResult>;
  isFirst: boolean;
  isLast: boolean;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function move(direction: "up" | "down") {
    startTransition(async () => {
      const res = await action(direction);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  }
  return (
    <div className="flex items-center">
      <Button type="button" variant="ghost" size="icon-sm" disabled={isFirst || pending} onClick={() => move("up")} aria-label={`Move ${label} up`}>
        <ArrowUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={isLast || pending} onClick={() => move("down")} aria-label={`Move ${label} down`}>
        <ArrowDown />
      </Button>
    </div>
  );
}
