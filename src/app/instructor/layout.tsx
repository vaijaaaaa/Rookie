import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth/session";

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireRole(["instructor", "admin"]);
  return <AppShell profile={profile}>{children}</AppShell>;
}
