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

/** Authenticated application chrome: sidebar + topbar + content + mobile nav. */
export async function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)
    .overrideTypes<Notification[], { merge: false }>();

  const home = homeForRole(profile.role);

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
            <MobileSidebar role={profile.role} />
            <div className="flex-1">
              <CommandMenu role={profile.role} />
            </div>
            <ThemeToggle />
            <NotificationBell userId={profile.id} initial={notifications ?? []} />
            <UserMenu profile={profile} />
          </header>
          <main className="flex-1 px-4 pt-6 pb-24 md:px-6 md:pb-10 lg:px-8">{children}</main>
        </div>
        <MobileBottomNav role={profile.role} />
      </div>
    </TooltipProvider>
  );
}
