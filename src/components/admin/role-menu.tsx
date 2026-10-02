"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { setUserRole } from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/types";

const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: "student", label: "Student", hint: "Learns, submits work" },
  { value: "admin", label: "Admin", hint: "Teaches & manages the platform" },
];

/** Change a user's role: dropdown → confirm dialog → server action. */
export function RoleMenu({
  userId,
  userName,
  role,
  isSelf,
  size = "sm",
}: {
  userId: string;
  userName: string;
  role: UserRole;
  isSelf: boolean;
  size?: "sm" | "default";
}) {
  const [target, setTarget] = useState<UserRole | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!target) return;
    const next = target;
    startTransition(async () => {
      const res = await setUserRole({ userId, role: next });
      if (res.ok) {
        toast.success(res.message ?? "Role updated");
        setTarget(null);
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size={size} disabled={pending} aria-label={`Change role for ${userName}`}>
            {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
            Role
            <ChevronDown className="opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Set role
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLE_OPTIONS.map((opt) => {
            const current = opt.value === role;
            const blocked = isSelf && opt.value !== "admin";
            return (
              <DropdownMenuItem
                key={opt.value}
                disabled={current || blocked}
                onSelect={() => setTarget(opt.value)}
              >
                <span className="flex size-4 items-center justify-center">{current ? <Check /> : null}</span>
                <span className="flex flex-col">
                  <span>{opt.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {blocked ? "You cannot demote yourself" : opt.hint}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={target !== null} onOpenChange={(open) => !open && !pending && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role?</DialogTitle>
            <DialogDescription>
              {userName} will become {target === "admin" ? "an" : "a"}{" "}
              <span className="font-medium text-foreground">{target}</span>
              {target === "admin"
                ? " with full access to users, content, classes and settings."
                : " and lose admin access."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="brand" onClick={confirm} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
