"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BarDatum {
  label: string;
  value: number;
  /** optional long label for tooltip */
  full?: string;
}

/**
 * Minimal single-series bar chart: one hue, thin bars with rounded data-ends,
 * recessive grid/axes, hover tooltip. Values in text tokens, not series color.
 */
export function SimpleBarChart({
  data,
  color = "var(--brand)",
  unit = "",
  height = 180,
  maxValue,
  valueLabel = "Value",
}: {
  data: BarDatum[];
  color?: string;
  unit?: string;
  height?: number;
  maxValue?: number;
  valueLabel?: string;
}) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        No data yet
      </div>
    );
  }
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -16 }} barCategoryGap="25%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeOpacity={0.6} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            interval="preserveStartEnd"
            minTickGap={8}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={44}
            domain={[0, maxValue ?? "auto"]}
            tick={{ fill: "var(--muted-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}
            tickFormatter={(v: number) => `${v}${unit}`}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload as BarDatum | undefined;
              if (!active || !p) return null;
              return (
                <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                  <p className="text-muted-foreground">{p.full ?? p.label}</p>
                  <p className="font-mono font-medium tabular-nums text-foreground">
                    {valueLabel}: {p.value}
                    {unit}
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
