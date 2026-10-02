"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MarkdownPreview } from "./markdown-preview-lazy";

/** Markdown textarea with a Write / Preview toggle. */
export function MarkdownField({
  value,
  onChange,
  id,
  placeholder = "Write in markdown…",
  minHeight = "min-h-40",
  autoFocus,
  ...rest
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  minHeight?: string;
  autoFocus?: boolean;
} & Pick<React.ComponentProps<"textarea">, "aria-invalid" | "aria-describedby" | "name" | "onBlur" | "onKeyDown">) {
  return (
    <Tabs defaultValue="write" className="gap-2">
      <div className="flex items-center justify-between gap-2">
        <TabsList className="h-8">
          <TabsTrigger value="write" className="px-2.5 text-xs">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2.5 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>
        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">Markdown supported</span>
      </div>
      <TabsContent value="write">
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn("resize-y font-mono text-[13px] leading-relaxed", minHeight)}
          {...rest}
        />
      </TabsContent>
      <TabsContent value="preview">
        <div className={cn("rounded-md border bg-muted/20 px-3 py-2", minHeight)}>
          <MarkdownPreview>{value}</MarkdownPreview>
        </div>
      </TabsContent>
    </Tabs>
  );
}
