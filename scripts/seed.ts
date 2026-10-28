/**
 * Prepares the local database with just the account (youba / youba1234): no products.
 *   npm run db:seed
 * Demo products with ~3 months of days, if ever needed again:
 *   npm run db:seed -- --demo            (refuses if products already exist)
 *   npm run db:seed -- --demo --reset    (erases all products and days first)
 */
import { count } from "drizzle-orm";
import { ensureFirstUser } from "../src/lib/data/users";
import { saveDay } from "../src/lib/data/entries";
import { createProduct } from "../src/lib/data/products";
import { connect, runMigrations } from "../src/lib/db/client";
import { generalExpenses, products } from "../src/lib/db/schema";
import { addDays, today } from "../src/lib/dates";
import type { Product } from "../src/lib/db/schema";

const DAYS = 90;

// Deterministic randomness so the demo looks the same everywhere.
let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
const around = (base: number, spread = 0.35) => Math.round((base * (1 - spread + rand() * spread * 2)) / 50) * 50;

async function main() {
  const demo = process.argv.includes("--demo");
  const reset = process.argv.includes("--reset");
  const conn = await connect();
  await runMigrations(conn);
  const { db } = conn;
  await ensureFirstUser(db, { ...process.env, NODE_ENV: "development" });
  const [{ total }] = await db.select({ total: count() }).from(products);
  if (!demo) {
    console.log(total > 0 ? `Base prête (${total} produit${total > 1 ? "s" : ""} déjà enregistré${total > 1 ? "s" : ""}).` : "Base prête, sans produit.");
    console.log("Connexion : youba / youba1234");
    await conn.close();
    return;
  }

  if (total > 0 && !reset) {
    console.log("La base contient déjà des produits : rien n'a été modifié.");
    console.log("Pour tout effacer et recréer la démo : npm run db:seed -- --demo --reset");
    await conn.close();
    return;
  }
  if (reset) {
    await db.delete(products);
    await db.delete(generalExpenses);
  }

  const t = today("Africa/Lome");
  const start = addDays(t, -(DAYS - 1));

  const catalog = [
    { name: "Boissons", investment: 350_000, revenue: 38_000, expense: 24_000, closed: 0.05 },
    { name: "Riz et céréales", investment: 600_000, revenue: 55_000, expense: 41_000, closed: 0.1 },
    { name: "Crédit et Mobile Money", investment: 150_000, revenue: 20_000, expense: 15_500, closed: 0.02 },
    { name: "Savons et cosmétiques", investment: 200_000, revenue: 14_000, expense: 8_000, closed: 0.25 },
  ];

  const created: Product[] = [];
  for (const [i, p] of catalog.entries()) {
    created.push(
      await createProduct(db, {
        name: p.name,
        investment: p.investment,
        // The second product was followed by hand before: its profit so far is carried over.
        openingDate: i === 1 ? addDays(start, -1) : null,
        openingProfit: i === 1 ? 510_000 : 0,
      }),
    );
  }

  for (let d = 0; d < DAYS; d++) {
    const date = addDays(start, d);
    const sunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
    const lines = catalog.flatMap((p, i) => {
      if (sunday && rand() < 0.7) return [];
      if (rand() < p.closed) return [];
      const growth = 0.85 + (d / DAYS) * 0.3;
      return [
        {
          productId: created[i].id,
          revenue: around(p.revenue * growth),
          expense: rand() < 0.08 ? around(p.expense * 1.8) : around(p.expense * growth),
          note: null,
        },
      ];
    });
    await saveDay(db, date, lines);
    // Rent, paid from the overall profit on the 1st of each month.
    if (date.endsWith("-01")) await db.insert(generalExpenses).values({ date, amount: 60_000, label: "Loyer de la boutique" });
  }

  console.log(`Démo créée : ${catalog.length} produits, ${DAYS} jours (${start} → ${t}).`);
  console.log("Connexion : youba / youba1234");
  await conn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
