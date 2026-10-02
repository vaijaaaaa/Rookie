import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireRole } from "@/lib/auth/session";
import { timeAgo } from "@/lib/utils/format";
import { getPlatformSettings } from "@/services/admin";

export const metadata = { title: "Platform settings" };

function timezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["UTC"];
  }
}

export default async function AdminSettingsPage() {
  await requireRole(["admin"]);
  const { settings, updatedAt } = await getPlatformSettings();
  const tzs = timezones();
  const zones = tzs.includes("UTC") ? tzs : ["UTC", ...tzs];

  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        eyebrow="Admin"
        title="Platform settings"
        description={updatedAt ? `Last updated ${timeAgo(updatedAt)}` : "Using defaults — nothing saved yet."}
      />
      <SettingsForm initial={settings} timezones={zones} />
    </div>
  );
}
