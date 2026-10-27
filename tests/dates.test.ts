import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  buckets,
  daysInRange,
  endOfMonth,
  granularityFor,
  isISODate,
  previousRange,
  startOfWeek,
  today,
} from "@/lib/dates";

describe("dates", () => {
  it("validates calendar dates", () => {
    expect(isISODate("2026-02-28")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("28/02/2026")).toBe(false);
  });

  it("adds days and months across boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("counts days inclusively and finds the previous period", () => {
    expect(daysInRange({ from: "2026-10-01", to: "2026-10-31" })).toBe(31);
    expect(previousRange({ from: "2026-10-01", to: "2026-10-07" })).toEqual({ from: "2026-09-24", to: "2026-09-30" });
  });

  it("starts weeks on Monday", () => {
    expect(startOfWeek("2026-10-27")).toBe("2026-10-26"); // Tuesday → Monday
    expect(startOfWeek("2026-11-01")).toBe("2026-10-26"); // Sunday → previous Monday
  });

  it("picks a sensible granularity and buckets", () => {
    expect(granularityFor({ from: "2026-10-01", to: "2026-10-30" })).toBe("day");
    expect(granularityFor({ from: "2026-06-01", to: "2026-10-30" })).toBe("week");
    expect(granularityFor({ from: "2026-01-01", to: "2026-10-30" })).toBe("month");
    expect(buckets({ from: "2026-01-15", to: "2026-03-02" }, "month")).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("computes today in the shop's time zone", () => {
    const now = new Date("2026-10-27T23:30:00Z");
    expect(today("Africa/Abidjan", now)).toBe("2026-10-27");
    expect(today("Africa/Douala", now)).toBe("2026-10-28"); // UTC+1
    expect(today("America/Port-au-Prince", now)).toBe("2026-10-27");
  });
});
