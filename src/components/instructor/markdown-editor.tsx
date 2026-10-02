"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Markdown textarea with Write / Preview toggle. Controlled. */
export function MarkdownEditor({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  rows = 12,
  invalid,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  rows?: number;
  invalid?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  return (
    <div className={cn("overflow-hidden rounded-md border", className)}>
      <div className="flex items-center gap-1 border-b bg-muted/40 px-1.5 py-1" role="tablist">
        {(["write", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              tab === t && "bg-background text-foreground shadow-sm",
            )}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto pr-1 font-mono text-[10px] text-muted-foreground">markdown · gfm</span>
      </div>
      {tab === "write" ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          className="rounded-none border-0 font-mono text-[13px] shadow-none focus-visible:ring-0"
        />
      ) : (
        <div className="prose-tech max-h-[600px] min-h-32 overflow-y-auto px-4 py-3" style={{ minHeight: rows * 20 }}>
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}
