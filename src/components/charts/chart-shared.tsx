"use client";

import { cn } from "@/lib/utils";

/** A row of chart data. Keys are referenced by `xKey` / `yKey`. */
export type ChartDatum = Record<string, string | number | null>;

export interface ChartCardProps {
  /** State the takeaway, e.g. "Signups doubled since March". */
  title: string;
  description?: string;
  data: ChartDatum[];
  /** Category / x-axis key (pre-format labels on the server). */
  xKey: string;
  /** Numeric value key. */
  yKey: string;
  /** Appended to values in ticks and tooltips, e.g. "%". */
  valueSuffix?: string;
  /** Series label shown in the tooltip (defaults to yKey). */
  valueLabel?: string;
  /** Use the secondary series color (var(--chart-2)) instead of brand. */
  secondary?: boolean;
  /** Plot height in px (default 220). */
  height?: number;
  /** Fixed y-axis max, e.g. 100 for percentages. */
  yMax?: number;
  /** Message when data is empty. */
  emptyMessage?: string;
  className?: string;
}

export const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 } as const;

export function seriesColor(secondary?: boolean) {
  return secondary ? "var(--chart-2)" : "var(--brand)";
}

export function formatValue(v: unknown, suffix = "") {
  if (typeof v === "number") return `${v.toLocaleString()}${suffix}`;
  if (v == null) return "—";
  return `${String(v)}${suffix}`;
}

export function ChartTooltipBox({
  active,
  label,
  value,
  valueLabel,
  suffix,
}: {
  active?: boolean;
  label?: unknown;
  value?: unknown;
  valueLabel: string;
  suffix?: string;
}) {
  if (!active) return null;
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md">
      <p className="font-mono text-[11px] text-muted-foreground">{String(label ?? "")}</p>
      <p className="mt-0.5 font-medium tabular-nums">
        <span className="text-muted-foreground">{valueLabel}: </span>
        {formatValue(value, suffix)}
      </p>
    </div>
  );
}

export function ChartFrame({
  title,
  description,
  className,
  empty,
  emptyMessage,
  height,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  empty: boolean;
  emptyMessage?: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <figure className={cn("rounded-lg border bg-card", className)}>
      <figcaption className="border-b px-4 py-3">
        <p className="text-sm font-medium">{title}</p>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </figcaption>
      <div className="px-2 pt-4 pb-2" style={{ height: height + 24 }}>
        {empty ? (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
            {emptyMessage ?? "No data yet"}
          </div>
        ) : (
          children
        )}
      </div>
    </figure>
  );
}
