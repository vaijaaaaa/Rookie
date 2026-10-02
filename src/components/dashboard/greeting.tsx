"use client";

import { useSyncExternalStore } from "react";
import { greeting } from "@/lib/utils/format";

const subscribe = () => () => {};

/**
 * "Good morning, Ada 👋" using the viewer's local clock. The server renders
 * `serverGreeting` (computed in the profile's timezone) to avoid a flash.
 */
export function Greeting({ name, serverGreeting }: { name: string; serverGreeting: string }) {
  const text = useSyncExternalStore(subscribe, () => greeting(new Date()), () => serverGreeting);
  return (
    <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
      {text}, {name} <span aria-hidden>👋</span>
    </h1>
  );
}
