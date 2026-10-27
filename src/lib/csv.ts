/** CSV for French Excel: ";" separator, decimal comma, UTF-8 BOM so accents survive. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v == null) return "";
    if (typeof v === "number") return String(Math.round(v * 1000) / 1000).replace(".", ",");
    return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
