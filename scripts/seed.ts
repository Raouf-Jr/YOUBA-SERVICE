/**
 * Fills the database with a demo shop and ~4 months of realistic activity.
 *   npm run db:seed
 * Login: demo@youba.app / demo1234
 */
import { eq } from "drizzle-orm";
import { connect, runMigrations } from "../src/lib/db/client";
import { shops, users } from "../src/lib/db/schema";
import { createShopWithOwner } from "../src/lib/data/account";
import { addExpense, addInvestment } from "../src/lib/data/expenses";
import { createProduct, restockProduct } from "../src/lib/data/products";
import { recordSales } from "../src/lib/data/sales";
import { addDays, startOfMonth, today } from "../src/lib/dates";

const EMAIL = "demo@youba.app";
const DAYS = 120;

// Deterministic randomness so the demo looks the same on every machine.
let seed = 42;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));

const CATALOG = [
  { name: "Riz parfumé 25 kg", category: "Alimentation", salePrice: 18500, costPrice: 14720, unit: "sac", stock: 40, low: 8, pop: 1.2 },
  { name: "Huile végétale 5 L", category: "Alimentation", salePrice: 6500, costPrice: 4970, unit: "pièce", stock: 60, low: 10, pop: 1.6 },
  { name: "Sucre en poudre 1 kg", category: "Alimentation", salePrice: 800, costPrice: 600, unit: "kg", stock: 150, low: 30, pop: 4 },
  { name: "Lait en poudre 400 g", category: "Alimentation", salePrice: 2500, costPrice: 1840, unit: "pièce", stock: 70, low: 15, pop: 2 },
  { name: "Pâtes alimentaires 500 g", category: "Alimentation", salePrice: 450, costPrice: 320, unit: "paquet", stock: 200, low: 40, pop: 5 },
  { name: "Concentré de tomate", category: "Alimentation", salePrice: 300, costPrice: 200, unit: "pièce", stock: 240, low: 50, pop: 6 },
  { name: "Eau minérale (pack 6)", category: "Boissons", salePrice: 2000, costPrice: 1380, unit: "pack", stock: 50, low: 12, pop: 2.4 },
  { name: "Thé vert 200 g", category: "Boissons", salePrice: 1200, costPrice: 780, unit: "paquet", stock: 6, low: 10, pop: 1.8 },
  { name: "Savon de Marseille", category: "Hygiène", salePrice: 500, costPrice: 320, unit: "pièce", stock: 120, low: 25, pop: 3 },
  { name: "Lessive 1 kg", category: "Hygiène", salePrice: 1500, costPrice: 1010, unit: "paquet", stock: 0, low: 10, pop: 1.5 },
  { name: "Crédit téléphonique", category: "Services", salePrice: 1000, costPrice: 870, unit: "pièce", stock: 0, low: null, pop: 3.5, noStock: true },
  { name: "Biscuits assortis", category: "Alimentation", salePrice: 250, costPrice: 160, unit: "paquet", stock: 180, low: 30, pop: 5 },
];

