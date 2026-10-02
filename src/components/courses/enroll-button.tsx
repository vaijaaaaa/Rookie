import Link from "next/link";
import { ArrowRight, LogIn, Play, RotateCcw } from "lucide-react";
import { enrollInCourseAction } from "@/app/(app)/courses/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";

/**
 * Primary course CTA:
 * visitor → sign in · signed-in & not enrolled → enroll (RPC) and open first lesson ·
 * enrolled → continue at the next incomplete lesson (or review when finished).
 */
export function EnrollButton({
  courseId,
  courseSlug,
  signedIn,
  enrolled,
  continueHref,
  finished,
  className,
}: {
  courseId: string;
  courseSlug: string;
  signedIn: boolean;
  enrolled: boolean;
  /** Next incomplete lesson (or first lesson). Null when the course has no lessons. */
  continueHref: string | null;
  finished: boolean;
  className?: string;
}) {
  if (!signedIn) {
    return (
      <Button asChild variant="brand" className={className}>
        <Link href={`/login?next=${encodeURIComponent(`/courses/${courseSlug}`)}`}>
          <LogIn /> Sign in to enroll
        </Link>
      </Button>
    );
  }

  if (enrolled) {
    if (!continueHref) return null;
    return (
      <Button asChild variant={finished ? "outline" : "brand"} className={className}>
        <Link href={continueHref}>
          {finished ? (
            <>
              <RotateCcw /> Review course
            </>
          ) : (
            <>
              Continue <ArrowRight />
            </>
          )}
        </Link>
      </Button>
    );
  }

  return (
    <form action={enrollInCourseAction} className={className}>
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="courseSlug" value={courseSlug} />
      {continueHref ? <input type="hidden" name="next" value={continueHref} /> : null}
      <SubmitButton variant="brand" pendingLabel="Enrolling…" className="w-full">
        <Play /> Enroll &amp; start
      </SubmitButton>
    </form>
  );
}
