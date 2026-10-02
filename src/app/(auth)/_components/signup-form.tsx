"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signUp } from "../actions";
import { signupSchema, type SignupValues } from "../schemas";
import { FormError, FormField } from "./form-field";

export function SignupForm() {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = await signUp(values);
      if (!res) return; // redirected
      if (!res.ok) setFormError(res.error);
      else setSentTo(values.email);
    });
  });

  if (sentTo) {
    return (
      <div className="rounded-lg border bg-card p-5" role="status">
        <MailCheck className="size-5 text-brand" aria-hidden />
        <h2 className="mt-3 font-medium">Check your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{sentTo}</span>. Open it on
          this device to activate your account and continue to onboarding.
        </p>
        <Button variant="ghost" size="sm" className="mt-3 -ml-2" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={onSubmit} noValidate className="space-y-4">
      <FormError message={formError} />
      <FormField
        label="Full name"
        autoComplete="name"
        placeholder="Ada Lovelace"
        autoFocus
        error={errors.fullName?.message}
        {...register("fullName")}
      />
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        error={errors.password?.message}
        {...register("password")}
      />
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
