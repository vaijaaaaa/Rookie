import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Course glyph. `icon` is free text in the DB — typically an emoji. Plain
 * ASCII words (e.g. a lucide name) fall back to a monogram-free book icon.
 */
export function CourseIcon({
  icon,
  className,
  size = "md",
}: {
  icon: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const isGlyph = !!icon && icon.trim().length > 0 && !/^[\x20-\x7e]+$/.test(icon.trim());
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border bg-muted/50",
        size === "sm" && "size-8 text-base",
        size === "md" && "size-10 text-xl",
        size === "lg" && "size-14 text-3xl",
        className,
      )}
    >
      {isGlyph ? (
        <span className="leading-none">{icon}</span>
      ) : (
        <BookOpen className={cn("text-muted-foreground", size === "lg" ? "size-6" : "size-4")} />
      )}
    </div>
  );
}
