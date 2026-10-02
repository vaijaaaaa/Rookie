import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";

/** Signed-in only. Students who haven't onboarded are sent to /onboarding. */
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (profile.role === "student" && !profile.onboarded_at) redirect("/onboarding");
  return children;
}
