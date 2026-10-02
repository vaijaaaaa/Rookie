import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { postAuthRedirect, safeNextPath } from "@/app/auth/_lib/redirects";
import { AuthHeading, OrDivider } from "../_components/form-field";
import { GoogleButton } from "../_components/google-button";
import { SignupForm } from "../_components/signup-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(rawNext) ?? undefined;

  const profile = await getProfile();
  if (profile) redirect(postAuthRedirect(profile, next));

  return (
    <>
      <AuthHeading
        eyebrow="$ rookie init"
        title="Create your account"
        description="Free forever for roadmaps, lessons and practice."
      />
      <GoogleButton next={next} label="Sign up with Google" />
      <OrDivider />
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>
    </>
  );
}
