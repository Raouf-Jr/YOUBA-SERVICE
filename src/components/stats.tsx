import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { formatPercent } from "@/lib/format";
import { cx } from "./ui";

/** Signed change vs the previous period; green when the move is good for the shop. */
export function Delta({
  value,
  upIsGood = true,
  suffix = "vs période préc.",
  className,
}: {
  value: number | null;
  upIsGood?: boolean;
  suffix?: string;
  className?: string;
}) {
  if (value == null || !Number.isFinite(value)) {
    return <span className={cx("text-xs text-muted", className)}>Pas de comparaison</span>;
  }
  const flat = Math.abs(value) < 0.005;
  const good = flat ? null : value > 0 === upIsGood;
  const Icon = flat ? Minus : value > 0 ? ArrowUp : ArrowDown;
  return (
    <span className={cx("inline-flex flex-wrap items-center gap-x-1.5 text-xs", className)}>
      <span
        className={cx(
          "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold",
          good === null ? "bg-subtle text-ink-2" : good ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
        )}
      >
        <Icon className="size-3" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">{value > 0 ? "En hausse de" : "En baisse de"}</span>
        {formatPercent(Math.abs(value))}
      </span>
      <span className="text-muted">{suffix}</span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  delta,
  swatch,
  footer,
  trend,
  className,
}: {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  swatch?: string;
  footer?: ReactNode;
  trend?: number[];
  className?: string;
}) {
  return (
    <div className={cx("print-plain flex min-w-0 flex-col rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5", className)}>
      <p className="flex items-center gap-2 text-sm text-ink-2">
        {swatch && <span aria-hidden className="size-2.5 rounded-full" style={{ background: swatch }} />}
        {label}
      </p>
      <p className="mt-2 text-lg leading-tight font-semibold tracking-tight break-words text-ink sm:text-2xl">{value}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div className="min-w-0">{delta ?? footer}</div>
        {trend && trend.length > 1 && <Sparkline values={trend} />}
      </div>
    </div>
  );
}

/** Tiny trend line: de-emphasised history, latest point in the accent. */
export function Sparkline({ values, width = 64, height = 24 }: { values: number[]; width?: number; height?: number }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - ((v - min) / span) * (height - 6)] as const);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      <polyline
        points={pts.map(([x, y]) => `${x},${y}`).join(" ")}
        fill="none"
        stroke="var(--axis)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lx} cy={ly} r="3" fill="var(--accent)" stroke="var(--card)" strokeWidth="1.5" />
    </svg>
  );
}

export type BarItem = { label: string; value: number; display: string; detail?: string };

/** Horizontal bars with the value at the tip; thin marks, rounded data-end. */
export function BarList({ items, color, max }: { items: BarItem[]; color: string; max?: number }) {
  const top = max ?? Math.max(...items.map((i) => i.value), 0);
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const pct = top > 0 ? Math.max(0.5, (item.value / top) * 100) : 0;
        return (
          <li key={item.label} className="group rounded-xl px-2 py-1.5 transition-colors hover:bg-subtle" title={item.detail}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-ink">{item.label}</span>
              <span className="tabular shrink-0 font-medium text-ink">{item.display}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 flex-1 overflow-hidden rounded-r-[4px]">
                <div className="h-full rounded-r-[4px]" style={{ width: `${pct}%`, background: color }} />
              </div>
              {item.detail && <span className="tabular w-12 shrink-0 text-right text-xs text-muted">{item.detail}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Progress toward a target; the track is a lighter step of the fill's hue. */
export function Meter({
  ratio,
  color,
  track,
  label,
}: {
  ratio: number;
  color: string;
  track: string;
  label: string;
}) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-3 w-full overflow-hidden rounded-full"
      style={{ background: track }}
    >
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
