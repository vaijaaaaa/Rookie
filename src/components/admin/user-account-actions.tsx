"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { deleteUser, resetUserPassword } from "@/app/admin/users/actions";
import { generatePassword, PasswordField } from "./password-field";

/** Reset password + delete account, for the user detail page. */
export function UserAccountActions({ userId, userName, isSelf }: { userId: string; userName: string; isSelf: boolean }) {
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function savePassword(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await resetUserPassword({ userId, password });
      if (!res.ok) return void toast.error(res.error);
      toast.success("Password updated", { description: `Share the new password with ${userName} securely.` });
      setPwOpen(false);
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await deleteUser(userId);
      if (!res.ok) return void toast.error(res.error);
      toast.success(`${userName} was deleted`);
      setDelOpen(false);
      router.push("/admin/users");
      router.refresh();
    });
  }

  return (
    <>
      <Dialog
        open={pwOpen}
        onOpenChange={(o) => {
          setPwOpen(o);
          if (o) setPassword(generatePassword());
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline"><KeyRound /> Reset password</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={savePassword} method="post" className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
              <DialogDescription>Set a new password for {userName}. Their current password stops working immediately.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="rp-password">New password</Label>
              <PasswordField id="rp-password" value={password} onChange={setPassword} />
            </div>
            <DialogFooter>
              <Button type="submit" variant="brand" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null} Update password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isSelf ? null : (
        <Dialog open={delOpen} onOpenChange={setDelOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="text-destructive"><Trash2 /> Delete</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete {userName}?</DialogTitle>
              <DialogDescription>
                This permanently deletes the account and all of its progress, submissions, attendance and notes. It can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" disabled={pending}>Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={remove} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Delete account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
