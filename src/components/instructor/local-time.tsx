"use client";

import { useSyncExternalStore } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";

const subscribe = () => () => {};

/** True after hydration (browser timezone known). */
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

const PATTERNS = {
  datetime: "EEE, MMM d · h:mm a",
  date: "MMM d, yyyy",
  short: "MMM d, h:mm a",
  time: "h:mm a",
  day: "EEE, MMM d",
} as const;

/**
 * Renders a timestamp in the viewer's browser timezone. The server pass renders
 * a UTC fallback, replaced right after hydration.
 */
export function LocalTime({
  value,
  format: kind = "datetime",
  className,
}: {
  value: string | null | undefined;
  format?: keyof typeof PATTERNS | "relative";
  className?: string;
}) {
  const client = useIsClient();
  if (!value) return <span className={className}>—</span>;
  const date = new Date(value);
  let text: string;
  if (!client) {
    text = kind === "relative" ? value.slice(0, 10) : `${value.slice(0, 16).replace("T", " ")} UTC`;
  } else if (kind === "relative") {
    text = formatDistanceToNowStrict(date, { addSuffix: true });
  } else {
    text = format(date, PATTERNS[kind]);
  }
  return (
    <time dateTime={value} className={className} title={client ? date.toString() : value}>
      {text}
    </time>
  );
}
