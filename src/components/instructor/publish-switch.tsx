"use client";

import { Controller, type Control, type FieldValues, type Path } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** RHF-bound switch row (e.g. "Published"). */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  description?: string;
}) {
  const id = `switch-${name}`;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-center justify-between gap-4 rounded-md border px-3 py-2.5">
          <div>
            <Label htmlFor={id} className="text-sm">
              {label}
            </Label>
            {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Switch id={id} checked={!!field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
        </div>
      )}
    />
  );
}
