import { requireOwner } from "@/lib/auth/dal";
import { paymentLabel } from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import { listExpenses } from "@/lib/data/expenses";
import { listSales } from "@/lib/data/sales";
import { firstActivity, monthlySummary, productStats } from "@/lib/data/stats";
import { getDb } from "@/lib/db";
import { eachMonth, formatMonthLong, today } from "@/lib/dates";
import { resolvePeriod } from "@/lib/period";

const TYPES = ["ventes", "depenses", "mensuel", "produits"] as const;
type ExportType = (typeof TYPES)[number];

export async function GET(request: Request) {
  const user = await requireOwner();
  const url = new URL(request.url);
  const type = (TYPES as readonly string[]).includes(url.searchParams.get("type") ?? "")
    ? (url.searchParams.get("type") as ExportType)
    : "ventes";
  const db = await getDb();
  const shopId = user.shop.id;
  const t = today(user.shop.timezone);
  const since = await firstActivity(db, shopId);
  const { range } = resolvePeriod(Object.fromEntries(url.searchParams), t, since, "annee");

  let csv: string;
  if (type === "ventes") {
    const rows = await listSales(db, shopId, range);
    csv = toCsv(
      ["Date", "Produit", "Quantité", "Prix unitaire", "Total", "Prix d'achat unitaire", "Paiement", "Vendeur"],
      rows.map((r) => [r.date, r.productName, r.quantity, r.unitPrice, r.total, r.unitCost, paymentLabel(r.paymentMethod), r.seller]),
    );
  } else if (type === "depenses") {
    const rows = await listExpenses(db, shopId, range);
    csv = toCsv(
      ["Date", "Catégorie", "Description", "Montant"],
      [...rows].reverse().map((r) => [r.date, r.category, r.description, r.amount]),
    );
  } else if (type === "produits") {
    const rows = await productStats(db, shopId, range);
    csv = toCsv(
      ["Produit", "Quantité vendue", "Chiffre d'affaires", "Coût d'achat", "Marge"],
      rows.map((r) => [r.name, r.quantity, r.revenue, r.cost, r.margin]),
    );
  } else {
    const { revenue, expenses } = await monthlySummary(db, shopId, range);
    const rev = new Map(revenue.map((r) => [r.month, r]));
    const exp = new Map(expenses.map((e) => [e.month, e.expenses]));
    csv = toCsv(
      ["Mois", "Chiffre d'affaires", "Dépenses", "Bénéfice", "Articles vendus"],
      eachMonth(range).map((m) => {
        const r = rev.get(m)?.revenue ?? 0;
        const e = exp.get(m) ?? 0;
        return [formatMonthLong(m), r, e, r - e, rev.get(m)?.items ?? 0];
      }),
    );
  }

  const filename = `youba-${type}-${range.from}_${range.to}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
