"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setRoadmapNodeDone } from "@/app/(app)/roadmaps/actions";
import { cn } from "@/lib/utils";
import { TopicStateIcon } from "./topic-state-icon";
import type { TopicState } from "@/services/roadmaps";

/** Clickable topic status for manual (lesson-less) topics. Optimistic. */
export function TopicToggle({
  nodeId,
  roadmapSlug,
  title,
  done,
  state,
}: {
  nodeId: string;
  roadmapSlug: string;
  title: string;
  done: boolean;
  state: TopicState;
}) {
  const [pending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const shownState: TopicState = optimisticDone ? "completed" : state === "completed" ? "upcoming" : state;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticDone}
      aria-label={optimisticDone ? `Mark "${title}" as not done` : `Mark "${title}" as done`}
      title={optimisticDone ? "Mark as not done" : "Mark as done"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !optimisticDone;
          setOptimisticDone(next);
          const res = await setRoadmapNodeDone({ nodeId, roadmapSlug, done: next });
          if (!res.ok) toast.error(res.error);
        })
      }
      className={cn(
        "rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-70",
      )}
    >
      <TopicStateIcon state={shownState} interactive />
    </button>
  );
}
