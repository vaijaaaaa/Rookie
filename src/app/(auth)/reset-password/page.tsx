import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/auth/session";
import { AuthHeading } from "../_components/form-field";
import { ResetPasswordForm } from "../_components/reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  const user = await getUser();

  if (!user) {
    return (
      <>
        <AuthHeading
          eyebrow="$ rookie passwd"
          title="Reset link expired"
          description="This password reset link is invalid or has already been used. Request a new one to continue."
        />
        <Button asChild variant="brand" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        eyebrow="$ rookie passwd"
        title="Choose a new password"
        description={
          <>
            Signed in as <span className="font-medium text-foreground">{user.email}</span>.
          </>
        }
      />
      <ResetPasswordForm />
    </>
  );
}
