"use client";

import { useSyncExternalStore } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { formatDate } from "@/lib/utils/format";

const subscribe = () => () => {};

/** True after hydration (needed only for "relative", which depends on the current time). */
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

/** Renders a timestamp in Indian Standard Time — identical on server and client. */
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
  const istFull = `${formatDate(value, "EEE, MMM d yyyy, h:mm a")} IST`;
  let text: string;
  if (kind === "relative") {
    text = client ? formatDistanceToNowStrict(new Date(value), { addSuffix: true }) : formatDate(value, PATTERNS.date);
  } else {
    text = formatDate(value, PATTERNS[kind]);
  }
  return (
    <time dateTime={value} className={className} title={istFull}>
      {text}
    </time>
  );
}
