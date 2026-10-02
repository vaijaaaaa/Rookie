"use client";

import { useState, useTransition } from "react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updatePlatformSettings, type SettingsInput } from "@/app/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

function Row({
  title,
  description,
  htmlFor,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_minmax(0,20rem)] sm:gap-6">
      <div>
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {title}
        </Label>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex items-start sm:justify-end">{children}</div>
    </div>
  );
}

export function SettingsForm({ initial, timezones }: { initial: SettingsInput; timezones: string[] }) {
  const [values, setValues] = useState<SettingsInput>(initial);
  const [saved, setSaved] = useState<SettingsInput>(initial);
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function set<K extends keyof SettingsInput>(key: K, value: SettingsInput[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updatePlatformSettings(values);
      if (res.ok) {
        setSaved(values);
        toast.success(res.message ?? "Settings saved");
      } else {
        toast.error(res.error);
      }
    });
  }

  const tzOptions = timezones.includes(values.default_timezone) ? timezones : [values.default_timezone, ...timezones];

  return (
    <form onSubmit={onSubmit} className="rounded-lg border bg-card">
      <div className="divide-y px-4 py-4">
        <Row title="Site name" description="Shown in the header, emails and page titles." htmlFor="site_name">
          <Input
            id="site_name"
            value={values.site_name}
            maxLength={60}
            onChange={(e) => set("site_name", e.target.value)}
            required
          />
        </Row>
        <Row
          title="Allow signups"
          htmlFor="allow_signups"
          description={
            <span className="inline-flex items-start gap-1">
              <Info className="mt-px size-3 shrink-0" />
              Advisory only. To actually block new accounts, disable signups in Supabase Auth settings.
            </span>
          }
        >
          <Switch
            id="allow_signups"
            checked={values.allow_signups}
            onCheckedChange={(c) => set("allow_signups", c)}
          />
        </Row>
        <Row
          title="Default timezone"
          description="Used for new profiles and for scheduling when a user has no timezone."
          htmlFor="default_timezone"
        >
          <NativeSelect
            id="default_timezone"
            value={values.default_timezone}
            onChange={(e) => set("default_timezone", e.target.value)}
          >
            {tzOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </NativeSelect>
        </Row>
        <Row
          title="Announcement banner"
          description="Optional site-wide message. Leave empty to hide. Max 280 characters."
          htmlFor="announcement_banner"
        >
          <div className="w-full">
            <Textarea
              id="announcement_banner"
              value={values.announcement_banner}
              maxLength={280}
              rows={3}
              placeholder="e.g. Live class schedule changes this week"
              onChange={(e) => set("announcement_banner", e.target.value)}
            />
            <p className="mt-1 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
              {values.announcement_banner.length}/280
            </p>
          </div>
        </Row>
        <Row
          title="Maintenance mode"
          description="Flag for showing a maintenance notice to non-admin users."
          htmlFor="maintenance_mode"
        >
          <Switch
            id="maintenance_mode"
            checked={values.maintenance_mode}
            onCheckedChange={(c) => set("maintenance_mode", c)}
          />
        </Row>
      </div>
      <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
        {dirty ? <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span> : null}
        <Button type="button" variant="ghost" size="sm" disabled={!dirty || pending} onClick={() => setValues(saved)}>
          Reset
        </Button>
        <Button type="submit" variant="brand" size="sm" disabled={!dirty || pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Save changes
        </Button>
      </div>
    </form>
  );
}
