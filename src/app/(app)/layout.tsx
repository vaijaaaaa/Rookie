import { AppShell } from "@/components/layout/app-shell";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { getProfile } from "@/lib/auth/session";

/**
 * Hybrid layout: catalog pages (/roadmaps, /courses, /classes) are public.
 * Signed-in users get the app shell; visitors get the marketing chrome.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (profile) return <AppShell profile={profile}>{children}</AppShell>;
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}
