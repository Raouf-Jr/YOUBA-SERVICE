import type { ReactNode } from "react";
import { cx } from "./ui";

export function StatTile({
  label,
  value,
  swatch,
  footer,
  className,
}: {
  label: string;
  value: ReactNode;
  swatch?: string;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("print-plain flex min-w-0 flex-col rounded-2xl border border-line bg-card p-4 shadow-card sm:p-5", className)}>
      <p className="flex items-center gap-2 text-sm text-ink-2">
        {swatch && <span aria-hidden className="size-2.5 rounded-full" style={{ background: swatch }} />}
        {label}
      </p>
      <p className="mt-2 text-lg leading-tight font-semibold tracking-tight break-words text-ink sm:text-2xl">{value}</p>
      {footer && <div className="mt-auto min-w-0 pt-2">{footer}</div>}
    </div>
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
