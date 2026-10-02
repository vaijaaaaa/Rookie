"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

/** Client-side markdown renderer for live note previews. */
export function MarkdownPreview({ children, className }: { children: string; className?: string }) {
  if (!children.trim()) {
    return <p className={cn("text-sm text-muted-foreground italic", className)}>Nothing to preview yet.</p>;
  }
  return (
    <div className={cn("prose-tech text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
