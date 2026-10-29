import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Connection = {
  db: DB;
  kind: "postgres" | "pglite";
  close: () => Promise<void>;
};

const migrationsFolder = path.join(process.cwd(), "drizzle");

/**
 * Connects to PostgreSQL when DATABASE_URL is set (production: Neon, Supabase…),
 * otherwise to an embedded PGlite database stored on disk (local development).
 * Pass `dataDir: "memory://"` for a throwaway in-memory database (tests).
 */
export async function connect(options: { dataDir?: string } = {}): Promise<Connection> {
  const url = process.env.DATABASE_URL;
  if (url && !options.dataDir) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    // prepare:false keeps us compatible with transaction poolers (Neon, Supabase).
    const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
    return {
      db: drizzle(client, { schema }) as unknown as DB,
      kind: "postgres",
      close: () => client.end(),
    };
  }

  if (process.env.NETLIFY || process.env.VERCEL) {
    throw new Error("DATABASE_URL manquant : ajoutez la chaîne de connexion PostgreSQL dans les variables d'environnement de l'hébergeur.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = options.dataDir ?? process.env.PGLITE_DIR ?? ".data/pglite";
  if (!dataDir.includes("://")) mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  return {
    db: drizzle(client, { schema }) as unknown as DB,
    kind: "pglite",
    close: () => client.close(),
  };
}

export async function runMigrations(conn: Connection) {
  if (conn.kind === "postgres") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(conn.db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    try {
      await migrate(conn.db as never, { migrationsFolder });
    } catch (error) {
      const cause = (error as { cause?: unknown })?.cause ?? error;
      // errno 51 = ENOSPC: the computer's disk is full.
      if ((cause as { errno?: unknown })?.errno === 51) {
        throw new Error(
          "Le disque de cet ordinateur est plein : la base locale (.data) ne peut pas s'enregistrer. " +
            "Libérez de la place (Corbeille, Téléchargements, dossier .next), puis relancez npm run db:seed.",
          { cause: error },
        );
      }
      // The embedded database can be left unreadable if the program was killed while writing.
      if (/Aborted\(\)/.test(String(cause))) {
        throw new Error(
          "La base locale (.data/pglite) ne s'ouvre plus, sans doute après un arrêt brutal. " +
            "Arrêtez le serveur, supprimez le dossier .data (rm -rf .data) puis relancez npm run db:seed.",
          { cause: error },
        );
      }
      throw error;
    }
  }
}
