import { connect, runMigrations } from "../src/lib/db/client";

async function main() {
  const conn = await connect();
  console.log(`Migration de la base (${conn.kind})…`);
  await runMigrations(conn);
  await conn.close();
  console.log("Base de données à jour.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
