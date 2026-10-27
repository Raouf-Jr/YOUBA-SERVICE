import { describe, expect, it } from "vitest";
import { change, formatMoney } from "@/lib/format";
import { parseAmount } from "@/lib/forms";
import { toCsv } from "@/lib/csv";

describe("parseAmount", () => {
  it("reads amounts typed the French way", () => {
    expect(parseAmount("12 500")).toBe(12500);
    expect(parseAmount("12 500")).toBe(12500);
    expect(parseAmount("1250,50")).toBe(1250.5);
    expect(parseAmount("1.250,5")).toBe(1250.5);
    expect(parseAmount("7.5")).toBe(7.5);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNaN();
  });
});

describe("formatting", () => {
  it("formats CFA francs without decimals and euros with cents", () => {
    expect(formatMoney(125000, "XOF")).toMatch(/^125 000 F CFA$/);
    expect(formatMoney(12.5, "EUR")).toMatch(/^12,50 €$/);
  });

  it("computes relative change only when there is a basis", () => {
    expect(change(150, 100)).toBe(0.5);
    expect(change(50, -100)).toBe(1.5);
    expect(change(10, 0)).toBeNull();
  });

  it("builds Excel-friendly CSV", () => {
    const csv = toCsv(["Produit", "Total"], [["Riz; 25 kg", 1250.5]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain('"Riz; 25 kg";1250,5');
  });
});

describe("form parsing", () => {
  it("treats amount inputs missing from the form as empty", async () => {
    const { z } = await import("zod");
    const { fields, parseForm } = await import("@/lib/forms");
    const schema = z.object({ price: fields.amount("Le prix"), stock: fields.amount("Le stock", { optional: true }) });
    const fd = new FormData();
    fd.set("price", "1 000");
    expect(parseForm(schema, fd)).toEqual({ data: { price: 1000, stock: null }, errors: null });
    expect(parseForm(schema, new FormData()).errors).toEqual({ price: "Le prix est obligatoire" });
  });
});
