import type { Metadata } from "next";
import { PasswordForm } from "@/components/profile/password-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { ThemeSelect } from "@/components/profile/theme-select";
import { PageHeader } from "@/components/shared/page-header";
import { requireProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Settings" };

function SettingsBlock({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t py-8 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr] md:gap-8">
      <div>
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-lg border bg-card p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Account" title="Settings" description="Manage your profile, appearance and security." />

      <SettingsBlock id="settings-profile" title="Profile" description="How you appear to instructors and classmates.">
        <ProfileForm
          defaultValues={{
            full_name: profile.full_name,
            username: profile.username ?? "",
            bio: profile.bio ?? "",
            avatar_url: profile.avatar_url ?? "",
            learning_goal: profile.learning_goal ?? "",
          }}
        />
      </SettingsBlock>

      <SettingsBlock id="settings-appearance" title="Appearance" description="Choose a theme. Saved on this device.">
        <ThemeSelect />
      </SettingsBlock>

      <SettingsBlock
        id="settings-security"
        title="Password"
        description="Signed in with Google? Setting a password also lets you log in with email."
      >
        <div className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Email</p>
          <p className="mt-0.5 text-sm">{profile.email ?? "—"}</p>
        </div>
        <PasswordForm />
      </SettingsBlock>
    </div>
  );
}
