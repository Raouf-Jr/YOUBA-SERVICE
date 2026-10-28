/**
 * Empties the shop: products, their days and the money taken from the profit.
 * The account and the shop settings stay.
 *   npm run db:clear -- --oui
 * In production, run it with DATABASE_URL set to the production database.
 */
import { connect, runMigrations } from "../src/lib/db/client";
import { generalExpenses, products } from "../src/lib/db/schema";

async function main() {
  if (!process.argv.includes("--oui")) {
    console.error("Cette commande efface tous les produits et tous les chiffres (le compte reste).");
    console.error("Pour confirmer : npm run db:clear -- --oui");
    process.exit(1);
  }
  const conn = await connect();
  await runMigrations(conn);
  const removed = await conn.db.delete(products).returning({ id: products.id });
  await conn.db.delete(generalExpenses);
  console.log(`${removed.length} produit(s) effacé(s), avec leurs chiffres. Le compte est conservé.`);
  await conn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
