import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { postAuthRedirect, safeNextPath } from "@/app/auth/_lib/redirects";
import { AuthHeading, FormError } from "../_components/form-field";
import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  link: "That link is invalid or has expired. Request a new one.",
  confirm: "We couldn't confirm your email. The link may have expired.",
};


export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNextPath(rawNext) ?? undefined;

  const profile = await getProfile();
  if (profile) redirect(postAuthRedirect(profile, next));

  return (
    <>
      <AuthHeading eyebrow="$ rookie login" title="Welcome back" description="Log in to continue where you left off." />
      <div className="mb-4">
        <FormError message={error ? (ERRORS[error] ?? ERRORS.link) : null} />
      </div>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Accounts are created by your Rookie admin. Need access? Ask them to add you.
      </p>
    </>
  );
}
