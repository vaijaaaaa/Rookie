"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createUser } from "@/app/admin/users/actions";
import { generatePassword, PasswordField } from "./password-field";

/** Admins create accounts; there is no public signup. */
export function AddUserDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [password, setPassword] = useState("");

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setFullName("");
      setEmail("");
      setRole("student");
      setPassword(generatePassword());
      setError(null);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createUser({ fullName, email, role, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success(res.message ?? "User created", {
        description: `Share the login email and password with ${fullName.split(" ")[0]} securely.`,
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <UserPlus /> Add user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} method="post" className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Add a user</DialogTitle>
            <DialogDescription>
              The account is active immediately. Copy the password now and share it securely — they can change it in Settings.
            </DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="nu-name">Full name</Label>
            <Input id="nu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} maxLength={80} autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nu-email">Email</Label>
            <Input id="nu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nu-role">Role</Label>
            <NativeSelect id="nu-role" value={role} onChange={(e) => setRole(e.target.value as "student" | "admin")}>
              <option value="student">Student — learns, attends, submits work</option>
              <option value="admin">Admin — teaches and manages the platform</option>
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="nu-password">Temporary password</Label>
            <PasswordField id="nu-password" value={password} onChange={setPassword} />
          </div>
          <DialogFooter>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <UserPlus />} Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
