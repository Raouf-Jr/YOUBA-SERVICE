import { describe, expect, it } from "vitest";
import { resolvePeriod } from "@/lib/period";
import { buildSeries, niceTicks } from "@/lib/stats";

describe("buildSeries", () => {
  it("fills empty days with zeros and computes profit", () => {
    const series = buildSeries(
      { from: "2026-10-01", to: "2026-10-03" },
      "day",
      [{ date: "2026-10-01", amount: 1000 }],
      [{ date: "2026-10-03", amount: 400 }],
    );
    expect(series.map((p) => [p.date, p.revenue, p.expenses, p.profit])).toEqual([
      ["2026-10-01", 1000, 0, 1000],
      ["2026-10-02", 0, 0, 0],
      ["2026-10-03", 0, 400, -400],
    ]);
  });

  it("groups by week and flags unfinished buckets", () => {
    const series = buildSeries(
      { from: "2026-10-05", to: "2026-10-21" },
      "week",
      [
        { date: "2026-10-05", amount: 100 },
        { date: "2026-10-11", amount: 50 },
        { date: "2026-10-20", amount: 10 },
      ],
      [],
    );
    expect(series.map((p) => [p.date, p.revenue, p.partial])).toEqual([
      ["2026-10-05", 150, false],
      ["2026-10-12", 0, false],
      ["2026-10-19", 10, true],
    ]);
  });
});

describe("niceTicks", () => {
  it("produces round ticks that cover the data", () => {
    expect(niceTicks(0, 87_000)).toEqual([0, 25_000, 50_000, 75_000, 100_000]);
    const withNegative = niceTicks(-120, 480);
    expect(withNegative[0]).toBeLessThanOrEqual(-120);
    expect(withNegative.at(-1)).toBeGreaterThanOrEqual(480);
    expect(niceTicks(0, 0)).toEqual([0, 1]);
  });
});

describe("resolvePeriod", () => {
  const t = "2026-10-27";
  it("handles presets", () => {
    expect(resolvePeriod({ periode: "7j" }, t, null).range).toEqual({ from: "2026-10-21", to: t });
    expect(resolvePeriod({ periode: "mois-dernier" }, t, null).range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(resolvePeriod({}, t, null).key).toBe("30j");
  });
  it("starts 'this year' and 'all time' at the first activity", () => {
    expect(resolvePeriod({ periode: "annee" }, t, "2026-06-15").range.from).toBe("2026-06-15");
    expect(resolvePeriod({ periode: "annee" }, t, "2025-03-01").range.from).toBe("2026-01-01");
    expect(resolvePeriod({ periode: "tout" }, t, "2025-03-01").range.from).toBe("2025-03-01");
  });
  it("accepts custom ranges in any order", () => {
    const p = resolvePeriod({ du: "2026-10-10", au: "2026-10-01" }, t, null);
    expect(p.key).toBe("perso");
    expect(p.range).toEqual({ from: "2026-10-01", to: "2026-10-10" });
  });
});
