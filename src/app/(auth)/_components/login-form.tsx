"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInWithPassword } from "../actions";
import { loginSchema, type LoginValues } from "../schemas";
import { FormError, FormField } from "./form-field";

export function LoginForm({ next }: { next?: string }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", next },
  });

  const onSubmit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const res = await signInWithPassword({ ...values, next });
      if (res && !res.ok) setFormError(res.error);
    });
  });

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
      <FormField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        labelAction={
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        }
        {...register("password")}
      />
      <Button type="submit" variant="brand" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Log in"}
      </Button>
    </form>
  );
}
