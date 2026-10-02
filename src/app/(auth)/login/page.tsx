import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { postAuthRedirect, safeNextPath } from "@/app/auth/_lib/redirects";
import { AuthHeading, FormError, OrDivider } from "../_components/form-field";
import { GoogleButton } from "../_components/google-button";
import { LoginForm } from "../_components/login-form";

export const metadata: Metadata = { title: "Log in" };

const ERRORS: Record<string, string> = {
  oauth: "Google sign-in didn't complete. Please try again.",
  link: "That link is invalid or has expired. Request a new one.",
  confirm: "We couldn't confirm your email. The link may have expired.",
};

const DEMO = ["student@rookie.dev", "instructor@rookie.dev", "admin@rookie.dev"];

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
      <div className="space-y-4">
        <FormError message={error ? (ERRORS[error] ?? ERRORS.link) : null} />
        <GoogleButton next={next} />
      </div>
      <OrDivider />
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Rookie?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>

      <aside aria-label="Demo accounts" className="mt-8 rounded-md border border-dashed bg-muted/30 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Demo accounts · dev seed</p>
        <ul className="mt-2 space-y-0.5 font-mono text-xs">
          {DEMO.map((email) => (
            <li key={email} className="select-all">
              {email}
            </li>
          ))}
        </ul>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          password: <span className="select-all text-foreground">Rookie@2026</span>
        </p>
      </aside>
    </>
  );
}
