"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** Editor skeleton shown while CodeMirror's chunk loads. */
export function EditorSkeleton() {
  return (
    <div className="flex h-full min-h-0 gap-3 p-3" aria-busy="true" aria-label="Loading editor">
      <div className="flex w-8 flex-col items-end gap-2 pt-1">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-3 w-4" />
        ))}
      </div>
      <div className="flex flex-1 flex-col gap-2 pt-1">
        {[60, 85, 40, 70, 55, 90, 30, 65, 45, 20].map((w, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

/** Code-split CodeMirror: only the practice workspace pays for it, never SSR'd. */
export const LazyCodeEditor = dynamic(() => import("./code-editor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});
