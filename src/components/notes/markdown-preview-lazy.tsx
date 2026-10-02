"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** MarkdownPreview with react-markdown + highlight.js split into a chunk loaded on first render. */
export const MarkdownPreview = dynamic(() => import("./markdown-preview").then((m) => m.MarkdownPreview), {
  ssr: false,
  loading: () => (
    <div className="space-y-2 py-1" aria-busy="true">
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="h-3 w-3/5" />
    </div>
  ),
});
