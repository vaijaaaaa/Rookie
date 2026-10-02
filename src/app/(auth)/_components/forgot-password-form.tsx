"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestPasswordReset } from "../actions";
import { forgotPasswordSchema, type ForgotPasswordValues } from "../schemas";
import { FormError, FormField } from "./form-field";

export function ForgotPasswordForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = await requestPasswordReset(values);
      if (!res.ok) setFormError(res.error);
      else setDone(res.message ?? "Check your email.");
    });
  });

  if (done) {
    return (
      <div className="rounded-lg border bg-card p-5" role="status">
        <MailCheck className="size-5 text-brand" aria-hidden />
        <h2 className="mt-3 font-medium">Check your inbox</h2>
        <p className="mt-1 text-sm text-muted-foreground">{done}</p>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        autoFocus
        error={errors.email?.message}
        {...register("email")}
      />
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Send reset link
      </Button>
    </form>
  );
}