async function main() {
  const conn = await connect();
  await runMigrations(conn);
  const { db } = conn;

  const [existing] = await db.select().from(users).where(eq(users.email, EMAIL));
  if (existing) {
    await db.delete(shops).where(eq(shops.id, existing.shopId));
    console.log("Ancienne boutique de démonstration supprimée.");
  }

  const t = today("Africa/Abidjan");
  const start = addDays(t, -(DAYS - 1));
  const { shop, user } = await createShopWithOwner(db, {
    shopName: "Boutique Youba — Démo",
    name: "Youba Diallo",
    email: EMAIL,
    password: "demo1234",
    currency: "XOF",
    timezone: "Africa/Abidjan",
  });
  await db.update(shops).set({ monthlyGoal: 1_500_000 }).where(eq(shops.id, shop.id));

  const products = [];
  for (const p of CATALOG) {
    const product = await createProduct(
      db,
      shop.id,
      {
        name: p.name,
        category: p.category,
        salePrice: p.salePrice,
        costPrice: p.costPrice,
        unit: p.unit,
        trackStock: !p.noStock,
        lowStockThreshold: p.low,
        initialStock: p.noStock ? 0 : p.stock + 400,
      },
      start,
    );
    products.push({ ...p, id: product.id });
  }

  await addInvestment(db, shop.id, { date: addDays(start, -20), label: "Étagères et comptoir", category: "Équipement", amount: 450_000 });
  await addInvestment(db, shop.id, { date: addDays(start, -18), label: "Peinture et enseigne", category: "Aménagement", amount: 250_000 });
  await addInvestment(db, shop.id, { date: addDays(start, -10), label: "Premier stock de marchandises", category: "Stock de départ", amount: 600_000 });
  await addInvestment(db, shop.id, { date: addDays(start, -5), label: "Réfrigérateur", category: "Équipement", amount: 180_000 });

  const soldSinceRestock = new Map<string, number>();

  for (let d = 0; d < DAYS; d++) {
    const date = addDays(start, d);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (weekday === 0 && rand() < 0.6) continue; // often closed on Sunday
    const growth = 0.75 + (d / DAYS) * 0.5;
    const weekend = weekday === 6 ? 1.35 : weekday === 5 ? 1.15 : 1;

    for (const method of ["especes", "mobile_money"] as const) {
      const share = method === "especes" ? 0.65 : 0.35;
      const lines = products
        .map((p) => ({
          productId: p.id,
          quantity: Math.max(0, Math.round(p.pop * growth * weekend * share * (0.4 + rand() * 1.2))),
          unitPrice: p.salePrice,
        }))
        .filter((l) => l.quantity > 0);
      await recordSales(db, shop.id, { date, paymentMethod: method, userId: user.id, lines });
      for (const l of lines) soldSinceRestock.set(l.productId, (soldSinceRestock.get(l.productId) ?? 0) + l.quantity);
    }

    if (date.endsWith("-01") || d === 0) {
      await addExpense(db, shop.id, user.id, { date, category: "Loyer", amount: 65_000, description: "Loyer du local" });
      await addExpense(db, shop.id, user.id, { date, category: "Salaires", amount: 50_000, description: "Salaire vendeur" });
    }
    if (date.endsWith("-05")) {
      await addExpense(db, shop.id, user.id, { date, category: "Électricité & eau", amount: between(18_000, 26_000), description: "Facture CIE / SODECI" });
    }
    if (weekday === 1) {
      // Weekly trip to the wholesaler: buy back what was sold, recorded as an expense.
      await addExpense(db, shop.id, user.id, { date, category: "Transport", amount: between(4_000, 9_000), description: "Transport marchandises" });
      for (const p of products) {
        const sold = soldSinceRestock.get(p.id) ?? 0;
        if (sold === 0) continue;
        if (p.noStock) {
          await addExpense(db, shop.id, user.id, { date, category: "Achat de marchandises", amount: sold * p.costPrice, description: `Recharge ${p.name}` });
        } else {
          await restockProduct(db, shop.id, {
            productId: p.id,
            date,
            quantity: sold,
            unitCost: p.costPrice,
            recordExpense: true,
            note: "Grossiste",
            userId: user.id,
          });
        }
        soldSinceRestock.set(p.id, 0);
      }
    }
    if (weekday === 3 && rand() < 0.5) {
      await addExpense(db, shop.id, user.id, { date, category: "Communication", amount: between(2_000, 5_000), description: "Forfait internet" });
    }
    if (rand() < 0.04) {
      await addExpense(db, shop.id, user.id, { date, category: "Entretien & réparations", amount: between(5_000, 20_000), description: "Réparation" });
    }
  }

  // Keep a couple of products low so the stock alerts show up.
  const { products: productsTable } = await import("../src/lib/db/schema");
  for (const p of products.filter((p) => !p.noStock)) {
    await db.update(productsTable).set({ stock: p.stock }).where(eq(productsTable.id, p.id));
  }

  console.log(`Boutique de démonstration créée (${startOfMonth(start)} → ${t}).`);
  console.log(`Connexion : ${EMAIL} / demo1234`);
  await conn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
