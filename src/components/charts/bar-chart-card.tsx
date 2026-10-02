"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, ChartFrame, ChartTooltipBox, formatValue, seriesColor, type ChartCardProps } from "./chart-shared";

export interface BarChartCardProps extends ChartCardProps {
  /** Horizontal bars (categories on the y-axis) — good for long labels like course titles. */
  horizontal?: boolean;
  /** Width reserved for category labels in horizontal mode (default 140). */
  categoryWidth?: number;
}

/** Single-series bar chart in a titled card. */
export function BarChartCard({
  title,
  description,
  data,
  xKey,
  yKey,
  valueSuffix = "",
  valueLabel,
  secondary,
  height = 220,
  yMax,
  emptyMessage,
  className,
  horizontal = false,
  categoryWidth = 140,
}: BarChartCardProps) {
  const color = seriesColor(secondary);
  const label = valueLabel ?? yKey;
  const plotHeight = horizontal ? Math.max(height, data.length * 28 + 24) : height;
  const domain: [number, number | "auto"] = [0, yMax ?? "auto"];

  return (
    <ChartFrame
      title={title}
      description={description}
      className={className}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
      height={plotHeight}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 12, bottom: 0, left: 0 }}
        >
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                domain={domain}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                tickFormatter={(v) => formatValue(v, valueSuffix)}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={categoryWidth}
                interval={0}
              />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={12} />
              <YAxis
                domain={domain}
                tick={AXIS_TICK}
                tickLine={false}
                axisLine={false}
                width={40}
                allowDecimals={false}
                tickFormatter={(v) => formatValue(v, valueSuffix)}
              />
            </>
          )}
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.5 }}
            content={({ active, payload, label: l }) => (
              <ChartTooltipBox
                active={active}
                label={l}
                value={payload?.[0]?.value}
                valueLabel={label}
                suffix={valueSuffix}
              />
            )}
          />
          <Bar
            dataKey={yKey}
            name={label}
            fill={color}
            radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
            maxBarSize={horizontal ? 18 : 32}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}
