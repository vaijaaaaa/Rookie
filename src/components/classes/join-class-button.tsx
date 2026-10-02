"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { ClassSession } from "@/types";
import { JOIN_WINDOW_MINUTES, joinState } from "./class-time";

const TICK_MS = 30_000;

type Props = Pick<ClassSession, "starts_at" | "duration_minutes" | "status" | "meeting_url"> & {
  /** Server render time, so the first client render matches the HTML. */
  serverNow: number;
  size?: "sm" | "default";
  /** Render nothing unless joining is possible right now (for compact cards). */
  onlyWhenOpen?: boolean;
  showHint?: boolean;
  className?: string;
};

/**
 * "Join meeting" — enabled from JOIN_WINDOW_MINUTES before start until the scheduled end
 * (or while the instructor has the class marked live). Re-evaluates on a timer.
 */
export function JoinClassButton({
  serverNow,
  size = "default",
  onlyWhenOpen = false,
  showHint = true,
  className,
  ...c
}: Props) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const state = joinState(c, now);
  if (onlyWhenOpen && state.kind !== "open") return null;

  if (state.kind === "open" && c.meeting_url) {
    return (
      <Button asChild variant="brand" size={size} className={className}>
        <a href={c.meeting_url} target="_blank" rel="noopener noreferrer">
          <Video />
          Join meeting
          <ExternalLink className="size-3 opacity-70" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </Button>
    );
  }

  const hint =
    state.kind === "early"
      ? `Opens at ${formatTime(new Date(state.opensAt))} · ${JOIN_WINDOW_MINUTES} min before start`
      : state.kind === "ended"
        ? "This class has ended"
        : state.kind === "cancelled"
          ? "This class was cancelled"
          : "No meeting link yet";

  return (
    <div className={cn("flex flex-col items-start gap-1", className)}>
      <Button variant="outline" size={size} disabled>
        <Video />
        Join meeting
      </Button>
      {showHint ? (
        <p className="font-mono text-[11px] text-muted-foreground" suppressHydrationWarning>
          {hint}
        </p>
      ) : (
        <span className="sr-only">{hint}</span>
      )}
    </div>
  );
}
