/**
 * Emergency password reset, for the site administrator (no e-mail needed).
 *   npm run user:reset-password -- adresse@exemple.com NouveauMotDePasse
 * In production, run it with DATABASE_URL set to the production database.
 */
import { eq } from "drizzle-orm";
import { connect, runMigrations } from "../src/lib/db/client";
import { findUserByEmail, setPassword } from "../src/lib/data/account";
import { sessions } from "../src/lib/db/schema";

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("Usage : npm run user:reset-password -- <email> <nouveau-mot-de-passe>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Le mot de passe doit faire au moins 8 caractères.");
    process.exit(1);
  }
  const conn = await connect();
  await runMigrations(conn);
  const user = await findUserByEmail(conn.db, email);
  if (!user) {
    console.error(`Aucun compte pour ${email}.`);
    await conn.close();
    process.exit(1);
  }
  await setPassword(conn.db, user.id, password);
  await conn.db.delete(sessions).where(eq(sessions.userId, user.id));
  console.log(`Mot de passe modifié pour ${user.name} (${user.email}). Ses sessions ouvertes ont été fermées.`);
  await conn.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
