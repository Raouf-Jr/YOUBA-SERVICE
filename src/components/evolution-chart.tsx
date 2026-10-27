"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatCompact, formatMoney } from "@/lib/format";
import { niceTicks, type SeriesPoint } from "@/lib/stats";
import { cx } from "./ui";

const SERIES = [
  { key: "revenue", name: "Chiffre d'affaires", color: "var(--series-revenue)" },
  { key: "expenses", name: "Dépenses", color: "var(--series-expenses)" },
  { key: "profit", name: "Bénéfice", color: "var(--series-profit)" },
] as const;

type Key = (typeof SERIES)[number]["key"];

const MARGIN = { top: 14, right: 14, bottom: 30 };

/**
 * Revenue, expenses and profit over time on one shared money axis.
 * Hand-rolled SVG: no chart library to download, crisp at any size.
 */
export function EvolutionChart({ points, currency, height = 280 }: { points: SeriesPoint[]; currency: string; height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hidden, setHidden] = useState<Set<Key>>(() => new Set());
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const visible = SERIES.filter((s) => !hidden.has(s.key));
  const totals = useMemo(() => {
    const t = { revenue: 0, expenses: 0, profit: 0 };
    for (const p of points) {
      t.revenue += p.revenue;
      t.expenses += p.expenses;
      t.profit += p.profit;
    }
    return t;
  }, [points]);

  const geometry = useMemo(() => {
    const values = points.flatMap((p) => visible.map((s) => p[s.key]));
    const ticks = niceTicks(Math.min(0, ...values), Math.max(0, ...values), height < 240 ? 3 : 4);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];
    const labelWidth = Math.max(...ticks.map((t) => formatCompact(t).length)) * 7 + 12;
    const left = Math.max(36, labelWidth);
    const plotW = Math.max(10, width - left - MARGIN.right);
    const plotH = height - MARGIN.top - MARGIN.bottom;
    const n = points.length;
    const x = (i: number) => (n <= 1 ? left + plotW / 2 : left + (i * plotW) / (n - 1));
    const y = (v: number) => MARGIN.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
    const maxLabels = Math.max(2, Math.floor(plotW / 84));
    const labelStep = Math.max(1, Math.ceil(n / maxLabels));
    return { ticks, left, plotW, plotH, x, y, labelStep, yMin };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, width, height, hidden]);

  const { ticks, left, plotW, plotH, x, y, labelStep, yMin } = geometry;

  const pick = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || points.length === 0) return;
    const rel = clientX - rect.left - left;
    const n = points.length;
    const idx = n <= 1 ? 0 : Math.round((rel / plotW) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, idx)));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    setActive((cur) => {
      const base = cur ?? points.length - 1;
      return Math.max(0, Math.min(points.length - 1, base + (e.key === "ArrowRight" ? 1 : -1)));
    });
  };

  const toggle = (key: Key) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < SERIES.length - 1) next.add(key);
      return next;
    });

  const path = (key: Key, from = 0, to = points.length - 1) =>
    points
      .slice(from, to + 1)
      .map((p, i) => `${i === 0 ? "M" : "L"}${x(from + i).toFixed(1)},${y(p[key]).toFixed(1)}`)
      .join("");
  // Unfinished buckets at either end (e.g. the current week) are drawn dashed.
  const n = points.length;
  const solidFrom = n > 2 && points[0].partial ? 1 : 0;
  const solidTo = n > 2 && points[n - 1].partial ? n - 2 : n - 1;
  const baseline = y(Math.max(0, yMin));
  const point = active != null ? points[active] : null;
  const tipLeft = active != null ? x(active) : 0;
  const flip = tipLeft > width - 200;

  return (
    <div>
      {/* Legend doubles as a toggle and shows each series' total for the period. */}
      <div className="mb-4 flex flex-wrap gap-2">
        {SERIES.map((s) => {
          const off = hidden.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={!off}
              onClick={() => toggle(s.key)}
              className={cx(
                "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left transition-colors",
                off ? "border-line bg-transparent opacity-50" : "border-line bg-subtle/60 hover:bg-subtle",
              )}
            >
              <span aria-hidden className="h-0.5 w-3.5 rounded-full" style={{ background: s.color, height: 3 }} />
              <span className="text-xs text-ink-2">{s.name}</span>
              <span className="tabular text-xs font-semibold text-ink">{formatCompact(totals[s.key])}</span>
            </button>
          );
        })}
      </div>

      <div
        ref={wrapRef}
        className="relative select-none focus-visible:rounded-xl"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label="Graphique d'évolution. Utilisez les flèches gauche et droite pour parcourir les périodes."
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {width > 0 && (
          <svg width={width} height={height} className="block overflow-visible">
            {/* Gridlines and y ticks */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={left}
                  x2={left + plotW}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "var(--axis)" : "var(--grid)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-[var(--muted)] text-[11px]">
                  {formatCompact(t)}
                </text>
              </g>
            ))}

            {/* X labels, thinned to avoid collisions */}
            {points.map((p, i) =>
              i % labelStep === 0 ? (
                <text
                  key={p.date}
                  x={x(i)}
                  y={MARGIN.top + plotH + 20}
                  textAnchor="middle"
                  className="fill-[var(--muted)] text-[11px]"
                >
                  {p.label}
                </text>
              ) : null,
            )}

            {/* Revenue wash */}
            {!hidden.has("revenue") && points.length > 1 && (
              <path
                d={`${path("revenue")}L${x(points.length - 1)},${baseline}L${x(0)},${baseline}Z`}
                fill="var(--series-revenue)"
                opacity={0.08}
              />
            )}

            {visible.map((s) => (
              <g key={s.key} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
                <path d={path(s.key, solidFrom, solidTo)} />
                {solidFrom === 1 && <path d={path(s.key, 0, 1)} strokeDasharray="3 4" />}
                {solidTo === n - 2 && <path d={path(s.key, n - 2, n - 1)} strokeDasharray="3 4" />}
              </g>
            ))}

            {/* Crosshair */}
            {point && (
              <line
                x1={tipLeft}
                x2={tipLeft}
                y1={MARGIN.top}
                y2={MARGIN.top + plotH}
                stroke="var(--axis)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            )}

            {/* Markers: hovered point, or the latest one at rest */}
            {visible.map((s) => {
              const i = active ?? points.length - 1;
              if (i < 0 || (active == null && points.length > 40)) return null;
              return (
                <circle
                  key={s.key}
                  cx={x(i)}
                  cy={y(points[i][s.key])}
                  r={4}
                  fill={s.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                />
              );
            })}

            {/* Hit area */}
            <rect
              x={left - 8}
              y={0}
              width={plotW + 16}
              height={height}
              fill="transparent"
              style={{ touchAction: "pan-y" }}
              onPointerMove={(e: PointerEvent) => pick(e.clientX)}
              onPointerDown={(e: PointerEvent) => pick(e.clientX)}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        )}

        {point && (
          <div
            className="pointer-events-none absolute top-1 z-10 w-48 rounded-xl border border-line bg-card px-3 py-2.5 shadow-pop"
            style={{ left: tipLeft, transform: flip ? "translateX(calc(-100% - 12px))" : "translateX(12px)" }}
          >
            <p className="mb-1.5 text-xs font-medium text-ink-2">
              {point.title}
              {point.partial && <span className="font-normal text-muted"> · incomplet</span>}
            </p>
            {visible.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-ink-2">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="tabular font-semibold text-ink">{formatMoney(point[s.key], currency)}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
