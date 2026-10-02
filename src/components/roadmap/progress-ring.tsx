import { cn } from "@/lib/utils";

/** Circular progress indicator (SVG). */
export function ProgressRing({
  value,
  size = 96,
  stroke = 8,
  className,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  className?: string;
  /** Optional caption under the percentage. */
  label?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (v / 100) * c}
          className="stroke-brand transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="font-mono text-lg font-semibold tabular-nums leading-none">{v}%</span>
        {label ? <span className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span> : null}
      </div>
    </div>
  );
}
