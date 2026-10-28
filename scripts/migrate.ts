import { connect, runMigrations } from "../src/lib/db/client";

async function main() {
  const conn = await connect();
  console.log(`Migration de la base (${conn.kind})…`);
  try {
    await runMigrations(conn);
  } catch (error) {
    if (/already exists/i.test(String((error as { cause?: unknown })?.cause ?? error))) {
      console.error(
        "\nLa base contient déjà des tables d'une autre version de l'application.\n" +
          "Videz-la avant de redéployer (README, section « Base déjà utilisée par l'ancienne version »).\n",
      );
    }
    throw error;
  }
  await conn.close();
  console.log("Base de données à jour.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
