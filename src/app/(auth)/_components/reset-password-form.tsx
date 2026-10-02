"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updatePassword } from "../actions";
import { resetPasswordSchema, type ResetPasswordValues } from "../schemas";
import { FormError, FormField } from "./form-field";

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = await updatePassword(values);
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      toast.success(res.message ?? "Password updated");
      router.replace(res.data?.redirectTo ?? "/dashboard");
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <FormField
        label="New password"
        type="password"
        autoComplete="new-password"
        autoFocus
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
        {...register("password")}
      />
      <FormField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={errors.confirm?.message}
        {...register("confirm")}
      />
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
