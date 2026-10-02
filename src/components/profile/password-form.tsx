"use client";

import { useId, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/app/(app)/(protected)/settings/actions";
import { passwordSchema, type PasswordValues } from "./schemas";

export function PasswordForm() {
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { password: "", confirm: "" } });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await changePassword(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Password updated");
      reset();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-pw`}>New password</Label>
          <Input
            id={`${uid}-pw`}
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? `${uid}-pw-error` : `${uid}-pw-hint`}
            {...register("password")}
          />
          {errors.password ? (
            <p id={`${uid}-pw-error`} role="alert" className="text-xs text-destructive">
              {errors.password.message}
            </p>
          ) : (
            <p id={`${uid}-pw-hint`} className="text-xs text-muted-foreground">
              At least 8 characters, with a letter and a number.
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${uid}-confirm`}>Confirm password</Label>
          <Input
            id={`${uid}-confirm`}
            type="password"
            autoComplete="new-password"
            aria-invalid={errors.confirm ? true : undefined}
            aria-describedby={errors.confirm ? `${uid}-confirm-error` : undefined}
            {...register("confirm")}
          />
          {errors.confirm ? (
            <p id={`${uid}-confirm-error`} role="alert" className="text-xs text-destructive">
              {errors.confirm.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end border-t pt-4">
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Update password
        </Button>
      </div>
    </form>
  );
}
