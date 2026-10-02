"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/types";
import { toastResult } from "./form-utils";

/**
 * Confirm dialog that runs a (bound) server action. Defaults to a destructive
 * "Delete" icon button trigger.
 */
export function ConfirmAction({
  action,
  title = "Delete this item?",
  description = "This can't be undone.",
  confirmLabel = "Delete",
  successMessage = "Deleted",
  redirectTo,
  trigger,
  destructive = true,
}: {
  action: () => Promise<ActionResult>;
  title?: string;
  description?: string;
  confirmLabel?: string;
  successMessage?: string;
  redirectTo?: string;
  trigger?: React.ReactNode;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    startTransition(async () => {
      const res = await action();
      if (toastResult(res, successMessage)) {
        setOpen(false);
        if (redirectTo) router.push(redirectTo);
        else router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label={confirmLabel} className="text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant={destructive ? "destructive" : "brand"} onClick={run} disabled={pending} autoFocus>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
