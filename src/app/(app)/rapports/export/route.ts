import { getCurrentUser } from "@/lib/auth/dal";
import { entriesInRange } from "@/lib/data/entries";
import { listGeneralExpenses } from "@/lib/data/general-expenses";
import { listProducts } from "@/lib/data/products";
import { dailyTotals, firstDate, productTotals, sumTotals } from "@/lib/data/reports";
import { getDb } from "@/lib/db";
import { formatDate, formatRange, today } from "@/lib/dates";
import { currencySymbol } from "@/lib/format";
import { resolvePeriod } from "@/lib/period";
import { buildXlsx, type Sheet } from "@/lib/xlsx";

/** The report of a period as an Excel file: summary, per product, per day and every line. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/connexion", request.url), 303);

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const db = await getDb();
  const todayISO = today(user.shop.timezone);
  const [since, products] = await Promise.all([firstDate(db), listProducts(db, { includeArchived: true })]);
  const { range } = resolvePeriod(params, todayISO, since, "mois");
  const product = products.find((p) => p.id === params.produit);

  const [totals, daily, lines, spent] = await Promise.all([
    productTotals(db, range, product?.id),
    dailyTotals(db, range, product?.id),
    entriesInRange(db, range, product?.id),
    product ? Promise.resolve([]) : listGeneralExpenses(db, range),
  ]);
  const rows = totals.filter((t) => t.revenue || t.expense).sort((a, b) => b.profit - a.profit);
  const sum = sumTotals(rows);
  const spentTotal = spent.reduce((t, g) => t + g.amount, 0);

  const sheets: Sheet[] = [
    {
      name: "Résumé",
      columns: [
        { header: user.shop.shopName, width: 34 },
        { header: "", type: "money", width: 30 },
      ],
      rows: [
        ["Période", formatRange(range)],
        ["Produit", product?.name ?? "Tous les produits"],
        ["Monnaie", currencySymbol(user.shop.currency)],
        [],
        ["Recettes (argent rentré)", sum.revenue],
        ["Dépenses des produits (argent sorti)", sum.expense],
        ["Total bénéfice des produits", sum.profit],
        ...(product
          ? []
          : [["Dépenses sur le bénéfice (loyer, maison…)", spentTotal], ["Total : ce qui reste", sum.profit - spentTotal]]),
        [],
        ["Fichier créé le", formatDate(todayISO)],
      ],
    },
    {
      name: "Par produit",
      columns: [
        { header: "Produit", width: 30 },
        { header: "Investissement de départ", type: "money", width: 24 },
        { header: "Recettes", type: "money", width: 16 },
        { header: "Dépenses", type: "money", width: 16 },
        { header: "Bénéfice", type: "money", width: 16 },
        { header: "Jours notés", type: "number", width: 13 },
      ],
      rows: [
        ...rows.map((r) => [
          r.name,
          r.investment,
          r.revenue,
          r.expense,
          r.profit,
          r.days,
        ]),
        ["Total", null, sum.revenue, sum.expense, sum.profit],
      ],
    },
    {
      name: "Par jour",
      columns: [
        { header: "Date", type: "date", width: 13 },
        { header: "Recettes", type: "money", width: 16 },
        { header: "Dépenses", type: "money", width: 16 },
        { header: "Bénéfice", type: "money", width: 16 },
      ],
      rows: [
        ...daily.map((d) => [d.date, d.revenue, d.expense, d.revenue - d.expense]),
        [
          "Total des jours",
          daily.reduce((s, d) => s + d.revenue, 0),
          daily.reduce((s, d) => s + d.expense, 0),
          daily.reduce((s, d) => s + d.revenue - d.expense, 0),
        ],
      ],
    },
    {
      name: "Détail",
      columns: [
        { header: "Date", type: "date", width: 13 },
        { header: "Produit", width: 28 },
        { header: "Recette", type: "money", width: 16 },
        { header: "Dépense", type: "money", width: 16 },
        { header: "Bénéfice", type: "money", width: 16 },
      ],
      rows: lines.map((l) => [l.date, l.product, l.revenue, l.expense, l.revenue - l.expense]),
    },
    ...(product
      ? []
      : [
          {
            name: "Dépenses sur le bénéfice",
            columns: [
              { header: "Date", type: "date", width: 13 },
              { header: "Motif", width: 34 },
              { header: "Montant", type: "money", width: 16 },
            ],
            rows: [...[...spent].reverse().map((g) => [g.date, g.label, g.amount]), ["Total", null, spentTotal]],
          } satisfies Sheet,
        ]),
  ];

  const slug = user.shop.shopName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `${slug || "boutique"}-rapport-${range.from}-au-${range.to}.xlsx`;
  return new Response(new Blob([buildXlsx(sheets) as BlobPart]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
