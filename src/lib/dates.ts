/**
 * Calendar dates are handled as "YYYY-MM-DD" strings (the Postgres `date` type),
 * and computed in UTC so that adding days never drifts with daylight saving.
 */

export type ISODate = string;

export type Granularity = "day" | "week" | "month";

export type DateRange = { from: ISODate; to: ISODate };

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = parse(value);
  return !Number.isNaN(d.getTime()) && format(d) === value;
}

function parse(value: ISODate): Date {
  return new Date(`${value}T00:00:00Z`);
}

function format(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

/** Today's calendar date in the shop's time zone. */
export function today(timeZone: string, now: Date = new Date()): ISODate {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  } catch {
    return format(now);
  }
}

export function addDays(value: ISODate, days: number): ISODate {
  const d = parse(value);
  d.setUTCDate(d.getUTCDate() + days);
  return format(d);
}

export function addMonths(value: ISODate, months: number): ISODate {
  const d = parse(value);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return format(d);
}

/** Inclusive number of days between two dates (same day → 1). */
export function daysInRange(range: DateRange): number {
  return Math.round((parse(range.to).getTime() - parse(range.from).getTime()) / 86_400_000) + 1;
}

export function startOfMonth(value: ISODate): ISODate {
  return `${value.slice(0, 7)}-01`;
}

export function endOfMonth(value: ISODate): ISODate {
  const d = parse(startOfMonth(value));
  return format(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

export function startOfYear(value: ISODate): ISODate {
  return `${value.slice(0, 4)}-01-01`;
}

/** Monday of the ISO week containing the date. */
export function startOfWeek(value: ISODate): ISODate {
  const d = parse(value);
  const weekday = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(value, -weekday);
}

export function granularityFor(range: DateRange): Granularity {
  const length = daysInRange(range);
  if (length <= 45) return "day";
  if (length <= 200) return "week";
  return "month";
}

export function bucketStart(value: ISODate, granularity: Granularity): ISODate {
  if (granularity === "day") return value;
  if (granularity === "week") return startOfWeek(value);
  return startOfMonth(value);
}

/** Every bucket start covering the range, in order. */
export function buckets(range: DateRange, granularity: Granularity): ISODate[] {
  const out: ISODate[] = [];
  let cursor = bucketStart(range.from, granularity);
  while (cursor <= range.to) {
    out.push(cursor);
    cursor =
      granularity === "day"
        ? addDays(cursor, 1)
        : granularity === "week"
          ? addDays(cursor, 7)
          : addMonths(cursor, 1);
  }
  return out;
}

// ---------------------------------------------------------------------------
// French labels

const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLongFmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit", timeZone: "UTC" });
const monthLongFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
const fullFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const clean = (s: string) => s.replace(/\.$/, "").replace(/\. /g, " ");

export function formatDay(value: ISODate): string {
  return clean(dayFmt.format(parse(value)));
}

export function formatDate(value: ISODate): string {
  return clean(fullFmt.format(parse(value)));
}

export function formatDayLong(value: ISODate): string {
  const s = dayLongFmt.format(parse(value));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatMonth(value: ISODate): string {
  return clean(monthFmt.format(parse(value)));
}

export function formatMonthLong(value: ISODate): string {
  const s = monthLongFmt.format(parse(value));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatBucket(value: ISODate, granularity: Granularity): string {
  if (granularity === "month") return formatMonth(value);
  if (granularity === "week") return `Sem. du ${formatDay(value)}`;
  return formatDay(value);
}

export function formatRange(range: DateRange): string {
  if (range.from === range.to) return formatDate(range.from);
  return `${formatDate(range.from)} → ${formatDate(range.to)}`;
}
