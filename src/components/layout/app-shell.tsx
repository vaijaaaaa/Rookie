import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandMenu } from "./command-menu";
import { Logo } from "./logo";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationBell } from "./notification-bell";
import { MobileBottomNav, SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import type { Notification, Profile } from "@/types";
import { homeForRole } from "@/lib/auth/session";
import { getShellSettings } from "@/lib/settings";
import { Megaphone, Wrench } from "lucide-react";

/** Authenticated application chrome: sidebar + topbar + content + mobile nav. */
export async function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const supabase = await createClient();
  const settingsPromise = getShellSettings();
  const [{ data: notifications }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .overrideTypes<Notification[], { merge: false }>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .is("read_at", null),
  ]);

  const home = homeForRole(profile.role);
  const settings = await settingsPromise;
  const blocked = settings.maintenanceMode && profile.role !== "admin";

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
          <div className="flex h-14 items-center border-b px-5">
            <Logo href={home} />
          </div>
          <SidebarNav role={profile.role} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur md:px-6">
            <MobileSidebar role={profile.role} home={home} />
            <div className="flex-1">
              <CommandMenu role={profile.role} />
            </div>
            <ThemeToggle />
            <NotificationBell userId={profile.id} initial={notifications ?? []} unreadCount={unreadCount ?? 0} />
            <UserMenu profile={profile} />
          </header>
          {settings.announcementBanner ? (
            <div role="status" className="flex items-start gap-2 border-b bg-brand/10 px-4 py-2 text-sm md:px-6">
              <Megaphone className="mt-0.5 size-4 shrink-0 text-brand" />
              <p className="min-w-0">{settings.announcementBanner}</p>
            </div>
          ) : null}
          {settings.maintenanceMode && profile.role === "admin" ? (
            <div role="status" className="flex items-center gap-2 border-b bg-warning/10 px-4 py-2 text-sm md:px-6">
              <Wrench className="size-4 shrink-0 text-warning" />
              Maintenance mode is on — students currently see a maintenance screen.
            </div>
          ) : null}
          <main className="flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10 lg:px-8">
            {blocked ? (
              <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-lg border bg-muted/50">
                  <Wrench className="size-6 text-muted-foreground" />
                </div>
                <h1 className="text-xl font-semibold tracking-tight">We&apos;ll be right back</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Rookie is down for scheduled maintenance. Your progress is safe — please check back shortly.
                </p>
              </div>
            ) : (
              children
            )}
          </main>
        </div>
        <MobileBottomNav role={profile.role} />
      </div>
    </TooltipProvider>
  );
}
