import { ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TopicState } from "@/services/roadmaps";

/** ✓ completed (brand) · → current (pulsing ring) · ○ upcoming */
export function TopicStateIcon({ state, interactive = false }: { state: TopicState; interactive?: boolean }) {
  if (state === "completed") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-brand text-brand-foreground">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="relative flex size-5 items-center justify-center">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand/40 motion-reduce:animate-none" />
        <span className="relative flex size-5 items-center justify-center rounded-full border-2 border-brand bg-background text-brand">
          <ArrowRight className="size-3" strokeWidth={3} />
        </span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "block size-5 rounded-full border-2 border-muted-foreground/30 bg-background",
        interactive && "hover:border-brand/60",
      )}
    />
  );
}
