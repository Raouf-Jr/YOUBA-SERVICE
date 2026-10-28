/** Parses amounts typed the French way: "12 500", "12500,50", "1.250,5". */
export function parseAmount(value: FormDataEntryValue | null | undefined): number | null {
  if (value == null) return null;
  let s = String(value).trim().replace(/[\s\u00a0\u202f]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  if (!/^-?\d*\.?\d+$/.test(s)) return Number.NaN;
  return Number(s);
}
