import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

/** Server-rendered markdown with GFM + syntax highlighting. */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-tech", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[[rehypeHighlight, { detect: true }]]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
