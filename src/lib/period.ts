import {
  addDays,
  addMonths,
  endOfMonth,
  formatMonthLong,
  isISODate,
  startOfMonth,
  startOfYear,
  type DateRange,
  type ISODate,
} from "./dates";

export const PERIOD_PRESETS = [
  { key: "jour", label: "Aujourd'hui" },
  { key: "7j", label: "7 jours" },
  { key: "30j", label: "30 jours" },
  { key: "mois", label: "Ce mois" },
  { key: "mois-dernier", label: "Mois dernier" },
  { key: "annee", label: "Cette année" },
  { key: "tout", label: "Depuis le début" },
] as const;

export type PeriodKey = (typeof PERIOD_PRESETS)[number]["key"] | "perso";

export type Period = { key: PeriodKey; range: DateRange; label: string };

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Turns `?periode=…&du=…&au=…` into a concrete date range.
 * `since` is the shop's first recorded activity, used by "Tout".
 */
export function resolvePeriod(
  params: Params,
  todayISO: ISODate,
  since: ISODate | null,
  fallback: PeriodKey = "30j",
): Period {
  const du = first(params.du);
  const au = first(params.au);
  if (isISODate(du) && isISODate(au)) {
    const range = du <= au ? { from: du, to: au } : { from: au, to: du };
    return { key: "perso", range, label: "Période personnalisée" };
  }
  const requested = first(params.periode);
  const preset = PERIOD_PRESETS.find((p) => p.key === requested) ?? PERIOD_PRESETS.find((p) => p.key === fallback)!;
  return { key: preset.key, range: presetRange(preset.key, todayISO, since), label: preset.label };
}

export function presetRange(key: PeriodKey, t: ISODate, since: ISODate | null): DateRange {
  switch (key) {
    case "jour":
      return { from: t, to: t };
    case "7j":
      return { from: addDays(t, -6), to: t };
    case "mois":
      return { from: startOfMonth(t), to: t };
    case "mois-dernier": {
      const prev = addMonths(startOfMonth(t), -1);
      return { from: prev, to: endOfMonth(prev) };
    }
    case "annee":
      // No point showing empty months before the shop's first activity.
      return { from: since && since > startOfYear(t) && since <= t ? since : startOfYear(t), to: t };
    case "tout":
      return { from: since && since < t ? since : addDays(t, -29), to: t };
    case "30j":
    default:
      return { from: addDays(t, -29), to: t };
  }
}

export function periodTitle(period: Period): string {
  if (period.key === "mois" || period.key === "mois-dernier") return formatMonthLong(period.range.from);
  return period.label;
}

/** Builds the query string for a period, preserving custom ranges. */
export function periodQuery(period: Period): string {
  if (period.key === "perso") return `du=${period.range.from}&au=${period.range.to}`;
  return `periode=${period.key}`;
}
