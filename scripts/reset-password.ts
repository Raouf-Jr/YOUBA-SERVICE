/**
 * Sets a new password without signing in (forgotten password), or creates the account if needed.
 *   npm run user:reset-password -- youba NouveauMotDePasse
 * In production, run it with DATABASE_URL set to the production database.
 */
import { connect, runMigrations } from "../src/lib/db/client";
import { createUser, findUserByUsername, setPassword, signOutEverywhere } from "../src/lib/data/users";

async function main() {
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error("Usage : npm run user:reset-password -- <identifiant> <nouveau-mot-de-passe>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }
  const conn = await connect();
  await runMigrations(conn);
  const user = await findUserByUsername(conn.db, username);
  if (user) {
    await setPassword(conn.db, user.id, password);
    await signOutEverywhere(conn.db, user.id);
    console.log(`Mot de passe modifié pour « ${user.username} ». Ses sessions ouvertes ont été fermées.`);
  } else {
    const created = await createUser(conn.db, { username, password });
    console.log(`Compte « ${created.username} » créé.`);
  }
  await conn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
