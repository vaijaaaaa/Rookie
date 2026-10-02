"use client";

import { useEffect } from "react";
import { recordLessonView } from "@/app/(app)/courses/actions";

/** Fire-and-forget: records last_viewed_at (in_progress if new) for signed-in users. */
export function LessonViewTracker({ lessonId }: { lessonId: string }) {
  useEffect(() => {
    void recordLessonView(lessonId).catch(() => {});
  }, [lessonId]);
  return null;
}
