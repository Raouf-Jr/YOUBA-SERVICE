export const EXPENSE_CATEGORIES = [
  "Achat de marchandises",
  "Loyer",
  "Électricité & eau",
  "Salaires",
  "Transport",
  "Communication",
  "Taxes & impôts",
  "Entretien & réparations",
  "Publicité",
  "Autre",
] as const;

export const RESTOCK_EXPENSE_CATEGORY = "Achat de marchandises";

export const INVESTMENT_CATEGORIES = [
  "Équipement",
  "Aménagement",
  "Stock de départ",
  "Informatique",
  "Véhicule",
  "Autre",
] as const;

export const PAYMENT_METHODS = [
  { value: "especes", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "carte", label: "Carte bancaire" },
  { value: "autre", label: "Autre" },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"];

export function paymentLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;
}

export const UNITS = ["pièce", "kg", "g", "litre", "carton", "paquet", "sac", "lot", "mètre", "service"] as const;

export const CURRENCIES = [
  { value: "XOF", label: "Franc CFA (BCEAO) — F CFA" },
  { value: "XAF", label: "Franc CFA (BEAC) — FCFA" },
  { value: "GNF", label: "Franc guinéen — FG" },
  { value: "MAD", label: "Dirham marocain — MAD" },
  { value: "DZD", label: "Dinar algérien — DA" },
  { value: "TND", label: "Dinar tunisien — DT" },
  { value: "CDF", label: "Franc congolais — FC" },
  { value: "MGA", label: "Ariary — Ar" },
  { value: "HTG", label: "Gourde — G" },
  { value: "EUR", label: "Euro — €" },
  { value: "USD", label: "Dollar américain — $" },
  { value: "CAD", label: "Dollar canadien — $ CA" },
  { value: "CHF", label: "Franc suisse — CHF" },
] as const;

export const TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Dakar",
  "Africa/Bamako",
  "Africa/Ouagadougou",
  "Africa/Conakry",
  "Africa/Lome",
  "Africa/Niamey",
  "Africa/Porto-Novo",
  "Africa/Douala",
  "Africa/Libreville",
  "Africa/Kinshasa",
  "Africa/Lubumbashi",
  "Africa/Brazzaville",
  "Africa/Ndjamena",
  "Africa/Casablanca",
  "Africa/Algiers",
  "Africa/Tunis",
  "Indian/Antananarivo",
  "America/Port-au-Prince",
  "America/Montreal",
  "Europe/Paris",
  "Europe/Brussels",
  "Europe/Zurich",
  "UTC",
] as const;
