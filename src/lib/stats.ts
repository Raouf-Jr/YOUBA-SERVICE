import {
  addDays,
  addMonths,
  bucketStart,
  buckets,
  formatBucket,
  formatDay,
  formatMonth,
  type DateRange,
  type Granularity,
  type ISODate,
} from "./dates";

export type DailyAmount = { date: ISODate; amount: number };

export type SeriesPoint = {
  date: ISODate;
  /** Short axis label ("12 oct"), and the full name for tooltips ("Sem. du 12 oct"). */
  label: string;
  title: string;
  /** The bucket is cut by the range (e.g. the current, unfinished week). */
  partial: boolean;
  revenue: number;
  expenses: number;
  profit: number;
};

/** Folds daily totals into evenly spaced buckets so empty days still show as zero. */
export function buildSeries(
  range: DateRange,
  granularity: Granularity,
  revenue: DailyAmount[],
  expenses: DailyAmount[],
): SeriesPoint[] {
  const points = new Map<ISODate, SeriesPoint>();
  for (const date of buckets(range, granularity)) {
    const end = granularity === "day" ? date : granularity === "week" ? addDays(date, 6) : addDays(addMonths(date, 1), -1);
    points.set(date, {
      date,
      label: granularity === "month" ? formatMonth(date) : formatDay(date),
      title: formatBucket(date, granularity),
      partial: date < range.from || end > range.to,
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
  }
  const add = (rows: DailyAmount[], key: "revenue" | "expenses") => {
    for (const row of rows) {
      if (row.date < range.from || row.date > range.to) continue;
      const point = points.get(bucketStart(row.date, granularity));
      if (point) point[key] += row.amount;
    }
  };
  add(revenue, "revenue");
  add(expenses, "expenses");
  for (const point of points.values()) {
    point.revenue = round2(point.revenue);
    point.expenses = round2(point.expenses);
    point.profit = round2(point.revenue - point.expenses);
  }
  return [...points.values()];
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * How much of the money invested has been earned back, and roughly when the rest will be,
 * at the recent monthly profit pace.
 */
export function payback(totalInvested: number, cumulativeProfit: number, recentMonthlyProfit: number) {
  const recovered = Math.max(0, cumulativeProfit);
  const ratio = totalInvested > 0 ? Math.min(1, recovered / totalInvested) : 0;
  const remaining = Math.max(0, totalInvested - recovered);
  const monthsLeft =
    remaining === 0 ? 0 : recentMonthlyProfit > 0 ? Math.ceil(remaining / recentMonthlyProfit) : null;
  return { recovered, ratio, remaining, monthsLeft };
}

/** "Nice" axis ticks (0, 25 000, 50 000…) covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    if (max === 0) return [0, 1];
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  const span = max - min;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual > 5 ? 10 : residual > 2.5 ? 5 : residual > 2 ? 2.5 : residual > 1 ? 2 : 1) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}
