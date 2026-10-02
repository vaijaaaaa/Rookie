"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setLessonCompletion } from "@/app/(app)/courses/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Optimistic "Mark complete" toggle for the current lesson. */
export function MarkCompleteButton({
  lessonId,
  courseId,
  courseSlug,
  completed,
  nextHref,
  className,
  size = "default",
}: {
  lessonId: string;
  courseId: string;
  courseSlug: string;
  completed: boolean;
  /** When set, a toast offers to continue to the next lesson after completing. */
  nextHref?: string | null;
  className?: string;
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(completed);

  function toggle() {
    const next = !optimistic;
    startTransition(async () => {
      setOptimistic(next);
      const res = await setLessonCompletion({ lessonId, courseId, courseSlug, completed: next });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (next) {
        toast.success("Lesson completed", {
          action: nextHref ? { label: "Next lesson", onClick: () => router.push(nextHref) } : undefined,
        });
      }
      // revalidatePath in the action refreshes server data; optimistic state then settles.
    });
  }

  return (
    <Button
      type="button"
      size={size}
      variant={optimistic ? "outline" : "brand"}
      onClick={toggle}
      aria-pressed={optimistic}
      className={cn(optimistic && "border-brand/40 text-brand hover:text-brand", className)}
    >
      {pending ? <Loader2 className="animate-spin" /> : optimistic ? <CheckCircle2 /> : <Circle />}
      {optimistic ? "Completed" : "Mark complete"}
    </Button>
  );
}
