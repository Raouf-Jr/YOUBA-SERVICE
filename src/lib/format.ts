const moneyFormatters = new Map<string, Intl.NumberFormat>();
const compactFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string) {
  let f = moneyFormatters.get(currency);
  if (!f) {
    try {
      f = new Intl.NumberFormat("fr-FR", { style: "currency", currency });
    } catch {
      f = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
    }
    moneyFormatters.set(currency, f);
  }
  return f;
}

/** 125000 → "125 000 F CFA" (XOF), 12.5 → "12,50 €" (EUR). */
export function formatMoney(value: number, currency: string): string {
  return moneyFormatter(currency).format(value || 0).replace(/ /g, " ");
}

/** Short form for axes and tight spaces: 1250000 → "1,3 M". */
export function formatCompact(value: number): string {
  let f = compactFormatters.get("fr");
  if (!f) {
    f = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
    compactFormatters.set("fr", f);
  }
  return f.format(value || 0).replace(/ /g, " ");
}

const numberFmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

export function formatNumber(value: number): string {
  return numberFmt.format(value || 0).replace(/ /g, " ");
}

const percentFmt = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });

export function formatPercent(ratio: number): string {
  return percentFmt.format(ratio || 0).replace(/ /g, " ");
}

/** Relative change between two values; null when there is no basis for comparison. */
export function change(current: number, previous: number): number | null {
  if (!previous) return null;
  return (current - previous) / Math.abs(previous);
}

/** Currency symbol as rendered by Intl, e.g. "F CFA", "€". */
export function currencySymbol(currency: string): string {
  const parts = moneyFormatter(currency).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}
