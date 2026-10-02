import Link from "next/link";
import { Progress } from "@/components/ui/progress";

/** Label + "x / y" + bar. Used for topics, courses, difficulties, languages. */
export function BarRow({
  label,
  value,
  total,
  href,
  suffix,
  indicatorClassName,
}: {
  label: React.ReactNode;
  value: number;
  total: number;
  href?: string;
  suffix?: string;
  indicatorClassName?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const text = typeof label === "string" ? label : undefined;
  const body = (
    <>
      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
        <span className="truncate">{label}</span>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
          {value} / {total}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <Progress value={pct} indicatorClassName={indicatorClassName} aria-label={text ? `${text}: ${value} of ${total}` : undefined} />
    </>
  );
  return href ? (
    <Link href={href} className="block rounded-sm hover:[&_span:first-child]:underline">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
