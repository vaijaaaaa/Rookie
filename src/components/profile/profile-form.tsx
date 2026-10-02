"use client";

import { useId, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LABELS } from "@/lib/utils/format";
import { updateProfile } from "@/app/(app)/(protected)/settings/actions";
import { COMMON_TIMEZONES, GOAL_VALUES, profileSchema, type ProfileValues } from "./schemas";

function Field({
  label,
  error,
  hint,
  children,
  id,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ProfileForm({ defaultValues }: { defaultValues: ProfileValues }) {
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema), defaultValues });

  const [avatarUrl, fullName, bio] = useWatch({ control, name: ["avatar_url", "full_name", "bio"] });

  const timezones: string[] = COMMON_TIMEZONES.includes(defaultValues.timezone as (typeof COMMON_TIMEZONES)[number])
    ? [...COMMON_TIMEZONES]
    : [defaultValues.timezone, ...COMMON_TIMEZONES];

  const ids = {
    name: `${uid}-name`,
    username: `${uid}-username`,
    bio: `${uid}-bio`,
    avatar: `${uid}-avatar`,
    tz: `${uid}-tz`,
    goal: `${uid}-goal`,
  };
  const describe = (id: string, hasError: boolean, hasHint = false) =>
    hasError ? `${id}-error` : hasHint ? `${id}-hint` : undefined;

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const res = await updateProfile(values);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "Saved");
      reset(values);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="flex items-center gap-4">
        <UserAvatar name={fullName} src={avatarUrl && /^https:\/\//.test(avatarUrl) ? avatarUrl : null} className="size-14" />
        <div className="min-w-0 flex-1">
          <Field id={ids.avatar} label="Avatar URL" error={errors.avatar_url?.message} hint="Link to a square image (https).">
            <Input
              id={ids.avatar}
              type="url"
              inputMode="url"
              placeholder="https://…"
              aria-invalid={errors.avatar_url ? true : undefined}
              aria-describedby={describe(ids.avatar, !!errors.avatar_url, true)}
              {...register("avatar_url")}
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.name} label="Full name" error={errors.full_name?.message}>
          <Input
            id={ids.name}
            autoComplete="name"
            aria-invalid={errors.full_name ? true : undefined}
            aria-describedby={describe(ids.name, !!errors.full_name)}
            {...register("full_name")}
          />
        </Field>
        <Field id={ids.username} label="Username" error={errors.username?.message} hint="Lowercase letters, numbers, underscores.">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 font-mono text-sm text-muted-foreground">
              @
            </span>
            <Input
              id={ids.username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              className="pl-7 font-mono"
              aria-invalid={errors.username ? true : undefined}
              aria-describedby={describe(ids.username, !!errors.username, true)}
              {...register("username")}
            />
          </div>
        </Field>
      </div>

      <Field id={ids.bio} label="Bio" error={errors.bio?.message} hint={`${bio?.length ?? 0}/280`}>
        <Textarea
          id={ids.bio}
          rows={3}
          placeholder="What are you learning and why?"
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={describe(ids.bio, !!errors.bio, true)}
          {...register("bio")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.goal} label="Learning goal" error={errors.learning_goal?.message}>
          <NativeSelect id={ids.goal} {...register("learning_goal")}>
            <option value="">Not set</option>
            {GOAL_VALUES.map((g) => (
              <option key={g} value={g}>
                {LABELS.learning_goal[g]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id={ids.tz} label="Timezone" error={errors.timezone?.message}>
          <NativeSelect id={ids.tz} {...register("timezone")}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz.replace(/_/g, " ")}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" disabled={!isDirty || pending} onClick={() => reset(defaultValues)}>
          Reset
        </Button>
        <Button type="submit" variant="brand" disabled={!isDirty || pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
