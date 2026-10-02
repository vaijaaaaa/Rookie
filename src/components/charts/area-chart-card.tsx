"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, ChartFrame, ChartTooltipBox, formatValue, seriesColor, type ChartCardProps } from "./chart-shared";

/** Single-series area chart (soft fill under a line) in a titled card. */
export function AreaChartCard({
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
}: ChartCardProps) {
  const color = seriesColor(secondary);
  const label = valueLabel ?? yKey;
  const gradientId = `area-${useId().replace(/:/g, "")}`;

  return (
    <ChartFrame
      title={title}
      description={description}
      className={className}
      empty={data.length === 0}
      emptyMessage={emptyMessage}
      height={height}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis
            domain={[0, yMax ?? "auto"]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
            tickFormatter={(v) => formatValue(v, valueSuffix)}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
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
          <Area
            type="monotone"
            dataKey={yKey}
            name={label}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={data.length <= 16 ? { r: 2.5, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Alias: line-style trend chart. Same API as AreaChartCard. */
export const LineChartCard = AreaChartCard;
