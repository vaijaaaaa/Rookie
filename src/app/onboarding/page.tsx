import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/layout/logo";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireProfile } from "@/lib/auth/session";
import { landingFor } from "@/app/auth/_lib/redirects";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingPage() {
  const profile = await requireProfile();
  if (profile.onboarded_at || profile.role !== "student") redirect(landingFor(profile));

  const firstName = profile.full_name.split(/\s+/)[0] || "there";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4 sm:px-6">
        <Logo href="/" />
        <ThemeToggle />
      </header>
      <main id="main" className="flex flex-1 justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-2xl">
          <OnboardingWizard firstName={firstName} />
        </div>
      </main>
    </div>
  );
}
