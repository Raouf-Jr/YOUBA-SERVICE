import { describe, expect, it } from "vitest";
import { formatMoney } from "@/lib/format";
import { parseAmount } from "@/lib/forms";
import { strFromU8, unzipSync } from "fflate";
import { buildXlsx } from "@/lib/xlsx";

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

  it("builds an Excel workbook with dates, amounts and bold totals", () => {
    const files = unzipSync(
      buildXlsx([
        {
          name: "Par jour: <test>",
          columns: [{ header: "Date", type: "date" }, { header: "Recettes", type: "money" }, { header: "Note" }],
          rows: [
            ["2026-10-28", 12500, "Riz & savon"],
            ["Total", 12500, null],
          ],
        },
      ]),
    );
    expect(Object.keys(files)).toContain("xl/worksheets/sheet1.xml");
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain('<c r="A2" s="3"><v>46323</v></c>'); // 28/10/2026 as an Excel date
    expect(sheet).toContain('<c r="B2" s="2"><v>12500</v></c>');
    expect(sheet).toContain("Riz &amp; savon");
    expect(sheet).toContain('<c r="B3" s="5"><v>12500</v></c>'); // total row in bold
    expect(strFromU8(files["xl/workbook.xml"])).toContain('name="Par jour  &lt;test&gt;"');
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
